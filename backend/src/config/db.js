const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT || '3306'),
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'sockms',
  waitForConnections: true,
  connectionLimit:    10,
  timezone:           'local',
});

const query  = (sql, params) => pool.execute(sql, params);
const one    = async (sql, params) => { const [rows] = await pool.execute(sql, params); return rows[0] || null; };
const many   = async (sql, params) => { const [rows] = await pool.execute(sql, params); return rows; };
const run    = (sql, params) => pool.execute(sql, params);
const transaction = async (fn) => {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

module.exports = { pool, query, one, many, run, transaction };
