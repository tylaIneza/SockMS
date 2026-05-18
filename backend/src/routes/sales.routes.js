const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { many, one, run, transaction } = require('../config/db');
const { auth, branchGuard } = require('../middleware/auth');
const { audit } = require('../utils/audit');

router.get('/', auth, branchGuard, async (req, res) => {
  try {
    const { user_id, start_date, end_date, limit = 100 } = req.query;
    let sql = `
      SELECT s.*, p.name AS product_name, u.name AS sold_by_name,
             c.name AS category_name
      FROM sales s
      JOIN products p ON p.id = s.product_id
      JOIN users u ON u.id = s.user_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE 1=1`;
    const params = [];
    if (user_id)    { sql += ' AND s.user_id = ?'; params.push(user_id); }
    if (start_date) { sql += ' AND DATE(s.sold_at) >= ?'; params.push(start_date); }
    if (end_date)   { sql += ' AND DATE(s.sold_at) <= ?'; params.push(end_date); }
    sql += ` ORDER BY s.sold_at DESC LIMIT ${parseInt(limit)}`;
    res.json(await many(sql, params));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { product_id, quantity, selling_price, note } = req.body;

    if (!product_id || !quantity || !selling_price) {
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
        'SELECT quantity FROM product_stock WHERE product_id = ?',
        [product_id],
      );
      if (!stock || stock.quantity < quantity) {
        throw new Error(`Insufficient stock. Available: ${stock?.quantity || 0}`);
      }

      await conn.execute(
        'UPDATE product_stock SET quantity = quantity - ? WHERE product_id = ?',
        [quantity, product_id],
      );

      const total_revenue = (parseFloat(selling_price) * quantity).toFixed(2);
      const profit = ((parseFloat(selling_price) - parseFloat(product.buying_price)) * quantity).toFixed(2);
      const saleId = uuid();

      await conn.execute(
        `INSERT INTO sales (id, user_id, product_id, quantity, selling_price,
                            buying_price, total_revenue, profit, note)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [saleId, req.user.id, product_id, quantity, selling_price,
         product.buying_price, total_revenue, profit, note || null],
      );

      return { id: saleId, total_revenue, profit, product_name: product.name };
    });

    await audit(req.user, 'sale.create', 'sale', sale.id, {
      product: sale.product_name, quantity, selling_price, total_revenue: sale.total_revenue,
    });
    res.status(201).json(sale);
  } catch (err) {
    const status = err.message.includes('Insufficient') ? 400 : 500;
    res.status(status).json({ message: err.message });
  }
});

module.exports = router;
