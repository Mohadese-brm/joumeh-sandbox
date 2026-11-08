-- Round 2 (2026-11-08). Iranian names for the five men's products, matched to their photos.
-- Idempotent and non-destructive: a row is renamed only while it still has the old placeholder name.
-- An admin who already changed the name is left alone. Running this again changes nothing.
UPDATE products SET name = 'پولوشرت مردانه «آرش»' WHERE slug = 'p35' AND name = 'استودیو – ۳۵';
UPDATE products SET name = 'پولوشرت مردانه «کیان»' WHERE slug = 'p36' AND name = 'استودیو – ۳۶';
UPDATE products SET name = 'پیراهن مردانه «رادین»' WHERE slug = 'p37' AND name = 'استودیو – ۳۷';
UPDATE products SET name = 'پولوشرت مردانه «سامان»' WHERE slug = 'p38' AND name = 'استودیو – ۳۸';
UPDATE products SET name = 'پیراهن مردانه «نیما»' WHERE slug = 'p39' AND name = 'استودیو – ۳۹';
