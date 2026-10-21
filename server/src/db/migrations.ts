export const MIGRATIONS: { id: string; sql: string }[] = [
  {
    id: '001_initial',
    sql: `
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS coach (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        first_name TEXT NOT NULL DEFAULT '',
        last_name TEXT NOT NULL DEFAULT '',
        caption TEXT NOT NULL DEFAULT 'Наш наставник',
        photo TEXT,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL DEFAULT '',
        last_name TEXT NOT NULL DEFAULT '',
        number INTEGER NOT NULL DEFAULT 0,
        position TEXT NOT NULL DEFAULT 'CM',
        rating INTEGER NOT NULL DEFAULT 75,
        country_code TEXT NOT NULL DEFAULT '',
        country_name TEXT NOT NULL DEFAULT '',
        flag TEXT NOT NULL DEFAULT '',
        photo TEXT,
        role TEXT NOT NULL DEFAULT 'player',
        appearances INTEGER NOT NULL DEFAULT 0,
        goals INTEGER NOT NULL DEFAULT 0,
        assists INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_demo INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS lineups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        formation TEXT NOT NULL,
        slot TEXT NOT NULL,
        player_id INTEGER NOT NULL,
        UNIQUE (formation, slot),
        UNIQUE (formation, player_id),
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        opponent TEXT NOT NULL,
        opponent_logo TEXT,
        home_score INTEGER,
        away_score INTEGER,
        date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'scheduled',
        competition TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS stats (
        key TEXT PRIMARY KEY,
        value INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token_hash TEXT NOT NULL UNIQUE,
        csrf_token TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        ip TEXT,
        user_agent TEXT
      );

      CREATE TABLE IF NOT EXISTS login_attempts (
        ip TEXT PRIMARY KEY,
        attempts INTEGER NOT NULL DEFAULT 0,
        window_started_at TEXT NOT NULL,
        locked_until TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_players_sort ON players(sort_order);
      CREATE INDEX IF NOT EXISTS idx_lineups_formation ON lineups(formation);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
    `,
  },
  {
    id: '002_club_values',
    sql: `
      CREATE TABLE IF NOT EXISTS club_values (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        icon TEXT NOT NULL DEFAULT 'star',
        title TEXT NOT NULL,
        text TEXT NOT NULL DEFAULT '',
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_visible INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_club_values_sort ON club_values(sort_order);
    `,
  },
];
