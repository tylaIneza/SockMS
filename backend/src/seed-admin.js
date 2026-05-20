require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql  = require('mysql2/promise');
const { v4: uuid } = require('uuid');

const NAME     = process.env.ADMIN_NAME     || 'Super Admin';
const PHONE    = process.env.ADMIN_PHONE    || '0786748801';
const PASSWORD = process.env.ADMIN_PASSWORD || 'uwayoben11';

(async () => {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '3306'),
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'sockms',
  });

  try {
    const [rows] = await conn.execute(
      'SELECT id, name, phone FROM users WHERE role = ?',
      ['super_admin'],
    );

    if (rows.length > 0 && !process.argv.includes('--reset')) {
      console.log('Super admin already exists:');
      rows.forEach(r => console.log(`  - ${r.name}  (${r.phone})`));
      console.log('\nTo replace with new credentials, run:');
      console.log(`  node src/seed-admin.js --reset`);
      await conn.end();
      return;
    }

    if (process.argv.includes('--reset')) {
      await conn.execute('DELETE FROM users WHERE role = ?', ['super_admin']);
      console.log('Old super admin removed.');
    }

    const hash = await bcrypt.hash(PASSWORD, 10);
    const id   = uuid();
    await conn.execute(
      'INSERT INTO users (id, name, phone, password, role, is_active) VALUES (?, ?, ?, ?, ?, 1)',
      [id, NAME, PHONE, hash, 'super_admin'],
    );

    console.log('Super admin created successfully!');
    console.log(`  Name    : ${NAME}`);
    console.log(`  Phone   : ${PHONE}`);
    console.log(`  Password: ${PASSWORD}`);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
})();
