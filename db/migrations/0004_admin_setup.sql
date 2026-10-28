-- Migration 0004 (gerdoo-update-2026-10-28) — one-time /admin/setup page. Portable SQL (SQLite + Postgres). Additive only.
-- One row per account created through the setup page. slot 1 = first account (Owner), slot 2 = second account (only when the
-- documented re-open flag is set). The PRIMARY KEY on slot makes a double submit / race unable to create two accounts for one slot,
-- and a filled slot keeps the page closed for good (404), even after a restart.
CREATE TABLE admin_setup (slot INTEGER PRIMARY KEY CHECK (slot IN (1, 2)), admin_id INTEGER NOT NULL REFERENCES admin_users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')));
