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

  // ── Clear ──────────────────────────────────────────────────────────────
  await conn.execute('DELETE FROM stock_transfers');
  await conn.execute('DELETE FROM expenses');
  await conn.execute('DELETE FROM sales');
  await conn.execute('DELETE FROM branch_stock');
  await conn.execute('DELETE FROM products');
  await conn.execute('DELETE FROM users');
  await conn.execute('DELETE FROM categories');
  await conn.execute('DELETE FROM branches');

  // ── Branches ───────────────────────────────────────────────────────────
  const branchAId = uuid(), branchBId = uuid();
  await conn.execute('INSERT INTO branches (id,name,location) VALUES (?,?,?)', [branchAId, 'Branch A - Downtown', 'Kigali, Downtown']);
  await conn.execute('INSERT INTO branches (id,name,location) VALUES (?,?,?)', [branchBId, 'Branch B - Remera',   'Kigali, Remera']);
  const branchMap = { A: branchAId, B: branchBId };
  console.log('✓ Branches');

  // ── Categories ────────────────────────────────────────────────────────
  const cats = ['Electronics', 'Beverages', 'Stationery', 'Clothing', 'Household'];
  const catIds = {};
  for (const c of cats) { catIds[c] = uuid(); await conn.execute('INSERT INTO categories (id,name) VALUES (?,?)', [catIds[c], c]); }
  console.log('✓ Categories');

  // ── Users ─────────────────────────────────────────────────────────────
  const adminId = uuid(), userAId = uuid(), userBId = uuid();
  const userMap = { A: userAId, B: userBId };
  await conn.execute('INSERT INTO users (id,name,email,password,role) VALUES (?,?,?,?,?)',
    [adminId, 'Super Admin', 'admin@sockms.com', await hash('admin123'), 'super_admin']);
  await conn.execute('INSERT INTO users (id,name,email,password,role,branch_id) VALUES (?,?,?,?,?,?)',
    [userAId, 'Alice Uwase', 'branch.a@sockms.com', await hash('branch123'), 'branch_user', branchAId]);
  await conn.execute('INSERT INTO users (id,name,email,password,role,branch_id) VALUES (?,?,?,?,?,?)',
    [userBId, 'Bob Nkusi',   'branch.b@sockms.com', await hash('branch123'), 'branch_user', branchBId]);
  console.log('✓ Users');

  // ── Products ─────────────────────────────────────────────────────────
  const productDefs = [
    { name: 'iPhone 15 Pro',        cat: 'Electronics', buy: 1200000, min: 1350000, alert: 3  },
    { name: 'Samsung TV 43"',       cat: 'Electronics', buy:  350000, min:  420000, alert: 2  },
    { name: 'Laptop Dell 15"',      cat: 'Electronics', buy:  800000, min:  950000, alert: 3  },
    { name: 'Coca-Cola 300ml',      cat: 'Beverages',   buy:     300, min:     450, alert: 50 },
    { name: 'Fanta Orange 500ml',   cat: 'Beverages',   buy:     400, min:     550, alert: 50 },
    { name: 'Mineral Water 1.5L',   cat: 'Beverages',   buy:     200, min:     350, alert: 100},
    { name: 'A4 Paper Ream',        cat: 'Stationery',  buy:    3500, min:    5000, alert: 20 },
    { name: 'Ballpoint Pen (Pack)', cat: 'Stationery',  buy:     800, min:    1300, alert: 30 },
    { name: "Men's T-Shirt",        cat: 'Clothing',    buy:    3000, min:    5500, alert: 10 },
    { name: 'Laundry Soap 1kg',     cat: 'Household',   buy:     900, min:    1300, alert: 20 },
  ];
  const pIds = {};
  for (const p of productDefs) {
    pIds[p.name] = uuid();
    await conn.execute(
      'INSERT INTO products (id,name,category_id,buying_price,min_selling_price,low_stock_alert,created_by) VALUES (?,?,?,?,?,?,?)',
      [pIds[p.name], p.name, catIds[p.cat], p.buy, p.min, p.alert, adminId],
    );
  }
  console.log('✓ Products');

  // ── Stock ─────────────────────────────────────────────────────────────
  const stockDef = {
    A: { 'iPhone 15 Pro':8, 'Samsung TV 43"':4, 'Laptop Dell 15"':6, 'Coca-Cola 300ml':500, 'Fanta Orange 500ml':400, 'Mineral Water 1.5L':600, 'A4 Paper Ream':100, 'Ballpoint Pen (Pack)':150, "Men's T-Shirt":80, 'Laundry Soap 1kg':120 },
    B: { 'iPhone 15 Pro':6, 'Samsung TV 43"':3, 'Laptop Dell 15"':5, 'Coca-Cola 300ml':600, 'Fanta Orange 500ml':500, 'Mineral Water 1.5L':800, 'A4 Paper Ream':120, 'Ballpoint Pen (Pack)':180, "Men's T-Shirt":100, 'Laundry Soap 1kg':150 },
  };
  for (const [br, items] of Object.entries(stockDef)) {
    for (const [name, qty] of Object.entries(items)) {
      await conn.execute('INSERT INTO branch_stock (id,branch_id,product_id,quantity) VALUES (?,?,?,?)',
        [uuid(), branchMap[br], pIds[name], qty]);
    }
  }
  console.log('✓ Stock');

  // ── Helper ────────────────────────────────────────────────────────────
  const pMap = Object.fromEntries(productDefs.map(p => [p.name, p]));

  async function insertSale(branch, user, name, qty, price, daysAgo) {
    const p = pMap[name];
    const revenue = (qty * price).toFixed(2);
    const profit  = ((price - p.buy) * qty).toFixed(2);
    await conn.execute(
      `INSERT INTO sales (id,branch_id,product_id,user_id,quantity,selling_price,buying_price,total_revenue,profit,sold_at)
       VALUES (?,?,?,?,?,?,?,?,?, DATE_SUB(CURDATE(), INTERVAL ? DAY))`,
      [uuid(), branchMap[branch], pIds[name], userMap[user], qty, price, p.buy, revenue, profit, daysAgo],
    );
  }

  // ── Sales — 5 weeks of data ────────────────────────────────────────────
  // [daysAgo, branch, user, product, qty, price]
  const salesData = [
    // ─── TODAY (day 0) ─────────────────────────────────────────────────
    [0,'A','A','Coca-Cola 300ml',      65, 450],
    [0,'A','A','Fanta Orange 500ml',   42, 550],
    [0,'A','A','Mineral Water 1.5L',  110, 350],
    [0,'A','A','iPhone 15 Pro',         1, 1380000],
    [0,'A','A','A4 Paper Ream',         6, 5000],
    [0,'B','B','Fanta Orange 500ml',   55, 550],
    [0,'B','B','Mineral Water 1.5L',   90, 350],
    [0,'B','B',"Men's T-Shirt",         5, 5500],
    [0,'B','B','Laptop Dell 15"',       1, 960000],
    [0,'B','B','Ballpoint Pen (Pack)', 18, 1300],

    // ─── YESTERDAY (day 1) ─────────────────────────────────────────────
    [1,'A','A','Coca-Cola 300ml',      50, 450],
    [1,'A','A','Fanta Orange 500ml',   35, 550],
    [1,'A','A','A4 Paper Ream',         8, 5000],
    [1,'A','A','Ballpoint Pen (Pack)', 22, 1300],
    [1,'B','B','Mineral Water 1.5L',  120, 350],
    [1,'B','B','Coca-Cola 300ml',      48, 450],
    [1,'B','B','Samsung TV 43"',        1, 420000],
    [1,'B','B','Laundry Soap 1kg',     12, 1300],

    // ─── DAY 2 ─────────────────────────────────────────────────────────
    [2,'A','A','Mineral Water 1.5L',   95, 350],
    [2,'A','A','Fanta Orange 500ml',   38, 550],
    [2,'A','A',"Men's T-Shirt",         4, 5500],
    [2,'A','A','A4 Paper Ream',         5, 5000],
    [2,'B','B','Coca-Cola 300ml',      72, 450],
    [2,'B','B','Fanta Orange 500ml',   48, 550],
    [2,'B','B','Ballpoint Pen (Pack)', 16, 1300],
    [2,'B','B','Laundry Soap 1kg',     14, 1300],

    // ─── DAY 3 ─────────────────────────────────────────────────────────
    [3,'A','A','Coca-Cola 300ml',      55, 450],
    [3,'A','A','Mineral Water 1.5L',   85, 350],
    [3,'A','A','Laptop Dell 15"',       1, 955000],
    [3,'A','A','Laundry Soap 1kg',      8, 1300],
    [3,'B','B','Fanta Orange 500ml',   62, 550],
    [3,'B','B','Mineral Water 1.5L',  105, 350],
    [3,'B','B','A4 Paper Ream',        10, 5000],
    [3,'B','B',"Men's T-Shirt",         7, 5500],

    // ─── WEEK 2 (days 7-11) ────────────────────────────────────────────
    [7,'A','A','Coca-Cola 300ml',      72, 450],
    [7,'A','A','Fanta Orange 500ml',   48, 550],
    [7,'A','A','iPhone 15 Pro',         1, 1380000],
    [7,'B','B','Mineral Water 1.5L',  155, 350],
    [7,'B','B','Fanta Orange 500ml',   62, 550],
    [7,'B','B','Laptop Dell 15"',       1, 960000],

    [8,'A','A','Mineral Water 1.5L',  105, 350],
    [8,'A','A','A4 Paper Ream',        11, 5000],
    [8,'A','A','Ballpoint Pen (Pack)', 26, 1300],
    [8,'A','A',"Men's T-Shirt",         4, 5500],
    [8,'B','B','Coca-Cola 300ml',      82, 450],
    [8,'B','B','Samsung TV 43"',        1, 420000],
    [8,'B','B','Laundry Soap 1kg',     16, 1300],
    [8,'B','B','A4 Paper Ream',         7, 5000],

    [9,'A','A','Coca-Cola 300ml',      58, 450],
    [9,'A','A','Fanta Orange 500ml',   42, 550],
    [9,'A','A','Laundry Soap 1kg',     11, 1300],
    [9,'B','B','Fanta Orange 500ml',   72, 550],
    [9,'B','B','Mineral Water 1.5L',  125, 350],
    [9,'B','B','A4 Paper Ream',        13, 5000],
    [9,'B','B',"Men's T-Shirt",         8, 5500],

    [10,'A','A','Mineral Water 1.5L',  88, 350],
    [10,'A','A',"Men's T-Shirt",         5, 5500],
    [10,'A','A','Ballpoint Pen (Pack)', 21, 1300],
    [10,'B','B','Coca-Cola 300ml',      64, 450],
    [10,'B','B','Fanta Orange 500ml',   47, 550],
    [10,'B','B','Ballpoint Pen (Pack)', 19, 1300],

    [11,'A','A','Coca-Cola 300ml',      68, 450],
    [11,'A','A','Fanta Orange 500ml',   37, 550],
    [11,'A','A','A4 Paper Ream',         7, 5000],
    [11,'B','B','Mineral Water 1.5L',  108, 350],
    [11,'B','B',"Men's T-Shirt",         9, 5500],
    [11,'B','B','Laundry Soap 1kg',     13, 1300],
    [11,'B','B','Laptop Dell 15"',       1, 960000],

    // ─── WEEK 3 (days 14-18) ───────────────────────────────────────────
    [14,'A','A','Coca-Cola 300ml',      82, 450],
    [14,'A','A','Fanta Orange 500ml',   52, 550],
    [14,'A','A','Samsung TV 43"',        1, 420000],
    [14,'A','A','A4 Paper Ream',         9, 5000],
    [14,'B','B','Mineral Water 1.5L',  162, 350],
    [14,'B','B','Fanta Orange 500ml',   67, 550],
    [14,'B','B','iPhone 15 Pro',         1, 1380000],

    [15,'A','A','Mineral Water 1.5L',  112, 350],
    [15,'A','A','A4 Paper Ream',        13, 5000],
    [15,'A','A','Ballpoint Pen (Pack)', 31, 1300],
    [15,'B','B','Coca-Cola 300ml',      92, 450],
    [15,'B','B','A4 Paper Ream',         9, 5000],
    [15,'B','B','Laundry Soap 1kg',     19, 1300],

    [16,'A','A','Coca-Cola 300ml',      62, 450],
    [16,'A','A','Fanta Orange 500ml',   47, 550],
    [16,'A','A',"Men's T-Shirt",         6, 5500],
    [16,'A','A','Laundry Soap 1kg',     10, 1300],
    [16,'B','B','Fanta Orange 500ml',   82, 550],
    [16,'B','B','Mineral Water 1.5L',  132, 350],
    [16,'B','B',"Men's T-Shirt",         6, 5500],
    [16,'B','B','Ballpoint Pen (Pack)', 21, 1300],

    [17,'A','A','Mineral Water 1.5L',   98, 350],
    [17,'A','A','Laptop Dell 15"',       1, 955000],
    [17,'A','A','Ballpoint Pen (Pack)', 23, 1300],
    [17,'B','B','Coca-Cola 300ml',      73, 450],
    [17,'B','B','Fanta Orange 500ml',   57, 550],
    [17,'B','B','A4 Paper Ream',        11, 5000],

    [18,'A','A','Coca-Cola 300ml',      72, 450],
    [18,'A','A','Fanta Orange 500ml',   42, 550],
    [18,'A','A','A4 Paper Ream',         8, 5000],
    [18,'A','A','Laundry Soap 1kg',      8, 1300],
    [18,'B','B','Mineral Water 1.5L',  115, 350],
    [18,'B','B',"Men's T-Shirt",         7, 5500],
    [18,'B','B','Laundry Soap 1kg',     16, 1300],

    // ─── WEEK 4 (days 21-25) ───────────────────────────────────────────
    [21,'A','A','Coca-Cola 300ml',      78, 450],
    [21,'A','A','Fanta Orange 500ml',   52, 550],
    [21,'A','A','iPhone 15 Pro',         1, 1380000],
    [21,'A','A','A4 Paper Ream',         7, 5000],
    [21,'B','B','Mineral Water 1.5L',  145, 350],
    [21,'B','B','Fanta Orange 500ml',   72, 550],
    [21,'B','B','Laptop Dell 15"',       1, 960000],

    [22,'A','A','Mineral Water 1.5L',  102, 350],
    [22,'A','A','A4 Paper Ream',        11, 5000],
    [22,'A','A','Ballpoint Pen (Pack)', 26, 1300],
    [22,'A','A',"Men's T-Shirt",         4, 5500],
    [22,'B','B','Coca-Cola 300ml',      87, 450],
    [22,'B','B','Samsung TV 43"',        1, 420000],
    [22,'B','B','A4 Paper Ream',         6, 5000],
    [22,'B','B','Laundry Soap 1kg',     14, 1300],

    [23,'A','A','Coca-Cola 300ml',      57, 450],
    [23,'A','A','Fanta Orange 500ml',   39, 550],
    [23,'A','A','Laundry Soap 1kg',      9, 1300],
    [23,'B','B','Fanta Orange 500ml',   67, 550],
    [23,'B','B','Mineral Water 1.5L',  122, 350],
    [23,'B','B',"Men's T-Shirt",         9, 5500],
    [23,'B','B','Ballpoint Pen (Pack)', 23, 1300],

    [24,'A','A','Mineral Water 1.5L',   87, 350],
    [24,'A','A',"Men's T-Shirt",         5, 5500],
    [24,'A','A','A4 Paper Ream',         8, 5000],
    [24,'B','B','Coca-Cola 300ml',      77, 450],
    [24,'B','B','Fanta Orange 500ml',   52, 550],
    [24,'B','B','Laundry Soap 1kg',     15, 1300],

    [25,'A','A','Coca-Cola 300ml',      67, 450],
    [25,'A','A','Fanta Orange 500ml',   43, 550],
    [25,'A','A','Ballpoint Pen (Pack)', 19, 1300],
    [25,'B','B','Mineral Water 1.5L',  108, 350],
    [25,'B','B',"Men's T-Shirt",         6, 5500],
    [25,'B','B','A4 Paper Ream',        10, 5000],

    // ─── WEEK 5 (days 28-32) ───────────────────────────────────────────
    [28,'A','A','Coca-Cola 300ml',      82, 450],
    [28,'A','A','Fanta Orange 500ml',   57, 550],
    [28,'A','A','Samsung TV 43"',        1, 420000],
    [28,'A','A','A4 Paper Ream',         8, 5000],
    [28,'B','B','Mineral Water 1.5L',  152, 350],
    [28,'B','B','Fanta Orange 500ml',   62, 550],
    [28,'B','B','iPhone 15 Pro',         1, 1380000],

    [29,'A','A','Mineral Water 1.5L',  103, 350],
    [29,'A','A','A4 Paper Ream',        12, 5000],
    [29,'A','A',"Men's T-Shirt",         5, 5500],
    [29,'B','B','Coca-Cola 300ml',      92, 450],
    [29,'B','B','A4 Paper Ream',         7, 5000],
    [29,'B','B','Ballpoint Pen (Pack)', 26, 1300],
    [29,'B','B','Laundry Soap 1kg',     17, 1300],

    [30,'A','A','Coca-Cola 300ml',      62, 450],
    [30,'A','A','Fanta Orange 500ml',   41, 550],
    [30,'A','A','Laundry Soap 1kg',     10, 1300],
    [30,'B','B','Fanta Orange 500ml',   77, 550],
    [30,'B','B','Mineral Water 1.5L',  128, 350],
    [30,'B','B',"Men's T-Shirt",         6, 5500],

    [31,'A','A','Mineral Water 1.5L',   92, 350],
    [31,'A','A','Laptop Dell 15"',       1, 955000],
    [31,'A','A','Ballpoint Pen (Pack)', 21, 1300],
    [31,'B','B','Coca-Cola 300ml',      67, 450],
    [31,'B','B','Fanta Orange 500ml',   50, 550],
    [31,'B','B','Samsung TV 43"',        1, 420000],

    [32,'A','A','Coca-Cola 300ml',      72, 450],
    [32,'A','A','Fanta Orange 500ml',   46, 550],
    [32,'A','A','A4 Paper Ream',         7, 5000],
    [32,'B','B','Mineral Water 1.5L',  102, 350],
    [32,'B','B',"Men's T-Shirt",         8, 5500],
    [32,'B','B','Laundry Soap 1kg',     13, 1300],
  ];

  for (const [d, br, u, name, qty, price] of salesData) {
    await insertSale(br, u, name, qty, price, d);
  }
  console.log(`✓ Sales (${salesData.length} records)`);

  // ── Expenses ─────────────────────────────────────────────────────────
  // [daysAgo, branch, user, title, amount]
  const expenseData = [
    // This week
    [1, 'A', 'A', 'Electricity',  45000],
    [2, 'A', 'A', 'Transport',    15000],
    [2, 'B', 'B', 'Electricity',  38000],
    [0, 'B', 'B', 'Cleaning',      6000],
    // Week 2
    [7,  'A', 'A', 'Transport',   15000],
    [7,  'B', 'B', 'Rent',       200000],
    [8,  'A', 'A', 'Electricity', 45000],
    [9,  'B', 'B', 'Electricity', 38000],
    [10, 'A', 'A', 'Cleaning',     8000],
    // Week 3
    [14, 'A', 'A', 'Electricity', 45000],
    [14, 'B', 'B', 'Rent',       200000],
    [16, 'A', 'A', 'Cleaning',    5000],
    [16, 'B', 'B', 'Electricity', 38000],
    [17, 'A', 'A', 'Transport',   12000],
    // Week 4
    [21, 'A', 'A', 'Electricity', 45000],
    [21, 'B', 'B', 'Rent',       200000],
    [22, 'A', 'A', 'Transport',   15000],
    [23, 'B', 'B', 'Electricity', 38000],
    [24, 'A', 'A', 'Cleaning',    8000],
    // Week 5
    [28, 'A', 'A', 'Electricity', 45000],
    [28, 'B', 'B', 'Rent',       200000],
    [30, 'A', 'A', 'Transport',   12000],
    [30, 'B', 'B', 'Electricity', 38000],
    [31, 'B', 'B', 'Cleaning',    6000],
  ];

  for (const [d, br, u, title, amount] of expenseData) {
    const date = new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
    await conn.execute(
      'INSERT INTO expenses (id,branch_id,user_id,title,amount,expense_date) VALUES (?,?,?,?,?,?)',
      [uuid(), branchMap[br], userMap[u], title, amount, date],
    );
  }
  console.log(`✓ Expenses (${expenseData.length} records)`);

  // ── Stock transfer sample ─────────────────────────────────────────────
  await conn.execute(
    `INSERT INTO stock_transfers (id,product_id,from_branch_id,to_branch_id,quantity,transferred_by,transferred_at)
     VALUES (?,?,?,?,?,?, DATE_SUB(NOW(), INTERVAL 5 DAY))`,
    [uuid(), pIds['Coca-Cola 300ml'], branchBId, branchAId, 100, adminId],
  );
  await conn.execute(
    `INSERT INTO stock_transfers (id,product_id,from_branch_id,to_branch_id,quantity,transferred_by,transferred_at)
     VALUES (?,?,?,?,?,?, DATE_SUB(NOW(), INTERVAL 12 DAY))`,
    [uuid(), pIds['A4 Paper Ream'], branchAId, branchBId, 30, adminId],
  );
  console.log('✓ Stock transfers');

  console.log('\n✅ Seed complete!\n');
  console.log('Login credentials:');
  console.log('  Super Admin : admin@sockms.com    / admin123');
  console.log('  Branch A    : branch.a@sockms.com / branch123');
  console.log('  Branch B    : branch.b@sockms.com / branch123');
  await conn.end();
}

seed().catch(err => { console.error(err.message); process.exit(1); });
