-- Migration 0003 (admin-v1) — stock quantities, append-only stock ledger, uploaded product images. Portable SQL (SQLite + Postgres).
-- Figma: inventory 179:21565, ledger 179:22434, product images 178:18759. Quantity RULES are placeholders (ADMIN-PH-LOWSTOCK, BD-08 oversell).
-- on_hand NULL = not tracked yet: the shop keeps using the existing `available` flag, so nothing changes for shoppers until stock is entered.
ALTER TABLE variants ADD COLUMN on_hand INTEGER;
-- NULL = the placeholder default threshold (server/inventory.ts LOW_STOCK_DEFAULT, ADMIN-PH-LOWSTOCK).
ALTER TABLE variants ADD COLUMN low_stock_threshold INTEGER;
-- Append-only (Figma 179:22434: «فقط افزودنی؛ قابل ویرایش یا حذف نیست»): the app never UPDATEs or DELETEs these rows.
CREATE TABLE inventory_movements (id INTEGER PRIMARY KEY, variant_id INTEGER NOT NULL REFERENCES variants(id),
  kind TEXT NOT NULL CHECK (kind IN ('increase','decrease','count','pos_sale','order_shipped')),
  delta INTEGER NOT NULL, before_qty INTEGER, after_qty INTEGER NOT NULL, reason TEXT NOT NULL, note TEXT,
  order_id INTEGER REFERENCES orders(id), admin_id INTEGER REFERENCES admin_users(id), actor TEXT NOT NULL, oversold INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE INDEX inventory_movements_variant_idx ON inventory_movements(variant_id, id);
-- Uploaded images: where the file lives in the media store (server/media.ts). Seeded catalogue images keep storage_key NULL (static files).
ALTER TABLE images ADD COLUMN storage_key TEXT;
ALTER TABLE images ADD COLUMN mime TEXT;
ALTER TABLE images ADD COLUMN bytes INTEGER;
