const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { many, one, run } = require('../config/db');
const { auth, adminOnly } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const rows = await many(
      `SELECT b.*,
         COUNT(DISTINCT u.id) AS user_count,
         COALESCE(SUM(bs.quantity), 0) AS total_stock
       FROM branches b
       LEFT JOIN users u ON u.branch_id = b.id AND u.is_active = 1
       LEFT JOIN branch_stock bs ON bs.branch_id = b.id
       WHERE b.is_active = 1
       GROUP BY b.id ORDER BY b.name`,
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { name, location } = req.body;
    if (!name) return res.status(400).json({ message: 'Name required' });
    const id = uuid();
    await run('INSERT INTO branches (id, name, location) VALUES (?,?,?)', [id, name, location || null]);
    res.status(201).json(await one('SELECT * FROM branches WHERE id = ?', [id]));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { name, location, is_active } = req.body;
    await run(
      'UPDATE branches SET name=?, location=?, is_active=? WHERE id=?',
      [name, location || null, is_active !== undefined ? is_active : 1, req.params.id],
    );
    res.json(await one('SELECT * FROM branches WHERE id = ?', [req.params.id]));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await run('UPDATE branches SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
