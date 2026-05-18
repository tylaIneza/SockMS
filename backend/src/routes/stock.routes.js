const router = require('express').Router();
const { many, one, run } = require('../config/db');
const { auth, adminOnly } = require('../middleware/auth');
const { audit } = require('../utils/audit');

// Global stock — shared by all branches
router.get('/', auth, async (req, res) => {
  try {
    const sql = `
      SELECT ps.product_id, ps.quantity,
             p.name AS product_name, p.buying_price, p.min_selling_price,
             p.low_stock_alert, c.name AS category_name
      FROM product_stock ps
      JOIN products p ON p.id = ps.product_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.is_active = 1
      ORDER BY p.name`;
    res.json(await many(sql, []));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Add stock to the shared pool
router.post('/add', auth, adminOnly, async (req, res) => {
  try {
    const { product_id, quantity } = req.body;
    if (!product_id || !quantity || quantity <= 0) {
      return res.status(400).json({ message: 'product_id and quantity > 0 required' });
    }
    const existing = await one('SELECT product_id FROM product_stock WHERE product_id = ?', [product_id]);
    if (existing) {
      await run('UPDATE product_stock SET quantity = quantity + ? WHERE product_id = ?', [quantity, product_id]);
    } else {
      await run('INSERT INTO product_stock (product_id, quantity) VALUES (?, ?)', [product_id, quantity]);
    }
    await audit(req.user, 'stock.add', 'stock', product_id, { product_id, quantity });
    res.json({ success: true, message: `Added ${quantity} units` });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
