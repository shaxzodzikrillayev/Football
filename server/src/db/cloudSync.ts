import type { DatabaseSync } from 'node:sqlite';

/**
 * Облачная синхронизация базы для хостингов без постоянного диска (Vercel и т.п.).
 *
 * На Vercel файловая система read-only, поэтому обычный SQLite-файл жить не может.
 * Вместо этого база работает в памяти, а после каждого изменения entire-снимок
 * всех таблиц кладётся в Upstash Redis (подключается во вкладке Storage в Vercel,
 * бесплатный план). При старте сервера снимок загружается обратно — данные
 * переживают перезапуски, редеплои и «засыпание» функций.
 *
 * Локально, без переменных UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN,
 * модуль неактивен и всё работает с обычным файлом базы.
 */

const SNAPSHOT_KEY = 'titan:site:snapshot';

interface CloudConfig {
  enabled: boolean;
  restUrl: string;
  token: string;
}

function readCloudConfig(): CloudConfig {
  const restUrl = (
    process.env.UPSTASH_REDIS_REST_URL ??
    process.env.KV_REST_API_URL ??
    ''
  )
    .trim()
    .replace(/\/+$/, '');
  const token = (
    process.env.UPSTASH_REDIS_REST_TOKEN ??
    process.env.KV_REST_API_TOKEN ??
    ''
  ).trim();
  return { enabled: Boolean(restUrl && token), restUrl, token };
}

export const cloudDb = readCloudConfig();

type SqlValue = string | number | null;

interface TableSnapshot {
  columns: string[];
  rows: SqlValue[][];
}

interface Snapshot {
  version: number;
  savedAt: string;
  tables: Record<string, TableSnapshot>;
}

/* ------------------------------- REST-клиент ------------------------------- */

async function redisGet(): Promise<string | null> {
  const response = await fetch(`${cloudDb.restUrl}/get/${SNAPSHOT_KEY}`, {
    headers: { authorization: `Bearer ${cloudDb.token}` },
  });
  if (!response.ok) throw new Error(`Upstash GET вернул ${response.status}`);
  const data = (await response.json()) as { result: string | null };
  return data.result;
}

async function redisSet(value: string): Promise<void> {
  const response = await fetch(`${cloudDb.restUrl}/set/${SNAPSHOT_KEY}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${cloudDb.token}`,
      'content-type': 'text/plain',
    },
    body: value,
  });
  if (!response.ok) throw new Error(`Upstash SET вернул ${response.status}`);
}

/* --------------------------------- Снимок --------------------------------- */

function listTables(db: DatabaseSync): string[] {
  const rows = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
    .all() as unknown as { name: string }[];
  return rows.map((row) => row.name);
}

function buildSnapshot(db: DatabaseSync): string {
  const tables: Record<string, TableSnapshot> = {};

  for (const name of listTables(db)) {
    const info = db.prepare(`PRAGMA table_info(${name})`).all() as unknown as {
      name: string;
    }[];
    const columns = info.map((column) => column.name);
    const rows = db.prepare(`SELECT * FROM ${name}`).all() as unknown as Record<
      string,
      SqlValue
    >[];
    tables[name] = {
      columns,
      rows: rows.map((row) => columns.map((column) => row[column] ?? null)),
    };
  }

  const snapshot: Snapshot = { version: 1, savedAt: new Date().toISOString(), tables };
  return JSON.stringify(snapshot);
}

/** Загружает снимок из облака в память. true — если данные были восстановлены. */
function hydrateFromCloud(db: DatabaseSync, raw: string | null): boolean {
  if (!raw) return false;

  let snapshot: Snapshot;
  try {
    snapshot = JSON.parse(raw) as Snapshot;
  } catch {
    console.warn('[cloud] снимок в облаке повреждён — начинаем с пустой базы');
    return false;
  }

  for (const [name, table] of Object.entries(snapshot.tables ?? {})) {
    const exists = db
      .prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(name) as { count: number };
    if (!exists.count) continue; // таблица из старой версии — пропускаем

    db.exec(`DELETE FROM ${name}`);
    if (!table.rows?.length) continue;

    const placeholders = table.columns.map(() => '?').join(', ');
    const stmt = db.prepare(
      `INSERT INTO ${name} (${table.columns.join(', ')}) VALUES (${placeholders})`,
    );
    for (const row of table.rows) {
      stmt.run(...row);
    }
  }

  return true;
}

/* ------------------------- Отложенная запись снимка ------------------------- */

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let dirty = false;
/** true, пока идёт гидратация из облака — её DELETE/INSERT не должны помечать базу «грязной». */
let hydrating = false;
/** Сериализует параллельные записи снимка (вызовы выстраиваются в цепочку). */
let saveChain: Promise<void> = Promise.resolve();

/**
 * Гарантированно записывает накопленные изменения в облако (дожидается
 * предыдущих записей). Если менять нечего — возвращает сразу без сети.
 */
function flushNow(db: DatabaseSync): Promise<void> {
  saveChain = saveChain.then(async () => {
    if (!dirty) return;
    dirty = false;
    try {
      await redisSet(buildSnapshot(db));
    } catch (error) {
      dirty = true;
      console.error('[cloud] не удалось сохранить снимок базы:', error);
    }
  });
  return saveChain;
}

/** Публичный алиас: запись снимка в облако перед отправкой ответа на мутацию. */
export function syncToCloud(db: DatabaseSync): Promise<void> {
  return flushNow(db);
}

function scheduleSave(db: DatabaseSync): void {
  if (hydrating) return;
  dirty = true;
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void flushNow(db);
  }, 400);
  saveTimer.unref?.();
}

/* --------------------------- Обновление из облака --------------------------- */

/**
 * Перед запросом подтягивает свежий снимок из облака.
 *
 * На Vercel один и тот же сайт обслуживают несколько независимых «копий»
 * сервера: сессия, созданная во время логина на копии A, не видна копии B —
 * отсюда 401 и выбрасывание из админки. Чтение снимка перед каждым запросом
 * делает все копии согласованными (1 бесплатный GET на запрос).
 */
export async function refreshFromCloud(db: DatabaseSync): Promise<void> {
  if (!cloudDb.enabled) return;

  // Сначала дописываем локальные изменения, чтобы не потерять их гидратацией.
  if (dirty) await flushNow(db);

  const raw = await redisGet().catch((error: unknown) => {
    console.error('[cloud] не удалось обновить снимок из Upstash:', error);
    return null;
  });
  if (!raw) return;

  hydrating = true;
  try {
    hydrateFromCloud(db, raw);
  } finally {
    hydrating = false;
  }
}

/* --------------------------------- Установка -------------------------------- */

/**
 * Включает облачный режим: восстанавливает данные из снимка и подписывает
 * все изменения на запись нового снимка. Вызывается после миграций.
 */
export async function installCloudSync(db: DatabaseSync): Promise<void> {
  const raw = await redisGet().catch((error: unknown) => {
    console.error('[cloud] не удалось прочитать снимок из Upstash:', error);
    return null;
  });

  const restored = hydrateFromCloud(db, raw);
  console.log(
    restored
      ? '[cloud] база восстановлена из Upstash Redis — данные постоянные'
      : '[cloud] снимок не найден — создаём базу заново и включаем синхронизацию',
  );

  const originalPrepare = db.prepare.bind(db);
  db.prepare = ((sql: string) => {
    const stmt = originalPrepare(sql);
    const originalRun = stmt.run.bind(stmt);
    (stmt as { run: typeof originalRun }).run = (...args: unknown[]) => {
      const result = originalRun(...(args as Parameters<typeof originalRun>));
      scheduleSave(db);
      return result;
    };
    return stmt;
  }) as typeof db.prepare;

  const originalExec = db.exec.bind(db);
  db.exec = ((sql: string) => {
    originalExec(sql);
    if (/^\s*(insert|update|delete|replace|create|drop|alter|commit)/i.test(sql)) {
      scheduleSave(db);
    }
  }) as typeof db.exec;

  // Последний шанс записать «грязные» изменения перед заморозкой функции.
  process.on('beforeExit', () => {
    if (dirty) void flushNow(db);
  });
}
