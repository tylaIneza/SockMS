CREATE DATABASE IF NOT EXISTS sockms;
USE sockms;

CREATE TABLE IF NOT EXISTS categories (
  id         VARCHAR(36)  NOT NULL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL UNIQUE,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id         VARCHAR(36)                               NOT NULL PRIMARY KEY,
  name       VARCHAR(255)                              NOT NULL,
  email      VARCHAR(255)                              NULL UNIQUE,
  phone      VARCHAR(20)                               NULL UNIQUE,
  password   VARCHAR(255)                              NOT NULL,
  role       ENUM('super_admin','manager','branch_user') NOT NULL DEFAULT 'branch_user',
  is_active  TINYINT(1)                                NOT NULL DEFAULT 1,
  created_at DATETIME                                  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id                VARCHAR(36)   NOT NULL PRIMARY KEY,
  name              VARCHAR(255)  NOT NULL,
  category_id       VARCHAR(36),
  buying_price      DECIMAL(12,2) NOT NULL,
  min_selling_price DECIMAL(12,2) NOT NULL,
  low_stock_alert   INT           NOT NULL DEFAULT 10,
  is_active         TINYINT(1)    NOT NULL DEFAULT 1,
  created_by        VARCHAR(36),
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by)  REFERENCES users(id)       ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS product_stock (
  product_id VARCHAR(36) NOT NULL PRIMARY KEY,
  quantity   INT         NOT NULL DEFAULT 0,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sales (
  id            VARCHAR(36)   NOT NULL PRIMARY KEY,
  user_id       VARCHAR(36)   NOT NULL,
  product_id    VARCHAR(36)   NOT NULL,
  quantity      INT           NOT NULL,
  selling_price DECIMAL(12,2) NOT NULL,
  buying_price  DECIMAL(12,2) NOT NULL,
  total_revenue DECIMAL(12,2) NOT NULL,
  profit        DECIMAL(12,2) NOT NULL,
  note          TEXT,
  sold_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)    REFERENCES users(id)     ON DELETE RESTRICT,
  FOREIGN KEY (product_id) REFERENCES products(id)  ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS expenses (
  id              VARCHAR(36)                   NOT NULL PRIMARY KEY,
  user_id         VARCHAR(36)                   NOT NULL,
  title           VARCHAR(255)                  NOT NULL,
  amount          DECIMAL(12,2)                 NOT NULL,
  expense_date    DATE                          NOT NULL,
  note            TEXT,
  approval_status ENUM('approved','pending')    NOT NULL DEFAULT 'approved',
  pending_data    JSON                          NULL,
  created_at      DATETIME                      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- ─── Migration for existing databases ────────────────────────────────────────
-- Run these once if upgrading from the branched schema:
--
-- SET FOREIGN_KEY_CHECKS = 0;
-- ALTER TABLE users    DROP COLUMN IF EXISTS branch_id;
-- ALTER TABLE sales    DROP COLUMN IF EXISTS branch_id;
-- ALTER TABLE expenses DROP COLUMN IF EXISTS branch_id;
-- SET FOREIGN_KEY_CHECKS = 1;
-- DROP TABLE IF EXISTS branches;
