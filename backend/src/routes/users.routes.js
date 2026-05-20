const router = require('express').Router();
const { v4: uuid } = require('uuid');
const bcrypt = require('bcryptjs');
const { many, one, run } = require('../config/db');
const { auth, adminOnly, superAdminOnly } = require('../middleware/auth');
const { audit } = require('../utils/audit');

router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const rows = await many(
      'SELECT id, name, phone, role, is_active, created_at FROM users ORDER BY created_at DESC',
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', auth, superAdminOnly, async (req, res) => {
  try {
    const { name, phone, password, role } = req.body;
    if (!name || !phone || !password || !role) return res.status(400).json({ message: 'Name, phone, password and role are required' });
    if (!['super_admin', 'manager', 'branch_user'].includes(role)) return res.status(400).json({ message: 'Invalid role' });
    const hashed = await bcrypt.hash(password, 10);
    const id = uuid();
    await run('INSERT INTO users (id, name, phone, password, role) VALUES (?,?,?,?,?)', [id, name, phone, hashed, role]);
    await audit(req.user, 'user.create', 'user', id, { name, phone, role });
    res.status(201).json({ id, name, phone, role });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Phone number already in use' });
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, superAdminOnly, async (req, res) => {
  try {
    const { name, phone, role, is_active, password } = req.body;
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      await run('UPDATE users SET name=?, phone=?, role=?, is_active=?, password=? WHERE id=?',
        [name, phone, role, is_active !== undefined ? is_active : 1, hashed, req.params.id]);
    } else {
      await run('UPDATE users SET name=?, phone=?, role=?, is_active=? WHERE id=?',
        [name, phone, role, is_active !== undefined ? is_active : 1, req.params.id]);
    }
    await audit(req.user, 'user.update', 'user', req.params.id, { name, phone, role, is_active });
    res.json(await one('SELECT id, name, phone, role, is_active FROM users WHERE id = ?', [req.params.id]));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Phone number already in use' });
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, superAdminOnly, async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ message: 'Cannot deactivate yourself' });
    const target = await one('SELECT name FROM users WHERE id = ?', [req.params.id]);
    await run('UPDATE users SET is_active = 0 WHERE id = ?', [req.params.id]);
    await audit(req.user, 'user.deactivate', 'user', req.params.id, { name: target?.name });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id/permanent', auth, superAdminOnly, async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ message: 'Cannot delete yourself' });
    const target = await one('SELECT name FROM users WHERE id = ?', [req.params.id]);
    await run('DELETE FROM users WHERE id = ?', [req.params.id]);
    await audit(req.user, 'user.delete', 'user', req.params.id, { name: target?.name });
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ message: 'Cannot permanently delete: user has existing sales or expenses. Deactivate instead.' });
    }
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
