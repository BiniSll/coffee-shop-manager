import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = path.join(app.getPath('userData'), 'coffee-shop.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
    runMigrations();
  }
  return db;
}

// ── Initial schema ────────────────────────────────────────────────────────────
// Uses CREATE TABLE IF NOT EXISTS so it is safe to run on both new and existing
// databases. Do NOT alter these statements in future releases — add a migration
// entry in the MIGRATIONS array below instead.
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'staff')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      width INTEGER NOT NULL DEFAULT 800,
      height INTEGER NOT NULL DEFAULT 600
    );

    CREATE TABLE IF NOT EXISTS tables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      label TEXT NOT NULL,
      x INTEGER NOT NULL DEFAULT 50,
      y INTEGER NOT NULL DEFAULT 50,
      seats INTEGER NOT NULL DEFAULT 4,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS room_fixtures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      label TEXT NOT NULL DEFAULT '',
      x INTEGER NOT NULL DEFAULT 50,
      y INTEGER NOT NULL DEFAULT 50,
      width INTEGER NOT NULL DEFAULT 60,
      height INTEGER NOT NULL DEFAULT 60,
      rotation INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      available INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_id INTEGER,
      order_type TEXT NOT NULL CHECK(order_type IN ('dine-in', 'take-away')),
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'completed', 'cancelled')),
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (table_id) REFERENCES tables(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      menu_item_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS daily_closings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      total_orders INTEGER NOT NULL DEFAULT 0,
      total_revenue REAL NOT NULL DEFAULT 0,
      total_items INTEGER NOT NULL DEFAULT 0,
      dine_in_orders INTEGER NOT NULL DEFAULT 0,
      take_away_orders INTEGER NOT NULL DEFAULT 0,
      closed_by INTEGER NOT NULL,
      closed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      FOREIGN KEY (closed_by) REFERENCES users(id)
    );
  `);

  // Seed default users on first run
  const count = db.prepare('SELECT COUNT(*) as cnt FROM users').get() as any;
  if (count.cnt === 0) {
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', 'admin', 'admin');
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('staff', 'staff', 'staff');
  }
}

// ── Migrations ────────────────────────────────────────────────────────────────
// Each entry runs exactly once on databases that have not yet reached that
// version. The version is stored in SQLite's built-in PRAGMA user_version so
// no extra table is needed.
//
// Rules:
//  - Never edit or delete an existing entry — only append new ones.
//  - Increment version by 1 each time.
//  - Prefer ALTER TABLE … ADD COLUMN for adding columns (SQLite supports it).
//  - To rename/drop a column you must recreate the table (see SQLite docs).
//
// Example — adding a discount column to orders in a future release:
//   {
//     version: 2,
//     description: 'Add discount column to orders',
//     up: [
//       'ALTER TABLE orders ADD COLUMN discount REAL NOT NULL DEFAULT 0',
//     ],
//   },

interface Migration {
  version: number;
  description: string;
  up: string[];
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: 'Baseline — all tables already created by initSchema',
    up: [],  // Nothing to run; just marks existing databases as up-to-date.
  },

  // ── Add new migrations here ───────────────────────────────────────────────
  // {
  //   version: 2,
  //   description: 'Example: add notes column to orders',
  //   up: [
  //     'ALTER TABLE orders ADD COLUMN notes TEXT',
  //   ],
  // },
];

function runMigrations() {
  const currentVersion = db.pragma('user_version', { simple: true }) as number;

  const pending = MIGRATIONS.filter(m => m.version > currentVersion);
  if (pending.length === 0) return;

  for (const migration of pending) {
    db.transaction(() => {
      for (const sql of migration.up) {
        db.exec(sql);
      }
      // user_version must be set via pragma (cannot use bound parameters)
      db.pragma(`user_version = ${migration.version}`);
    })();

    console.log(`[DB] Migration v${migration.version} applied: ${migration.description}`);
  }
}
