-- Migration 003: AI Buddy tables
-- Run: wrangler d1 execute brainforge-db --file=cloudflare-worker/d1-migrations/003_buddy_tables.sql

CREATE TABLE IF NOT EXISTS buddy_dialogues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  round INTEGER,
  speaker TEXT,
  message TEXT,
  topic TEXT,
  timestamp TEXT
);

CREATE TABLE IF NOT EXISTS buddy_personality (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  axis TEXT,
  score REAL,
  reason TEXT,
  timestamp TEXT
);

CREATE TABLE IF NOT EXISTS buddy_dreams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dream_text TEXT,
  source_topics TEXT,
  insight TEXT,
  timestamp TEXT
);

CREATE TABLE IF NOT EXISTS buddy_identity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trait TEXT,
  value TEXT,
  locked INTEGER DEFAULT 0,
  updated_at TEXT
);
