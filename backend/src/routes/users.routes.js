const router = require('express').Router();
const { v4: uuid } = require('uuid');
const bcrypt = require('bcryptjs');
const { many, one, run } = require('../config/db');
const { auth, adminOnly } = require('../middleware/auth');

router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const rows = await many(
      `SELECT u.id, u.name, u.phone, u.role, u.is_active, u.created_at,
              b.name AS branch_name, b.id AS branch_id
       FROM users u LEFT JOIN branches b ON b.id = u.branch_id
       ORDER BY u.created_at DESC`,
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { name, phone, password, role, branch_id } = req.body;
    if (!name || !phone || !password || !role) return res.status(400).json({ message: 'Name, phone, password and role are required' });
    const hashed = await bcrypt.hash(password, 10);
    const id = uuid();
    await run(
      'INSERT INTO users (id, name, phone, password, role, branch_id) VALUES (?,?,?,?,?,?)',
      [id, name, phone, hashed, role, branch_id || null],
    );
    res.status(201).json({ id, name, phone, role, branch_id });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Phone number already in use' });
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { name, phone, role, branch_id, is_active, password } = req.body;
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      await run(
        'UPDATE users SET name=?, phone=?, role=?, branch_id=?, is_active=?, password=? WHERE id=?',
        [name, phone, role, branch_id || null, is_active !== undefined ? is_active : 1, hashed, req.params.id],
      );
    } else {
      await run(
        'UPDATE users SET name=?, phone=?, role=?, branch_id=?, is_active=? WHERE id=?',
        [name, phone, role, branch_id || null, is_active !== undefined ? is_active : 1, req.params.id],
      );
    }
    res.json(await one(
      `SELECT u.id, u.name, u.phone, u.role, u.is_active, b.name AS branch_name
       FROM users u LEFT JOIN branches b ON b.id = u.branch_id WHERE u.id = ?`,
      [req.params.id],
    ));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Phone number already in use' });
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ message: 'Cannot deactivate yourself' });
    await run('UPDATE users SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id/permanent', auth, adminOnly, async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ message: 'Cannot delete yourself' });
    await run('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ message: 'Cannot permanently delete: user has existing sales or expenses. Deactivate instead.' });
    }
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
