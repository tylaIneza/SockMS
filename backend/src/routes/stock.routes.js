const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { many, one, run, transaction } = require('../config/db');
const { auth, adminOnly } = require('../middleware/auth');

// Get stock per branch
router.get('/', auth, async (req, res) => {
  try {
    const branchId = req.user.role === 'branch_user' ? req.user.branch_id : req.query.branch_id;
    let sql = `
      SELECT bs.*, p.name AS product_name, p.buying_price, p.min_selling_price,
             p.low_stock_alert, c.name AS category_name, b.name AS branch_name
      FROM branch_stock bs
      JOIN products p ON p.id = bs.product_id
      JOIN branches b ON b.id = bs.branch_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.is_active = 1`;
    const params = [];
    if (branchId) { sql += ' AND bs.branch_id = ?'; params.push(branchId); }
    sql += ' ORDER BY p.name';
    res.json(await many(sql, params));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Add stock to a branch
router.post('/add', auth, adminOnly, async (req, res) => {
  try {
    const { branch_id, product_id, quantity } = req.body;
    if (!branch_id || !product_id || !quantity || quantity <= 0) {
      return res.status(400).json({ message: 'branch_id, product_id, and quantity > 0 required' });
    }
    const existing = await one(
      'SELECT id FROM branch_stock WHERE branch_id=? AND product_id=?',
      [branch_id, product_id],
    );
    if (existing) {
      await run(
        'UPDATE branch_stock SET quantity = quantity + ? WHERE branch_id=? AND product_id=?',
        [quantity, branch_id, product_id],
      );
    } else {
      await run(
        'INSERT INTO branch_stock (id, branch_id, product_id, quantity) VALUES (?,?,?,?)',
        [uuid(), branch_id, product_id, quantity],
      );
    }
    res.json({ success: true, message: `Added ${quantity} units` });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Transfer stock between branches
router.post('/transfer', auth, adminOnly, async (req, res) => {
  try {
    const { product_id, from_branch_id, to_branch_id, quantity, note } = req.body;
    if (!product_id || !from_branch_id || !to_branch_id || !quantity || quantity <= 0) {
      return res.status(400).json({ message: 'All fields required' });
    }
    if (from_branch_id === to_branch_id) {
      return res.status(400).json({ message: 'Source and destination branches must differ' });
    }

    await transaction(async (conn) => {
      const [fromRows] = await conn.execute(
        'SELECT quantity FROM branch_stock WHERE branch_id=? AND product_id=?',
        [from_branch_id, product_id],
      );
      const fromStock = fromRows[0];
      if (!fromStock || fromStock.quantity < quantity) {
        throw new Error(`Insufficient stock. Available: ${fromStock?.quantity || 0}`);
      }

      await conn.execute(
        'UPDATE branch_stock SET quantity = quantity - ? WHERE branch_id=? AND product_id=?',
        [quantity, from_branch_id, product_id],
      );

      const [toRows] = await conn.execute(
        'SELECT id FROM branch_stock WHERE branch_id=? AND product_id=?',
        [to_branch_id, product_id],
      );
      if (toRows[0]) {
        await conn.execute(
          'UPDATE branch_stock SET quantity = quantity + ? WHERE branch_id=? AND product_id=?',
          [quantity, to_branch_id, product_id],
        );
      } else {
        await conn.execute(
          'INSERT INTO branch_stock (id, branch_id, product_id, quantity) VALUES (?,?,?,?)',
          [uuid(), to_branch_id, product_id, quantity],
        );
      }

      await conn.execute(
        `INSERT INTO stock_transfers (id, product_id, from_branch_id, to_branch_id, quantity, transferred_by, note)
         VALUES (?,?,?,?,?,?,?)`,
        [uuid(), product_id, from_branch_id, to_branch_id, quantity, req.user.id, note || null],
      );
    });

    res.json({ success: true, message: `Transferred ${quantity} units` });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Transfer history
router.get('/transfers', auth, adminOnly, async (req, res) => {
  try {
    const rows = await many(
      `SELECT st.*, p.name AS product_name,
              fb.name AS from_branch, tb.name AS to_branch,
              u.name AS transferred_by_name
       FROM stock_transfers st
       JOIN products p ON p.id = st.product_id
       JOIN branches fb ON fb.id = st.from_branch_id
       JOIN branches tb ON tb.id = st.to_branch_id
       JOIN users u ON u.id = st.transferred_by
       ORDER BY st.transferred_at DESC LIMIT 100`,
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
