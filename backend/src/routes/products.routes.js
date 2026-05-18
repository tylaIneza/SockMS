const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { many, one, run } = require('../config/db');
const { auth, adminOnly } = require('../middleware/auth');

async function initProductStock(productId, quantity = 0) {
  const existing = await one('SELECT product_id FROM product_stock WHERE product_id = ?', [productId]);
  if (!existing) {
    await run('INSERT INTO product_stock (product_id, quantity) VALUES (?, ?)', [productId, quantity]);
  } else if (quantity > 0) {
    await run('UPDATE product_stock SET quantity = quantity + ? WHERE product_id = ?', [quantity, productId]);
  }
}

router.get('/', auth, async (req, res) => {
  try {
    const { search, category_id } = req.query;
    let sql = `
      SELECT p.*, c.name AS category_name,
             COALESCE(ps.quantity, 0) AS total_stock
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN product_stock ps ON ps.product_id = p.id
      WHERE p.is_active = 1`;
    const params = [];
    if (search)      { sql += ' AND p.name LIKE ?';        params.push(`%${search}%`); }
    if (category_id) { sql += ' AND p.category_id = ?';   params.push(category_id); }
    sql += ' GROUP BY p.id ORDER BY p.name';
    res.json(await many(sql, params));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/low-stock', auth, async (req, res) => {
  try {
    const rows = await many(
      `SELECT p.id, p.name, p.low_stock_alert, ps.quantity, c.name AS category_name
       FROM product_stock ps
       JOIN products p ON p.id = ps.product_id
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE ps.quantity <= p.low_stock_alert AND p.is_active = 1
       ORDER BY ps.quantity ASC`,
      [],
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { name, category_id, buying_price, min_selling_price, low_stock_alert } = req.body;
    if (!name || !buying_price || !min_selling_price) return res.status(400).json({ message: 'Name, buying price, and min selling price required' });
    if (parseFloat(min_selling_price) < parseFloat(buying_price)) {
      return res.status(400).json({ message: 'Min selling price must be >= buying price' });
    }
    const id = uuid();
    await run(
      `INSERT INTO products (id, name, category_id, buying_price, min_selling_price, low_stock_alert, created_by)
       VALUES (?,?,?,?,?,?,?)`,
      [id, name, category_id || null, buying_price, min_selling_price, low_stock_alert || 10, req.user.id],
    );
    await initProductStock(id);
    res.status(201).json(await one(
      'SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?',
      [id],
    ));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { name, category_id, buying_price, min_selling_price, low_stock_alert } = req.body;
    if (parseFloat(min_selling_price) < parseFloat(buying_price)) {
      return res.status(400).json({ message: 'Min selling price must be >= buying price' });
    }
    await run(
      `UPDATE products SET name=?, category_id=?, buying_price=?, min_selling_price=?, low_stock_alert=? WHERE id=?`,
      [name, category_id || null, buying_price, min_selling_price, low_stock_alert || 10, req.params.id],
    );
    res.json(await one(
      'SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?',
      [req.params.id],
    ));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Bulk import from Excel (parsed on frontend, sent as JSON array)
router.post('/import', auth, adminOnly, async (req, res) => {
  try {
    const { products } = req.body;
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: 'No products provided' });
    }

    let created = 0, skipped = 0;
    const errors = [];

    for (const p of products) {
      try {
        const name     = String(p.name || '').trim();
        const buyPrice = parseFloat(p.buying_price);
        const minPrice = parseFloat(p.min_selling_price);

        if (!name)              { errors.push({ name: name || '(empty)', reason: 'Name is required' }); continue; }
        if (isNaN(buyPrice))    { errors.push({ name, reason: 'Invalid buying price' }); continue; }
        if (isNaN(minPrice))    { errors.push({ name, reason: 'Invalid min selling price' }); continue; }
        if (minPrice < buyPrice){ errors.push({ name, reason: 'Min selling price must be ≥ buying price' }); continue; }

        // Skip duplicates
        const existing = await one('SELECT id FROM products WHERE LOWER(name) = LOWER(?) AND is_active = 1', [name]);
        if (existing) { skipped++; continue; }

        // Find or create category
        let categoryId = null;
        const catName = String(p.category || '').trim();
        if (catName) {
          const cat = await one('SELECT id FROM categories WHERE LOWER(name) = LOWER(?)', [catName]);
          if (cat) {
            categoryId = cat.id;
          } else {
            categoryId = uuid();
            await run('INSERT INTO categories (id, name) VALUES (?, ?)', [categoryId, catName]);
          }
        }

        const newId = uuid();
        await run(
          'INSERT INTO products (id, name, category_id, buying_price, min_selling_price, low_stock_alert, created_by) VALUES (?,?,?,?,?,?,?)',
          [newId, name, categoryId, buyPrice, minPrice, parseInt(p.low_stock_alert) || 10, req.user.id],
        );
        const initQty = parseInt(p.quantity) || 0;
        await initProductStock(newId, initQty);
        created++;
      } catch (rowErr) {
        errors.push({ name: String(p.name || ''), reason: rowErr.message });
      }
    }

    res.json({ created, skipped, errors, total: products.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await run('UPDATE products SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
