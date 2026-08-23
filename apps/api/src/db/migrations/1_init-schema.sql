-- merchant-agent Commerce Database Schema
-- Run once: psql $DATABASE_URL -f apps/api/src/db/schema.sql

-- Drop existing tables (dev only, remove in production)
-- DROP TABLE IF EXISTS action_logs CASCADE;
-- DROP TABLE IF EXISTS agent_recommendations CASCADE;
-- DROP TABLE IF EXISTS events CASCADE;
-- DROP TABLE IF EXISTS orders CASCADE;
-- DROP TABLE IF EXISTS cart_items CASCADE;
-- DROP TABLE IF EXISTS carts CASCADE;
-- DROP TABLE IF EXISTS buyer_sessions CASCADE;
-- DROP TABLE IF EXISTS products CASCADE;

-- Products: the catalog
CREATE TABLE products (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  description       TEXT,
  category          TEXT NOT NULL,                  -- snacks, decorations, beverages, gifts
  price_paise       INTEGER NOT NULL CHECK (price_paise > 0),
  cost_price_paise  INTEGER NOT NULL CHECK (cost_price_paise > 0 AND cost_price_paise < price_paise),
  max_discount_pct  INTEGER NOT NULL DEFAULT 20 CHECK (max_discount_pct >= 0 AND max_discount_pct <= 100),
  stock             INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  tags              TEXT[] DEFAULT '{}',            -- ['party', 'corporate', 'budget-friendly']
  ai_summary        TEXT,                           -- "Good for corporate gifts, office parties"
  best_for          TEXT[] DEFAULT '{}',            -- AI-readable use cases
  expiry_date       DATE,                           -- NULL for non-perishables
  margin_pct        INTEGER,                        -- merchant-only, never exposed to Buyer Agent
  internal_notes    TEXT,    
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX products_category ON products(category) WHERE is_active = true;
CREATE INDEX products_expiry ON products(expiry_date) WHERE expiry_date IS NOT NULL AND is_active = true;

-- Buyer sessions: each Buyer Agent run
CREATE TABLE buyer_sessions (
  id         TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Events: agent memory, every meaningful action becomes a row
CREATE TABLE events (
  id              BIGSERIAL PRIMARY KEY,
  type            TEXT NOT NULL,                    -- product_viewed, cart_created, cart_item_added, payment_link_created, payment_success, payment_failed, cart_abandoned
  session_id      TEXT REFERENCES buyer_sessions(id),
  product_id      TEXT REFERENCES products(id),
  cart_id         TEXT,
  order_id        TEXT,
  amount_paise    INTEGER,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX events_type_product ON events(type, product_id);
CREATE INDEX events_session ON events(session_id);
CREATE INDEX events_created_at ON events(created_at DESC);

-- Carts: shopping carts
CREATE TABLE carts (
  id           TEXT PRIMARY KEY,
  session_id   TEXT REFERENCES buyer_sessions(id),
  status       TEXT NOT NULL DEFAULT 'active',      -- active, checkout_created, paid, abandoned
  total_paise  INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX carts_status_updated ON carts(status, updated_at);

-- Cart items: products in cart
CREATE TABLE cart_items (
  id               BIGSERIAL PRIMARY KEY,
  cart_id          TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id       TEXT NOT NULL REFERENCES products(id),
  quantity         INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_paise INTEGER NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cart_id, product_id)
);

-- Orders: payment intent
CREATE TABLE orders (
  id                         TEXT PRIMARY KEY,
  cart_id                    TEXT NOT NULL REFERENCES carts(id),
  status                     TEXT NOT NULL DEFAULT 'payment_pending', -- payment_pending, paid, failed, cancelled
  amount_paise               INTEGER NOT NULL,
  razorpay_payment_link_id   TEXT,
  razorpay_payment_link_url  TEXT,
  razorpay_payment_id        TEXT,
  created_by                 TEXT NOT NULL,             -- 'buyer_agent' or 'growth_agent'
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX orders_status ON orders(status);
CREATE INDEX orders_created_by ON orders(created_by, status);

-- Agent recommendations: Growth Agent proposals pending merchant approval
CREATE TABLE agent_recommendations (
  id                     BIGSERIAL PRIMARY KEY,
  agent_type             TEXT NOT NULL DEFAULT 'growth_agent',
  type                   TEXT NOT NULL,               -- discount, bogo, cross_sell, abandoned_cart_recovery
  product_id             TEXT REFERENCES products(id),
  cart_id                TEXT REFERENCES carts(id),
  reasoning              TEXT NOT NULL,               -- shown to merchant: "8 views, 0 purchases in last 24h"
  action_params          JSONB NOT NULL,              -- { "discount_pct": 15 } or { "offer": "bogo" }
  expected_revenue_paise INTEGER,
  status                 TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, executed
  approved_at            TIMESTAMPTZ,
  executed_at            TIMESTAMPTZ,
  created_order_id       TEXT REFERENCES orders(id),  -- filled after execution
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX agent_recommendations_status ON agent_recommendations(status, created_at DESC);

-- Action logs: audit trail for all agent actions, errors, system events
CREATE TABLE action_logs (
  id         BIGSERIAL PRIMARY KEY,
  level      TEXT NOT NULL,                          -- info, warn, error
  agent      TEXT,                                   -- buyer_agent, growth_agent, system
  action     TEXT NOT NULL,                          -- checkout_success, webhook_invalid, stock_depleted
  message    TEXT NOT NULL,
  metadata   JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX action_logs_level_created ON action_logs(level, created_at DESC);

-- Trigger: auto-update updated_at on carts and orders
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_carts_updated_at BEFORE UPDATE ON carts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
