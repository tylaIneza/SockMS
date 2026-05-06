const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { many, one, run, transaction } = require('../config/db');
const { auth, branchGuard } = require('../middleware/auth');

router.get('/', auth, branchGuard, async (req, res) => {
  try {
    const { branch_id, start_date, end_date, limit = 100 } = req.query;
    let sql = `
      SELECT s.*, p.name AS product_name, b.name AS branch_name, u.name AS sold_by_name,
             c.name AS category_name
      FROM sales s
      JOIN products p ON p.id = s.product_id
      JOIN branches b ON b.id = s.branch_id
      JOIN users u ON u.id = s.user_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE 1=1`;
    const params = [];
    if (branch_id)  { sql += ' AND s.branch_id = ?'; params.push(branch_id); }
    if (start_date) { sql += ' AND DATE(s.sold_at) >= ?'; params.push(start_date); }
    if (end_date)   { sql += ' AND DATE(s.sold_at) <= ?'; params.push(end_date); }
    sql += ` ORDER BY s.sold_at DESC LIMIT ${parseInt(limit)}`;
    res.json(await many(sql, params));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { product_id, quantity, selling_price, note } = req.body;
    const branch_id = req.user.role === 'branch_user' ? req.user.branch_id : req.body.branch_id;

    if (!product_id || !quantity || !selling_price || !branch_id) {
      return res.status(400).json({ message: 'product_id, quantity, selling_price required' });
    }
    if (quantity <= 0) return res.status(400).json({ message: 'Quantity must be > 0' });

    const product = await one('SELECT * FROM products WHERE id = ? AND is_active = 1', [product_id]);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (parseFloat(selling_price) < parseFloat(product.min_selling_price)) {
      return res.status(400).json({
        message: `Selling price must be at least ${product.min_selling_price} (minimum set by admin)`,
      });
    }

    const sale = await transaction(async (conn) => {
      const [[stock]] = await conn.execute(
        'SELECT quantity FROM branch_stock WHERE branch_id=? AND product_id=?',
        [branch_id, product_id],
      );
      if (!stock || stock.quantity < quantity) {
        throw new Error(`Insufficient stock. Available: ${stock?.quantity || 0}`);
      }

      await conn.execute(
        'UPDATE branch_stock SET quantity = quantity - ? WHERE branch_id=? AND product_id=?',
        [quantity, branch_id, product_id],
      );

      const total_revenue = (parseFloat(selling_price) * quantity).toFixed(2);
      const profit = ((parseFloat(selling_price) - parseFloat(product.buying_price)) * quantity).toFixed(2);
      const saleId = uuid();

      await conn.execute(
        `INSERT INTO sales (id, branch_id, product_id, user_id, quantity, selling_price,
                            buying_price, total_revenue, profit, note)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [saleId, branch_id, product_id, req.user.id, quantity, selling_price,
         product.buying_price, total_revenue, profit, note || null],
      );

      return { id: saleId, total_revenue, profit };
    });

    res.status(201).json(sale);
  } catch (err) {
    const status = err.message.includes('Insufficient') ? 400 : 500;
    res.status(status).json({ message: err.message });
  }
});

module.exports = router;
