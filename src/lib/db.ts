import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "previews.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    // Ensure data directory exists
    const fs = require("fs");
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("busy_timeout = 5000");

    // Create table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS url_previews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        image TEXT,
        site_name TEXT,
        favicon TEXT,
        is_fallback INTEGER NOT NULL DEFAULT 0,
        fetched_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      )
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_url ON url_previews(url);
      CREATE INDEX IF NOT EXISTS idx_expires ON url_previews(expires_at);
    `);
  }

  return db;
}
