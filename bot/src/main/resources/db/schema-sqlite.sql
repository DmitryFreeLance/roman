PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 10000;

CREATE TABLE IF NOT EXISTS platform_settings (
  singleton INTEGER PRIMARY KEY DEFAULT 1 CHECK (singleton = 1),
  bot_commission_percent REAL NOT NULL DEFAULT 5.0,
  default_debt_limit_kopecks INTEGER NOT NULL DEFAULT 50000,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO platform_settings (singleton) VALUES (1);

CREATE TABLE IF NOT EXISTS users (
  telegram_id INTEGER PRIMARY KEY,
  username TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT,
  display_name TEXT,
  phone TEXT,
  selected_group_id INTEGER,
  registered INTEGER NOT NULL DEFAULT 0 CHECK (registered IN (0, 1)),
  bot_commission_percent REAL NOT NULL DEFAULT 5.0,
  commission_debt_kopecks INTEGER NOT NULL DEFAULT 0,
  debt_limit_kopecks INTEGER NOT NULL DEFAULT 50000,
  seller_blocked INTEGER NOT NULL DEFAULT 0 CHECK (seller_blocked IN (0, 1)),
  globally_banned INTEGER NOT NULL DEFAULT 0 CHECK (globally_banned IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS categories_active_sort_idx
  ON categories(active, sort_order, name);

CREATE TABLE IF NOT EXISTS telegram_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_group_id INTEGER UNIQUE NOT NULL,
  title TEXT NOT NULL,
  owner_telegram_id INTEGER NOT NULL,
  shop_thread_id INTEGER NOT NULL,
  commission_percent REAL NOT NULL DEFAULT 3.5,
  debt_limit_kopecks INTEGER NOT NULL DEFAULT 50000,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL REFERENCES telegram_groups(id),
  seller_telegram_id INTEGER NOT NULL REFERENCES users(telegram_id),
  name TEXT NOT NULL,
  description TEXT,
  payment_phone TEXT,
  payment_card TEXT,
  payment_details TEXT,
  rating REAL NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  UNIQUE (group_id, seller_telegram_id)
);

CREATE TABLE IF NOT EXISTS group_seller_bans (
  group_id INTEGER NOT NULL REFERENCES telegram_groups(id),
  seller_telegram_id INTEGER NOT NULL REFERENCES users(telegram_id),
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (group_id, seller_telegram_id)
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER NOT NULL REFERENCES stores(id),
  group_id INTEGER NOT NULL REFERENCES telegram_groups(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  stock INTEGER NOT NULL CHECK (stock >= 0),
  seller_price_kopecks INTEGER NOT NULL CHECK (seller_price_kopecks > 0),
  kind TEXT NOT NULL DEFAULT 'REGULAR'
    CHECK (kind IN ('REGULAR', 'GROUP_BUY')),
  image_urls TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(image_urls)),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  deleted INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS products_group_active_idx
  ON products(group_id, active, created_at DESC);

CREATE TABLE IF NOT EXISTS favorites (
  user_telegram_id INTEGER NOT NULL REFERENCES users(telegram_id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_telegram_id, product_id)
);

CREATE TABLE IF NOT EXISTS group_buys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER UNIQUE NOT NULL REFERENCES products(id),
  target_count INTEGER NOT NULL CHECK (target_count >= 2),
  status TEXT NOT NULL DEFAULT 'COLLECTING'
    CHECK (status IN (
      'COLLECTING', 'PRICE_CONFIRMATION', 'AWAITING_PAYMENT', 'FORMED',
      'IN_DELIVERY', 'COMPLETED', 'CANCELLED'
    )),
  final_price_kopecks INTEGER,
  collection_deadline TEXT NOT NULL,
  payment_deadline TEXT,
  formed_at TEXT,
  delivery_from TEXT,
  delivery_to TEXT,
  delivery_note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS group_buy_reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_buy_id INTEGER NOT NULL REFERENCES group_buys(id),
  buyer_telegram_id INTEGER NOT NULL REFERENCES users(telegram_id),
  contact_phone TEXT,
  status TEXT NOT NULL DEFAULT 'RESERVED'
    CHECK (status IN ('RESERVED', 'PAYMENT_REQUESTED', 'PAID', 'CANCELLED', 'COMPLETED')),
  paid_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (group_buy_id, buyer_telegram_id)
);

CREATE INDEX IF NOT EXISTS reservations_group_status_idx
  ON group_buy_reservations(group_buy_id, status);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id),
  buyer_telegram_id INTEGER NOT NULL REFERENCES users(telegram_id),
  seller_telegram_id INTEGER NOT NULL REFERENCES users(telegram_id),
  group_id INTEGER NOT NULL REFERENCES telegram_groups(id),
  seller_price_kopecks INTEGER NOT NULL,
  buyer_price_kopecks INTEGER NOT NULL,
  commission_kopecks INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'AWAITING_PAYMENT'
    CHECK (status IN ('AWAITING_PAYMENT', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS orders_buyer_idx
  ON orders(buyer_telegram_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_seller_idx
  ON orders(seller_telegram_id, created_at DESC);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_telegram_id INTEGER NOT NULL REFERENCES users(telegram_id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS notifications_user_idx
  ON notifications(user_telegram_id, is_read, created_at DESC);

CREATE TABLE IF NOT EXISTS seller_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER REFERENCES orders(id),
  group_buy_id INTEGER REFERENCES group_buys(id),
  reporter_telegram_id INTEGER NOT NULL REFERENCES users(telegram_id),
  reported_telegram_id INTEGER NOT NULL REFERENCES users(telegram_id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'BANNED', 'DISMISSED')),
  resolved_by_telegram_id INTEGER REFERENCES users(telegram_id),
  resolved_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (order_id IS NOT NULL OR group_buy_id IS NOT NULL),
  UNIQUE (order_id, reporter_telegram_id),
  UNIQUE (group_buy_id, reporter_telegram_id)
);

CREATE INDEX IF NOT EXISTS seller_reports_status_idx
  ON seller_reports(status, created_at DESC);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER UNIQUE NOT NULL REFERENCES orders(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  seller_telegram_id INTEGER NOT NULL REFERENCES users(telegram_id),
  buyer_telegram_id INTEGER NOT NULL REFERENCES users(telegram_id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS commission_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seller_telegram_id INTEGER NOT NULL REFERENCES users(telegram_id),
  order_id INTEGER REFERENCES orders(id),
  amount_kopecks INTEGER NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('ACCRUAL', 'REPAYMENT', 'WRITE_OFF')),
  recorded_by_telegram_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS commission_ledger_seller_idx
  ON commission_ledger(seller_telegram_id, created_at DESC);
