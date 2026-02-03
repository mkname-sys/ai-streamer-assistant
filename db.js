import Database from "better-sqlite3"

export const db = new Database("data.db")

db.prepare(`
CREATE TABLE IF NOT EXISTS streamers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  twitch_id TEXT UNIQUE,
  username TEXT UNIQUE,
  api_key TEXT UNIQUE,
  plan TEXT DEFAULT 'free'
)
`).run()

db.prepare(`
CREATE TABLE IF NOT EXISTS overlay_state (
  channel TEXT PRIMARY KEY,
  text TEXT
)
`).run()
