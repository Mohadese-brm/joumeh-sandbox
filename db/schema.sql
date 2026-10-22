-- Joumeh storefront schema (LOCAL, SQLite via sql.js). Status: Review. Not a production migration.
-- Every policy-bearing column is a BD stub (see knowledge/joumeh-dev.md §5). Do not ship as policy.
CREATE TABLE categories (id INTEGER PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL); -- BD-18 STUB: taxonomy
CREATE TABLE products (
  id INTEGER PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  status TEXT NOT NULL CHECK (status IN ('default','sale','new')),
  badge_percent INTEGER,            -- R-1: data field only; 16% vs 20% unresolved
  description TEXT,
  sort_rank INTEGER NOT NULL DEFAULT 0, -- best-seller definition is an open item (Refinement 2): sample order only
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  is_sample INTEGER NOT NULL DEFAULT 1,
  -- admin-demo: publish state. Only 'published' products are visible in the shop. Draft/unpublish/archive rules = placeholders.
  publish_state TEXT NOT NULL DEFAULT 'published' CHECK (publish_state IN ('draft','published','unpublished','archived'))
);
CREATE TABLE variants (id INTEGER PRIMARY KEY, product_id INTEGER NOT NULL REFERENCES products(id), size TEXT NOT NULL, color TEXT NOT NULL, color_hex TEXT, sku TEXT UNIQUE NOT NULL,
  available INTEGER NOT NULL DEFAULT 1); -- BD-16 STUB: stock messaging/quantities undecided; only an availability flag
CREATE TABLE images (id INTEGER PRIMARY KEY, product_id INTEGER NOT NULL REFERENCES products(id), url TEXT NOT NULL, alt TEXT NOT NULL, position INTEGER NOT NULL DEFAULT 0);
-- BD-10: single price source per product (Toman, integer).
CREATE TABLE prices (product_id INTEGER PRIMARY KEY REFERENCES products(id), amount INTEGER NOT NULL, original_amount INTEGER, currency TEXT NOT NULL DEFAULT 'IRT');
CREATE TABLE users (id INTEGER PRIMARY KEY, phone TEXT UNIQUE NOT NULL, first_name TEXT, last_name TEXT, email TEXT, email_verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE otp_requests (id INTEGER PRIMARY KEY, phone TEXT NOT NULL, code_hash TEXT NOT NULL, expires_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
  consumed INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL);
CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), created_at INTEGER NOT NULL);
CREATE TABLE carts (id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id), created_at TEXT NOT NULL DEFAULT (datetime('now')));
-- BD-08 STUB: no reservation TTL / oversell logic.
CREATE TABLE cart_items (id INTEGER PRIMARY KEY, cart_id INTEGER NOT NULL REFERENCES carts(id), variant_id INTEGER NOT NULL REFERENCES variants(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0 AND quantity <= 99), UNIQUE(cart_id, variant_id));
CREATE TABLE addresses (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), recipient TEXT NOT NULL, phone TEXT NOT NULL, province TEXT NOT NULL,
  city TEXT NOT NULL, line TEXT NOT NULL, postal_code TEXT NOT NULL, landline TEXT, is_default INTEGER NOT NULL DEFAULT 0);
CREATE TABLE favorites (user_id INTEGER NOT NULL REFERENCES users(id), product_id INTEGER NOT NULL REFERENCES products(id), created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, product_id));
CREATE TABLE orders (
  id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id),
  order_number TEXT,                                   -- BD-11 STUB: format awaiting business decision
  order_status TEXT NOT NULL DEFAULT 'pending' CHECK (order_status IN ('pending','processing','shipped','delivered','cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid','failed','refunded')), -- BD-01 STUB: MockProvider only
  fulfilment_status TEXT NOT NULL DEFAULT 'unfulfilled' CHECK (fulfilment_status IN ('unfulfilled','shipped','delivered')), -- BD-23 STUB
  shipping_method TEXT,                                -- BD-02 STUB
  shipping_fee INTEGER,                                -- BD-02 STUB (NULL = undecided)
  vat_amount INTEGER,                                  -- BD-06 STUB (NULL = undecided)
  subtotal INTEGER NOT NULL, discount INTEGER NOT NULL DEFAULT 0, total INTEGER NOT NULL,
  address_json TEXT NOT NULL, is_sample INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE order_items (id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id), product_id INTEGER NOT NULL REFERENCES products(id),
  variant_id INTEGER REFERENCES variants(id), name TEXT NOT NULL, size TEXT, color TEXT, unit_price INTEGER NOT NULL, quantity INTEGER NOT NULL);
CREATE TABLE payments (id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id), provider TEXT NOT NULL, status TEXT NOT NULL, ref TEXT, amount INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))); -- BD-01 STUB
CREATE TABLE returns (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), order_id INTEGER NOT NULL REFERENCES orders(id), product_id INTEGER NOT NULL REFERENCES products(id),
  return_number TEXT, status TEXT NOT NULL CHECK (status IN ('reviewing','approved','rejected','refunded')), reason TEXT, created_at TEXT NOT NULL); -- BD-04 STUB: policy undecided
-- fix2 reviews (BD-15 still open). DEFAULT rules, changeable: signed-in users only, rating 1–5, text 1–1000 chars, published immediately (status 'published'; no moderation queue by default).
CREATE TABLE reviews (id INTEGER PRIMARY KEY, product_id INTEGER NOT NULL REFERENCES products(id), user_id INTEGER NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5), body TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('pending','published','rejected')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')));

-- ===== admin-demo (branch admin-demo). DEMO ONLY: in-memory, resets on restart. Roles/permissions = PLACEHOLDER (BD-19). =====
CREATE TABLE admin_users (id INTEGER PRIMARY KEY, phone TEXT UNIQUE NOT NULL, name TEXT NOT NULL, roles TEXT NOT NULL, -- comma-separated role keys
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','invited','inactive')), last_login TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE admin_sessions (token_hash TEXT PRIMARY KEY, admin_id INTEGER NOT NULL REFERENCES admin_users(id), created_at INTEGER NOT NULL, last_seen INTEGER NOT NULL);
CREATE TABLE audit_log (id INTEGER PRIMARY KEY, admin_id INTEGER REFERENCES admin_users(id), action TEXT NOT NULL, entity TEXT NOT NULL, entity_id TEXT, detail TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE order_notes (id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id), admin_id INTEGER REFERENCES admin_users(id), body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE order_events (id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id), status TEXT NOT NULL, actor TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
-- Content: editable pages + homepage hero. Real policy TEXT is a placeholder until the CEO supplies it.
CREATE TABLE content_pages (slug TEXT PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL, published INTEGER NOT NULL DEFAULT 0, bd TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE content_home (id INTEGER PRIMARY KEY CHECK (id = 1), hero_title TEXT NOT NULL, hero_cta TEXT NOT NULL, hero_link TEXT NOT NULL, hero_alt TEXT NOT NULL,
  sections_json TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT (datetime('now')));
