import { db, nowIso } from './index.js';
import { FORMATIONS } from '../../../shared/formations.js';
import type { FormationCode } from '../../../shared/types.js';

interface DemoPlayer {
  firstName: string;
  lastName: string;
  number: number;
  position: string;
  rating: number;
  role: 'player' | 'captain' | 'vice';
  isStarter: boolean;
}

const DEMO_FLAG = '🌐';
const DEMO_COUNTRY = 'Страна (пример)';

/**
 * Демонстрационные данные. Все они явно помечены как пример:
 * в имени присутствует слово «Пример», флаг — нейтральный, фотографий нет.
 * Реальные данные загружаются через админ-панель.
 */
const DEMO_PLAYERS: DemoPlayer[] = [
  { firstName: 'Игрок', lastName: 'Пример 01', number: 1, position: 'GK', rating: 78, role: 'player', isStarter: true },
  { firstName: 'Игрок', lastName: 'Пример 02', number: 2, position: 'RB', rating: 74, role: 'player', isStarter: true },
  { firstName: 'Игрок', lastName: 'Пример 03', number: 3, position: 'LB', rating: 75, role: 'player', isStarter: true },
  { firstName: 'Игрок', lastName: 'Пример 04', number: 4, position: 'CB', rating: 81, role: 'player', isStarter: true },
  { firstName: 'Игрок', lastName: 'Пример 05', number: 5, position: 'CB', rating: 79, role: 'vice', isStarter: true },
  { firstName: 'Игрок', lastName: 'Пример 06', number: 6, position: 'CM', rating: 83, role: 'player', isStarter: true },
  { firstName: 'Игрок', lastName: 'Пример 07', number: 7, position: 'RW', rating: 84, role: 'player', isStarter: true },
  { firstName: 'Игрок', lastName: 'Пример 08', number: 8, position: 'CM', rating: 82, role: 'player', isStarter: true },
  { firstName: 'Игрок', lastName: 'Пример 09', number: 9, position: 'ST', rating: 86, role: 'player', isStarter: true },
  { firstName: 'Капитан', lastName: 'Пример', number: 10, position: 'CM', rating: 88, role: 'captain', isStarter: true },
  { firstName: 'Игрок', lastName: 'Пример 11', number: 11, position: 'LW', rating: 85, role: 'player', isStarter: true },
  { firstName: 'Игрок', lastName: 'Пример 13', number: 13, position: 'CM', rating: 77, role: 'player', isStarter: false },
  { firstName: 'Игрок', lastName: 'Пример 19', number: 19, position: 'ST', rating: 80, role: 'player', isStarter: false },
  { firstName: 'Игрок', lastName: 'Пример 22', number: 22, position: 'GK', rating: 73, role: 'player', isStarter: false },
];

/**
 * Заполняет базу демо-данными, только если таблица игроков пуста.
 * Ничего не перезаписывает — реальные правки администратора не теряются.
 */
export function seedDemoData(): void {
  const count = (db.prepare('SELECT COUNT(*) AS count FROM players').get() as { count: number })
    .count;
  if (count > 0) return;

  const now = nowIso();
  const insert = db.prepare(
    `INSERT INTO players
      (first_name, last_name, number, position, rating, country_code, country_name, flag, photo,
       role, appearances, goals, assists, sort_order, is_demo, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, 1, ?, ?)`,
  );

  const idsByPosition = new Map<string, number[]>();
  const insertedIds: number[] = [];

  DEMO_PLAYERS.forEach((demo, index) => {
    const result = insert.run(
      demo.firstName,
      demo.lastName,
      demo.number,
      demo.position,
      demo.rating,
      'XX',
      DEMO_COUNTRY,
      DEMO_FLAG,
      demo.role,
      0,
      0,
      0,
      index + 1,
      now,
      now,
    );
    const id = Number(result.lastInsertRowid);
    insertedIds.push(id);
    const list = idsByPosition.get(demo.position) ?? [];
    list.push(id);
    idsByPosition.set(demo.position, list);
  });

  // Расставляем демо-игроков по всем схемам, чтобы переключение схем на сайте работало.
  const insertLineup = db.prepare(
    'INSERT OR IGNORE INTO lineups (formation, slot, player_id) VALUES (?, ?, ?)',
  );

  for (const formation of FORMATIONS) {
    const used = new Set<number>();
    const byPosition = new Map<string, number[]>();
    DEMO_PLAYERS.forEach((demo, index) => {
      const list = byPosition.get(demo.position) ?? [];
      list.push(insertedIds[index]);
      byPosition.set(demo.position, list);
    });

    const take = (position: string): number | undefined => {
      const list = byPosition.get(position) ?? [];
      while (list.length) {
        const id = list.shift()!;
        if (!used.has(id)) {
          used.add(id);
          return id;
        }
      }
      return undefined;
    };

    for (const slot of formation.slots) {
      const playerId = take(slot.role);
      if (playerId) insertLineup.run(formation.code as FormationCode, slot.key, playerId);
    }
  }

  console.log('[db] добавлены демо-данные (примеры). Замените их через админ-панель.');
}
