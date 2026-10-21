import fs from 'node:fs';
import { config } from '../src/env.js';
import { runMigrations } from '../src/db/index.js';
import { seedDemoData } from '../src/db/seed.js';

for (const suffix of ['', '-wal', '-shm']) {
  const file = `${config.databasePath}${suffix}`;
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

runMigrations();
seedDemoData();

console.log('[reset-db] База данных пересоздана и заполнена демо-данными.');
console.log(`[reset-db] Файл базы: ${config.databasePath}`);
