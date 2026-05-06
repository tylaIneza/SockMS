CREATE DATABASE IF NOT EXISTS sockms;
USE sockms;

CREATE TABLE IF NOT EXISTS branches (
  id          VARCHAR(36)  NOT NULL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  location    VARCHAR(500),
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id         VARCHAR(36)  NOT NULL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL UNIQUE,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id         VARCHAR(36)                          NOT NULL PRIMARY KEY,
  name       VARCHAR(255)                         NOT NULL,
  email      VARCHAR(255)                         NOT NULL UNIQUE,
  password   VARCHAR(255)                         NOT NULL,
  role       ENUM('super_admin','branch_user')    NOT NULL DEFAULT 'branch_user',
  branch_id  VARCHAR(36),
  is_active  TINYINT(1)                           NOT NULL DEFAULT 1,
  created_at DATETIME                             NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
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

CREATE TABLE IF NOT EXISTS branch_stock (
  id         VARCHAR(36) NOT NULL PRIMARY KEY,
  branch_id  VARCHAR(36) NOT NULL,
  product_id VARCHAR(36) NOT NULL,
  quantity   INT         NOT NULL DEFAULT 0,
  UNIQUE KEY uq_bp (branch_id, product_id),
  FOREIGN KEY (branch_id)  REFERENCES branches(id)  ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)  ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sales (
  id            VARCHAR(36)   NOT NULL PRIMARY KEY,
  branch_id     VARCHAR(36)   NOT NULL,
  product_id    VARCHAR(36)   NOT NULL,
  user_id       VARCHAR(36)   NOT NULL,
  quantity      INT           NOT NULL,
  selling_price DECIMAL(12,2) NOT NULL,
  buying_price  DECIMAL(12,2) NOT NULL,
  total_revenue DECIMAL(12,2) NOT NULL,
  profit        DECIMAL(12,2) NOT NULL,
  note          TEXT,
  sold_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id)  REFERENCES branches(id)  ON DELETE RESTRICT,
  FOREIGN KEY (product_id) REFERENCES products(id)  ON DELETE RESTRICT,
  FOREIGN KEY (user_id)    REFERENCES users(id)      ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS expenses (
  id           VARCHAR(36)   NOT NULL PRIMARY KEY,
  branch_id    VARCHAR(36)   NOT NULL,
  user_id      VARCHAR(36)   NOT NULL,
  title        VARCHAR(255)  NOT NULL,
  amount       DECIMAL(12,2) NOT NULL,
  expense_date DATE          NOT NULL,
  note         TEXT,
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
  FOREIGN KEY (user_id)   REFERENCES users(id)    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS stock_transfers (
  id             VARCHAR(36) NOT NULL PRIMARY KEY,
  product_id     VARCHAR(36) NOT NULL,
  from_branch_id VARCHAR(36) NOT NULL,
  to_branch_id   VARCHAR(36) NOT NULL,
  quantity       INT         NOT NULL,
  transferred_by VARCHAR(36) NOT NULL,
  note           TEXT,
  transferred_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id)     REFERENCES products(id)  ON DELETE RESTRICT,
  FOREIGN KEY (from_branch_id) REFERENCES branches(id)  ON DELETE RESTRICT,
  FOREIGN KEY (to_branch_id)   REFERENCES branches(id)  ON DELETE RESTRICT,
  FOREIGN KEY (transferred_by) REFERENCES users(id)     ON DELETE RESTRICT
);
