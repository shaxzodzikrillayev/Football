import { db, nowIso, lastInsertId, transaction } from '../db/index.js';
import { DEFAULT_SETTINGS } from '../../../shared/constants.js';
import { DEFAULT_CLUB_VALUES, isValueIcon } from '../../../shared/values.js';
import { POSITIONS } from '../../../shared/positions.js';
import { FORMATION_CODES, formationSlots } from '../../../shared/formations.js';
import type {
  ClubStats,
  ClubValue,
  Coach,
  FormationCode,
  LineupEntry,
  MatchItem,
  MatchStatus,
  Player,
  PlayerRole,
  PositionCode,
  SitePayload,
  SiteSettings,
} from '../../../shared/types.js';

/* --------------------------------- Настройки --------------------------------- */

const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof SiteSettings)[];

export function getSettings(): SiteSettings {
  const rows = db.prepare('SELECT key, value FROM settings').all() as {
    key: string;
    value: string;
  }[];
  const stored = new Map<string, unknown>();
  for (const row of rows) {
    try {
      stored.set(row.key, JSON.parse(row.value));
    } catch {
      stored.set(row.key, row.value);
    }
  }

  const result = { ...DEFAULT_SETTINGS } as SiteSettings;
  for (const key of SETTING_KEYS) {
    if (!stored.has(key)) continue;
    const value = stored.get(key);
    if (key === 'socials') {
      result.socials = {
        ...DEFAULT_SETTINGS.socials,
        ...(typeof value === 'object' && value ? (value as SiteSettings['socials']) : {}),
      };
    } else {
      (result as unknown as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}

export function updateSettings(patch: Partial<SiteSettings>): SiteSettings {
  const stmt = db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  );
  const now = nowIso();
  transaction(() => {
    for (const [key, value] of Object.entries(patch)) {
      if (!SETTING_KEYS.includes(key as keyof SiteSettings)) continue;
      if (value === undefined) continue;
      stmt.run(key, JSON.stringify(value), now);
    }
  });
  return getSettings();
}

/* ---------------------------------- Тренер ---------------------------------- */

interface CoachRow {
  id: number;
  first_name: string;
  last_name: string;
  caption: string;
  photo: string | null;
}

export function getCoach(): Coach {
  const row = db.prepare('SELECT * FROM coach WHERE id = 1').get() as CoachRow | undefined;
  if (!row) {
    db.prepare(
      `INSERT INTO coach (id, first_name, last_name, caption, photo, updated_at)
       VALUES (1, '', '', 'Наш наставник', NULL, ?)`,
    ).run(nowIso());
    return { id: 1, firstName: '', lastName: '', caption: 'Наш наставник', photo: null };
  }
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    caption: row.caption || 'Наш наставник',
    photo: row.photo,
  };
}

export function updateCoach(patch: Partial<Omit<Coach, 'id'>>): Coach {
  const current = getCoach();
  const next = { ...current, ...patch };
  db.prepare(
    `INSERT INTO coach (id, first_name, last_name, caption, photo, updated_at)
     VALUES (1, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       first_name = excluded.first_name,
       last_name = excluded.last_name,
       caption = excluded.caption,
       photo = excluded.photo,
       updated_at = excluded.updated_at`,
  ).run(next.firstName, next.lastName, next.caption, next.photo, nowIso());
  return getCoach();
}

/* --------------------------------- Игроки ---------------------------------- */

interface PlayerRow {
  id: number;
  first_name: string;
  last_name: string;
  number: number;
  position: string;
  rating: number;
  country_code: string;
  country_name: string;
  flag: string;
  photo: string | null;
  role: string;
  appearances: number;
  goals: number;
  assists: number;
  sort_order: number;
  is_demo: number;
}

function rowToPlayer(row: PlayerRow): Player {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    number: row.number,
    position: row.position as PositionCode,
    rating: row.rating,
    countryCode: row.country_code,
    countryName: row.country_name,
    flag: row.flag,
    photo: row.photo,
    role: row.role as PlayerRole,
    appearances: row.appearances,
    goals: row.goals,
    assists: row.assists,
    sortOrder: row.sort_order,
    isDemo: Boolean(row.is_demo),
  };
}

export function listPlayers(): Player[] {
  const rows = db
    .prepare('SELECT * FROM players ORDER BY sort_order ASC, number ASC, id ASC')
    .all() as unknown as PlayerRow[];
  return rows.map(rowToPlayer);
}

export function getPlayer(id: number): Player | null {
  const row = db.prepare('SELECT * FROM players WHERE id = ?').get(id) as unknown as PlayerRow | undefined;
  return row ? rowToPlayer(row) : null;
}

export interface PlayerInput {
  firstName: string;
  lastName: string;
  number: number;
  position: PositionCode;
  rating: number;
  countryCode: string;
  countryName: string;
  flag: string;
  role: PlayerRole;
  appearances: number;
  goals: number;
  assists: number;
  photo?: string | null;
  isDemo?: boolean;
}

export function findPlayerByNumber(number: number, exceptId?: number): Player | null {
  const row = db
    .prepare('SELECT * FROM players WHERE number = ? AND id != ?')
    .get(number, exceptId ?? -1) as unknown as PlayerRow | undefined;
  return row ? rowToPlayer(row) : null;
}

export function createPlayer(input: PlayerInput): Player {
  const now = nowIso();
  const maxOrder = db
    .prepare('SELECT COALESCE(MAX(sort_order), 0) AS value FROM players')
    .get() as { value: number };
  const result = db
    .prepare(
      `INSERT INTO players
       (first_name, last_name, number, position, rating, country_code, country_name, flag, photo,
        role, appearances, goals, assists, sort_order, is_demo, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.firstName,
      input.lastName,
      input.number,
      input.position,
      input.rating,
      input.countryCode,
      input.countryName,
      input.flag,
      input.photo ?? null,
      input.role,
      input.appearances,
      input.goals,
      input.assists,
      maxOrder.value + 1,
      input.isDemo ? 1 : 0,
      now,
      now,
    );
  return getPlayer(lastInsertId(result))!;
}

export function updatePlayer(id: number, patch: Partial<PlayerInput>): Player | null {
  const current = getPlayer(id);
  if (!current) return null;
  const next: PlayerInput = {
    firstName: patch.firstName ?? current.firstName,
    lastName: patch.lastName ?? current.lastName,
    number: patch.number ?? current.number,
    position: patch.position ?? current.position,
    rating: patch.rating ?? current.rating,
    countryCode: patch.countryCode ?? current.countryCode,
    countryName: patch.countryName ?? current.countryName,
    flag: patch.flag ?? current.flag,
    role: patch.role ?? current.role,
    appearances: patch.appearances ?? current.appearances,
    goals: patch.goals ?? current.goals,
    assists: patch.assists ?? current.assists,
    photo: patch.photo === undefined ? current.photo : patch.photo,
    isDemo: patch.isDemo ?? current.isDemo,
  };
  db.prepare(
    `UPDATE players SET
       first_name = ?, last_name = ?, number = ?, position = ?, rating = ?, country_code = ?,
       country_name = ?, flag = ?, photo = ?, role = ?, appearances = ?, goals = ?, assists = ?,
       is_demo = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    next.firstName,
    next.lastName,
    next.number,
    next.position,
    next.rating,
    next.countryCode,
    next.countryName,
    next.flag,
    next.photo ?? null,
    next.role,
    next.appearances,
    next.goals,
    next.assists,
    next.isDemo ? 1 : 0,
    nowIso(),
    id,
  );
  return getPlayer(id);
}

export function deletePlayer(id: number): boolean {
  const result = db.prepare('DELETE FROM players WHERE id = ?').run(id);
  return result.changes > 0;
}

export function reorderPlayers(orderedIds: number[]): void {
  const stmt = db.prepare('UPDATE players SET sort_order = ?, updated_at = ? WHERE id = ?');
  const now = nowIso();
  transaction(() => {
    orderedIds.forEach((id, index) => {
      stmt.run(index + 1, now, id);
    });
  });
}

/* --------------------------------- Составы --------------------------------- */

interface LineupRow {
  formation: string;
  slot: string;
  player_id: number;
}

export function getLineups(): Record<FormationCode, LineupEntry[]> {
  const rows = db.prepare('SELECT * FROM lineups').all() as unknown as LineupRow[];
  const result = {} as Record<FormationCode, LineupEntry[]>;
  for (const code of FORMATION_CODES) {
    result[code] = [];
  }
  for (const row of rows) {
    const code = row.formation as FormationCode;
    if (!result[code]) continue;
    const slot = formationSlots(code).find((s) => s.key === row.slot);
    if (!slot) continue;
    result[code].push({
      formation: code,
      slot: slot.key,
      playerId: row.player_id,
      x: slot.x,
      y: slot.y,
      role: slot.role,
    });
  }
  return result;
}

export function setLineupSlot(
  formation: FormationCode,
  slot: string,
  playerId: number | null,
): void {
  const slotDef = formationSlots(formation).find((s) => s.key === slot);
  if (!slotDef) throw new Error('Неизвестная позиция в схеме');

  transaction(() => {
    if (playerId === null) {
      db.prepare('DELETE FROM lineups WHERE formation = ? AND slot = ?').run(formation, slot);
      return;
    }
    const exists = db
      .prepare('SELECT id FROM players WHERE id = ?')
      .get(playerId) as { id: number } | undefined;
    if (!exists) throw new Error('Игрок не найден');

    // Если игрок уже стоит в другом слоте этой схемы — освобождаем тот слот.
    db.prepare('DELETE FROM lineups WHERE formation = ? AND player_id = ?').run(formation, playerId);
    // Если слот занят — вытесняем прежнего игрока в запас.
    db.prepare('DELETE FROM lineups WHERE formation = ? AND slot = ?').run(formation, slot);
    db.prepare('INSERT INTO lineups (formation, slot, player_id) VALUES (?, ?, ?)').run(
      formation,
      slot,
      playerId,
    );
  });
}

export function swapLineupSlots(formation: FormationCode, first: string, second: string): void {
  const slots = formationSlots(formation);
  if (!slots.some((s) => s.key === first) || !slots.some((s) => s.key === second)) {
    throw new Error('Неизвестные позиции для обмена');
  }
  const rows = db
    .prepare('SELECT slot, player_id FROM lineups WHERE formation = ?')
    .all(formation) as { slot: string; player_id: number }[];
  const map = new Map(rows.map((r) => [r.slot, r.player_id]));
  const a = map.get(first) ?? null;
  const b = map.get(second) ?? null;
  transaction(() => {
    db.prepare('DELETE FROM lineups WHERE formation = ? AND slot IN (?, ?)').run(
      formation,
      first,
      second,
    );
    if (b !== null) {
      db.prepare('INSERT INTO lineups (formation, slot, player_id) VALUES (?, ?, ?)').run(
        formation,
        first,
        b,
      );
    }
    if (a !== null) {
      db.prepare('INSERT INTO lineups (formation, slot, player_id) VALUES (?, ?, ?)').run(
        formation,
        second,
        a,
      );
    }
  });
}

export function clearLineup(formation: FormationCode): void {
  db.prepare('DELETE FROM lineups WHERE formation = ?').run(formation);
}

/** Убирает игрока из стартового состава во всех схемах. */
export function movePlayerToBench(playerId: number): void {
  db.prepare('DELETE FROM lineups WHERE player_id = ?').run(playerId);
}

/** Ставит игрока в свободный слот по его позиции в указанной схеме. */
export function autoAssignPlayer(playerId: number, formation: FormationCode): boolean {
  const player = getPlayer(playerId);
  if (!player) return false;
  const slots = formationSlots(formation);
  const taken = new Set(
    (db.prepare('SELECT slot FROM lineups WHERE formation = ?').all(formation) as {
      slot: string;
    }[]).map((r) => r.slot),
  );
  const candidates = slots.filter((s) => s.role === player.position && !taken.has(s.key));
  const target = candidates[0] ?? slots.find((s) => !taken.has(s.key));
  if (!target) return false;
  setLineupSlot(formation, target.key, playerId);
  return true;
}

/* ---------------------------------- Матчи ---------------------------------- */

interface MatchRow {
  id: number;
  opponent: string;
  opponent_logo: string | null;
  home_score: number | null;
  away_score: number | null;
  date: string;
  status: string;
  competition: string;
}

function rowToMatch(row: MatchRow): MatchItem {
  return {
    id: row.id,
    opponent: row.opponent,
    opponentLogo: row.opponent_logo,
    homeScore: row.home_score,
    awayScore: row.away_score,
    date: row.date,
    status: row.status as MatchStatus,
    competition: row.competition,
  };
}

export function listMatches(): MatchItem[] {
  const rows = db
    .prepare('SELECT * FROM matches ORDER BY date DESC, id DESC')
    .all() as unknown as MatchRow[];
  return rows.map(rowToMatch);
}

export interface MatchInput {
  opponent: string;
  opponentLogo?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  date: string;
  status: MatchStatus;
  competition: string;
}

export function createMatch(input: MatchInput): MatchItem {
  const result = db
    .prepare(
      `INSERT INTO matches (opponent, opponent_logo, home_score, away_score, date, status, competition, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.opponent,
      input.opponentLogo ?? null,
      input.homeScore ?? null,
      input.awayScore ?? null,
      input.date,
      input.status,
      input.competition,
      nowIso(),
    );
  const row = db.prepare('SELECT * FROM matches WHERE id = ?').get(lastInsertId(result)) as unknown as MatchRow;
  return rowToMatch(row);
}

export function updateMatch(id: number, patch: Partial<MatchInput>): MatchItem | null {
  const current = db.prepare('SELECT * FROM matches WHERE id = ?').get(id) as unknown as MatchRow | undefined;
  if (!current) return null;
  const next = { ...rowToMatch(current), ...patch };
  db.prepare(
    `UPDATE matches SET opponent = ?, opponent_logo = ?, home_score = ?, away_score = ?, date = ?,
       status = ?, competition = ? WHERE id = ?`,
  ).run(
    next.opponent,
    next.opponentLogo ?? null,
    next.homeScore ?? null,
    next.awayScore ?? null,
    next.date,
    next.status,
    next.competition,
    id,
  );
  const row = db.prepare('SELECT * FROM matches WHERE id = ?').get(id) as unknown as MatchRow;
  return rowToMatch(row);
}

export function deleteMatch(id: number): boolean {
  const result = db.prepare('DELETE FROM matches WHERE id = ?').run(id);
  return result.changes > 0;
}

/* -------------------------------- Статистика -------------------------------- */

const STAT_KEYS = ['wins', 'draws', 'losses', 'goalsFor', 'goalsAgainst'] as const;

export function getStats(): ClubStats {
  const rows = db.prepare('SELECT key, value FROM stats').all() as {
    key: string;
    value: number;
  }[];
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const playersTotal = (db.prepare('SELECT COUNT(*) AS count FROM players').get() as {
    count: number;
  }).count;

  return {
    playersTotal,
    wins: map.get('wins') ?? 0,
    draws: map.get('draws') ?? 0,
    losses: map.get('losses') ?? 0,
    goalsFor: map.get('goalsFor') ?? 0,
    goalsAgainst: map.get('goalsAgainst') ?? 0,
  };
}

export function updateStats(patch: Partial<ClubStats>): ClubStats {
  const stmt = db.prepare(
    `INSERT INTO stats (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  );
  transaction(() => {
    for (const key of STAT_KEYS) {
      const value = patch[key];
      if (typeof value !== 'number' || !Number.isFinite(value)) continue;
      stmt.run(key, Math.max(0, Math.round(value)));
    }
  });
  return getStats();
}

/* ------------------------------ Ценности клуба ------------------------------ */

interface ClubValueRow {
  id: number;
  icon: string;
  title: string;
  text: string;
  sort_order: number;
  is_visible: number;
}

function rowToClubValue(row: ClubValueRow): ClubValue {
  return {
    id: row.id,
    icon: isValueIcon(row.icon) ? row.icon : 'star',
    title: row.title,
    text: row.text,
    sortOrder: row.sort_order,
    isVisible: Boolean(row.is_visible),
  };
}

export function listClubValues(): ClubValue[] {
  const rows = db
    .prepare('SELECT * FROM club_values ORDER BY sort_order ASC, id ASC')
    .all() as unknown as ClubValueRow[];
  return rows.map(rowToClubValue);
}

export interface ClubValueInput {
  icon: string;
  title: string;
  text: string;
  isVisible: boolean;
}

export function createClubValue(input: ClubValueInput): ClubValue {
  const now = nowIso();
  const maxOrder = db
    .prepare('SELECT COALESCE(MAX(sort_order), 0) AS value FROM club_values')
    .get() as { value: number };
  const result = db
    .prepare(
      `INSERT INTO club_values (icon, title, text, sort_order, is_visible, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      isValueIcon(input.icon) ? input.icon : 'star',
      input.title,
      input.text,
      maxOrder.value + 1,
      input.isVisible ? 1 : 0,
      now,
      now,
    );
  return rowToClubValue(
    db.prepare('SELECT * FROM club_values WHERE id = ?').get(lastInsertId(result)) as unknown as ClubValueRow,
  );
}

export function getClubValue(id: number): ClubValue | null {
  const row = db.prepare('SELECT * FROM club_values WHERE id = ?').get(id) as
    | ClubValueRow
    | undefined;
  return row ? rowToClubValue(row) : null;
}

export function updateClubValue(id: number, patch: Partial<ClubValueInput>): ClubValue | null {
  const current = getClubValue(id);
  if (!current) return null;
  const next = {
    icon: patch.icon === undefined ? current.icon : patch.icon,
    title: patch.title === undefined ? current.title : patch.title,
    text: patch.text === undefined ? current.text : patch.text,
    isVisible: patch.isVisible === undefined ? current.isVisible : patch.isVisible,
  };
  db.prepare(
    `UPDATE club_values SET icon = ?, title = ?, text = ?, is_visible = ?, updated_at = ? WHERE id = ?`,
  ).run(
    isValueIcon(next.icon) ? next.icon : current.icon,
    next.title,
    next.text,
    next.isVisible ? 1 : 0,
    nowIso(),
    id,
  );
  return getClubValue(id);
}

export function deleteClubValue(id: number): boolean {
  return db.prepare('DELETE FROM club_values WHERE id = ?').run(id).changes > 0;
}

export function reorderClubValues(orderedIds: number[]): void {
  const stmt = db.prepare('UPDATE club_values SET sort_order = ?, updated_at = ? WHERE id = ?');
  const now = nowIso();
  transaction(() => {
    orderedIds.forEach((valueId, index) => {
      stmt.run(index + 1, now, valueId);
    });
  });
}

/** Один раз наполняет таблицу стартовыми ценностями — дальше всё через админку. */
export function seedClubValues(): void {
  const count = (db.prepare('SELECT COUNT(*) AS count FROM club_values').get() as {
    count: number;
  }).count;
  if (count > 0) return;

  const now = nowIso();
  const stmt = db.prepare(
    `INSERT INTO club_values (icon, title, text, sort_order, is_visible, created_at, updated_at)
     VALUES (?, ?, ?, ?, 1, ?, ?)`,
  );
  DEFAULT_CLUB_VALUES.forEach((value, index) => {
    stmt.run(value.icon, value.title, value.text, index + 1, now, now);
  });
}

/* ------------------------------- Общий снимок ------------------------------- */

export function buildSitePayload(): SitePayload {
  return {
    settings: getSettings(),
    coach: getCoach(),
    players: listPlayers(),
    lineups: getLineups(),
    matches: listMatches(),
    stats: getStats(),
    values: listClubValues().filter((value) => value.isVisible),
    positions: POSITIONS,
    formations: FORMATION_CODES,
    generatedAt: nowIso(),
  };
}
