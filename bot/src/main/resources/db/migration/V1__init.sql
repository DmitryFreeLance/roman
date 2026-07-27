CREATE TYPE product_kind AS ENUM ('REGULAR', 'GROUP_BUY');
CREATE TYPE order_status AS ENUM ('AWAITING_PAYMENT', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED');
CREATE TYPE group_buy_status AS ENUM (
  'COLLECTING', 'PRICE_CONFIRMATION', 'AWAITING_PAYMENT', 'FORMED',
  'IN_DELIVERY', 'COMPLETED', 'CANCELLED'
);
CREATE TYPE reservation_status AS ENUM ('RESERVED', 'PAYMENT_REQUESTED', 'PAID', 'CANCELLED', 'COMPLETED');
CREATE TYPE ledger_entry_type AS ENUM ('ACCRUAL', 'REPAYMENT', 'WRITE_OFF');

CREATE TABLE platform_settings (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  bot_commission_percent NUMERIC(6,3) NOT NULL DEFAULT 5.0,
  default_debt_limit_kopecks BIGINT NOT NULL DEFAULT 50000,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO platform_settings (singleton) VALUES (TRUE);

CREATE TABLE users (
  telegram_id BIGINT PRIMARY KEY,
  username TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT,
  bot_commission_percent NUMERIC(6,3) NOT NULL DEFAULT 5.0,
  commission_debt_kopecks BIGINT NOT NULL DEFAULT 0,
  debt_limit_kopecks BIGINT NOT NULL DEFAULT 50000,
  seller_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  globally_banned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE telegram_groups (
  id BIGSERIAL PRIMARY KEY,
  telegram_group_id BIGINT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  owner_telegram_id BIGINT NOT NULL,
  shop_thread_id INTEGER NOT NULL,
  commission_percent NUMERIC(6,3) NOT NULL DEFAULT 3.5,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE stores (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT NOT NULL REFERENCES telegram_groups(id),
  seller_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id),
  name TEXT NOT NULL,
  description TEXT,
  payment_phone TEXT,
  payment_card TEXT,
  rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (group_id, seller_telegram_id)
);

CREATE TABLE group_seller_bans (
  group_id BIGINT NOT NULL REFERENCES telegram_groups(id),
  seller_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, seller_telegram_id)
);

CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  store_id BIGINT NOT NULL REFERENCES stores(id),
  group_id BIGINT NOT NULL REFERENCES telegram_groups(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  stock INTEGER NOT NULL CHECK (stock >= 0),
  seller_price_kopecks BIGINT NOT NULL CHECK (seller_price_kopecks > 0),
  kind product_kind NOT NULL DEFAULT 'REGULAR',
  image_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX products_group_active_idx ON products(group_id, active, created_at DESC);

CREATE TABLE group_buys (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT UNIQUE NOT NULL REFERENCES products(id),
  target_count INTEGER NOT NULL CHECK (target_count >= 2),
  status group_buy_status NOT NULL DEFAULT 'COLLECTING',
  final_price_kopecks BIGINT,
  collection_deadline TIMESTAMPTZ NOT NULL,
  payment_deadline TIMESTAMPTZ,
  formed_at TIMESTAMPTZ,
  delivery_from TIMESTAMPTZ,
  delivery_to TIMESTAMPTZ,
  delivery_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE group_buy_reservations (
  id BIGSERIAL PRIMARY KEY,
  group_buy_id BIGINT NOT NULL REFERENCES group_buys(id),
  buyer_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id),
  contact_phone TEXT,
  status reservation_status NOT NULL DEFAULT 'RESERVED',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_buy_id, buyer_telegram_id)
);

CREATE INDEX reservations_group_status_idx ON group_buy_reservations(group_buy_id, status);

CREATE TABLE orders (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id),
  buyer_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id),
  seller_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id),
  group_id BIGINT NOT NULL REFERENCES telegram_groups(id),
  seller_price_kopecks BIGINT NOT NULL,
  buyer_price_kopecks BIGINT NOT NULL,
  commission_kopecks BIGINT NOT NULL,
  status order_status NOT NULL DEFAULT 'AWAITING_PAYMENT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX orders_buyer_idx ON orders(buyer_telegram_id, created_at DESC);
CREATE INDEX orders_seller_idx ON orders(seller_telegram_id, created_at DESC);

CREATE TABLE reviews (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT UNIQUE NOT NULL REFERENCES orders(id),
  product_id BIGINT NOT NULL REFERENCES products(id),
  seller_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id),
  buyer_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id),
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE commission_ledger (
  id BIGSERIAL PRIMARY KEY,
  seller_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id),
  order_id BIGINT REFERENCES orders(id),
  amount_kopecks BIGINT NOT NULL,
  entry_type ledger_entry_type NOT NULL,
  recorded_by_telegram_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX commission_ledger_seller_idx ON commission_ledger(seller_telegram_id, created_at DESC);
