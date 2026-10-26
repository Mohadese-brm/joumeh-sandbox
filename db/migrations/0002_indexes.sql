-- Migration 0002 — lookup indexes for a real (Postgres) database. Portable SQL (SQLite + Postgres). No behaviour change.
CREATE INDEX IF NOT EXISTS variants_product_idx ON variants(product_id);
CREATE INDEX IF NOT EXISTS images_product_idx ON images(product_id, position);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items(order_id);
CREATE INDEX IF NOT EXISTS orders_user_idx ON orders(user_id);
CREATE INDEX IF NOT EXISTS reviews_product_idx ON reviews(product_id);
CREATE INDEX IF NOT EXISTS otp_requests_phone_idx ON otp_requests(phone, created_at);
CREATE INDEX IF NOT EXISTS admin_sessions_admin_idx ON admin_sessions(admin_id);
CREATE INDEX IF NOT EXISTS admin_login_attempts_email_idx ON admin_login_attempts(email, at);
CREATE INDEX IF NOT EXISTS admin_login_attempts_ip_idx ON admin_login_attempts(ip, at);
