require('dotenv').config();
const mysql  = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');

async function seed() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  console.log('Connected. Seeding...');

  const hash = (p) => bcrypt.hash(p, 10);

  // Branches
  const branchAId = uuid(), branchBId = uuid();
  await conn.execute('DELETE FROM stock_transfers'); await conn.execute('DELETE FROM expenses');
  await conn.execute('DELETE FROM sales'); await conn.execute('DELETE FROM branch_stock');
  await conn.execute('DELETE FROM products'); await conn.execute('DELETE FROM users');
  await conn.execute('DELETE FROM categories'); await conn.execute('DELETE FROM branches');

  await conn.execute('INSERT INTO branches (id, name, location) VALUES (?,?,?)', [branchAId, 'Branch A - Downtown', 'Kigali, Downtown']);
  await conn.execute('INSERT INTO branches (id, name, location) VALUES (?,?,?)', [branchBId, 'Branch B - Remera', 'Kigali, Remera']);
  console.log('✓ Branches');

  // Categories
  const cats = ['Electronics', 'Beverages', 'Stationery', 'Clothing', 'Household'];
  const catIds = {};
  for (const c of cats) { catIds[c] = uuid(); await conn.execute('INSERT INTO categories (id, name) VALUES (?,?)', [catIds[c], c]); }
  console.log('✓ Categories');

  // Users
  const adminId  = uuid(), userAId = uuid(), userBId = uuid();
  await conn.execute('INSERT INTO users (id,name,email,password,role) VALUES (?,?,?,?,?)',
    [adminId, 'Super Admin', 'admin@sockms.com', await hash('admin123'), 'super_admin']);
  await conn.execute('INSERT INTO users (id,name,email,password,role,branch_id) VALUES (?,?,?,?,?,?)',
    [userAId, 'Alice Uwase', 'branch.a@sockms.com', await hash('branch123'), 'branch_user', branchAId]);
  await conn.execute('INSERT INTO users (id,name,email,password,role,branch_id) VALUES (?,?,?,?,?,?)',
    [userBId, 'Bob Nkusi', 'branch.b@sockms.com', await hash('branch123'), 'branch_user', branchBId]);
  console.log('✓ Users');

  // Products
  const products = [
    { name: 'iPhone 15 Pro', cat: 'Electronics', buy: 1200000, min: 1300000, alert: 3 },
    { name: 'Samsung TV 43"', cat: 'Electronics', buy: 350000, min: 400000, alert: 2 },
    { name: 'Laptop Dell 15"', cat: 'Electronics', buy: 800000, min: 900000, alert: 3 },
    { name: 'Coca-Cola 300ml', cat: 'Beverages', buy: 300, min: 400, alert: 50 },
    { name: 'Fanta Orange 500ml', cat: 'Beverages', buy: 400, min: 500, alert: 50 },
    { name: 'Mineral Water 1.5L', cat: 'Beverages', buy: 200, min: 300, alert: 100 },
    { name: 'A4 Paper Ream', cat: 'Stationery', buy: 3500, min: 4500, alert: 20 },
    { name: 'Ballpoint Pen (Pack)', cat: 'Stationery', buy: 800, min: 1200, alert: 30 },
    { name: 'Men\'s T-Shirt', cat: 'Clothing', buy: 3000, min: 5000, alert: 10 },
    { name: 'Laundry Soap 1kg', cat: 'Household', buy: 900, min: 1200, alert: 20 },
  ];

  const productIds = {};
  for (const p of products) {
    const id = uuid();
    productIds[p.name] = id;
    await conn.execute(
      'INSERT INTO products (id, name, category_id, buying_price, min_selling_price, low_stock_alert, created_by) VALUES (?,?,?,?,?,?,?)',
      [id, p.name, catIds[p.cat], p.buy, p.min, p.alert, adminId],
    );
  }
  console.log('✓ Products');

  // Stock per branch
  const stockA = { 'iPhone 15 Pro': 5, 'Samsung TV 43"': 3, 'Laptop Dell 15"': 4, 'Coca-Cola 300ml': 200, 'Fanta Orange 500ml': 150, 'Mineral Water 1.5L': 300, 'A4 Paper Ream': 50, 'Ballpoint Pen (Pack)': 80, 'Men\'s T-Shirt': 40, 'Laundry Soap 1kg': 60 };
  const stockB = { 'iPhone 15 Pro': 8, 'Samsung TV 43"': 2, 'Laptop Dell 15"': 6, 'Coca-Cola 300ml': 300, 'Fanta Orange 500ml': 200, 'Mineral Water 1.5L': 500, 'A4 Paper Ream': 80, 'Ballpoint Pen (Pack)': 100, 'Men\'s T-Shirt': 60, 'Laundry Soap 1kg': 90 };

  for (const [name, qty] of Object.entries(stockA)) {
    await conn.execute('INSERT INTO branch_stock (id, branch_id, product_id, quantity) VALUES (?,?,?,?)', [uuid(), branchAId, productIds[name], qty]);
  }
  for (const [name, qty] of Object.entries(stockB)) {
    await conn.execute('INSERT INTO branch_stock (id, branch_id, product_id, quantity) VALUES (?,?,?,?)', [uuid(), branchBId, productIds[name], qty]);
  }
  console.log('✓ Stock');

  // Sample sales (last 30 days)
  const salesData = [
    { branch: branchAId, user: userAId, product: 'Coca-Cola 300ml', qty: 20, price: 500 },
    { branch: branchAId, user: userAId, product: 'A4 Paper Ream', qty: 5, price: 5000 },
    { branch: branchAId, user: userAId, product: 'iPhone 15 Pro', qty: 1, price: 1450000 },
    { branch: branchBId, user: userBId, product: 'Fanta Orange 500ml', qty: 30, price: 600 },
    { branch: branchBId, user: userBId, product: 'Laptop Dell 15"', qty: 2, price: 950000 },
    { branch: branchBId, user: userBId, product: 'Men\'s T-Shirt', qty: 10, price: 6000 },
    { branch: branchAId, user: userAId, product: 'Mineral Water 1.5L', qty: 50, price: 400 },
    { branch: branchBId, user: userBId, product: 'Laundry Soap 1kg', qty: 15, price: 1500 },
  ];

  for (let i = 0; i < salesData.length; i++) {
    const d = salesData[i];
    const pid = productIds[d.product];
    const prod = products.find(p => p.name === d.product);
    const revenue = (d.qty * d.price).toFixed(2);
    const profit  = ((d.price - prod.buy) * d.qty).toFixed(2);
    const daysAgo = i * 3;
    await conn.execute(
      `INSERT INTO sales (id, branch_id, product_id, user_id, quantity, selling_price, buying_price, total_revenue, profit, sold_at)
       VALUES (?,?,?,?,?,?,?,?,?, DATE_SUB(NOW(), INTERVAL ? DAY))`,
      [uuid(), d.branch, pid, d.user, d.qty, d.price, prod.buy, revenue, profit, daysAgo],
    );
  }
  console.log('✓ Sales');

  // Sample expenses
  const expensesData = [
    { branch: branchAId, user: userAId, title: 'Electricity', amount: 45000, days: 5 },
    { branch: branchAId, user: userAId, title: 'Transport', amount: 15000, days: 3 },
    { branch: branchBId, user: userBId, title: 'Rent', amount: 200000, days: 7 },
    { branch: branchBId, user: userBId, title: 'Electricity', amount: 38000, days: 4 },
    { branch: branchAId, user: userAId, title: 'Cleaning', amount: 5000, days: 2 },
  ];

  for (const e of expensesData) {
    const date = new Date(Date.now() - e.days * 86400000).toISOString().slice(0, 10);
    await conn.execute(
      'INSERT INTO expenses (id, branch_id, user_id, title, amount, expense_date) VALUES (?,?,?,?,?,?)',
      [uuid(), e.branch, e.user, e.title, e.amount, date],
    );
  }
  console.log('✓ Expenses');

  console.log('\n✅ Seed complete!\n');
  console.log('Login credentials:');
  console.log('  Super Admin : admin@sockms.com    / admin123');
  console.log('  Branch A    : branch.a@sockms.com / branch123');
  console.log('  Branch B    : branch.b@sockms.com / branch123');

  await conn.end();
}

seed().catch(err => { console.error(err.message); process.exit(1); });
