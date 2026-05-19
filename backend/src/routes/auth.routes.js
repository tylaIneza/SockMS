const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const { one, run } = require('../config/db');
const { auth } = require('../middleware/auth');
const { audit } = require('../utils/audit');

// One-time setup: only works when no super_admin exists yet
router.post('/register', async (req, res) => {
  try {
    const existing = await one('SELECT id FROM users WHERE role = ?', ['super_admin']);
    if (existing) return res.status(403).json({ message: 'Setup already complete. Super admin already exists.' });

    const { name, phone, password } = req.body;
    if (!name || !phone || !password) return res.status(400).json({ message: 'Name, phone and password are required' });
    if (password.length < 4) return res.status(400).json({ message: 'Password must be at least 4 characters' });

    const taken = await one('SELECT id FROM users WHERE phone = ?', [phone]);
    if (taken) return res.status(409).json({ message: 'Phone number already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const id = uuid();
    await run(
      'INSERT INTO users (id, name, phone, password, role, is_active) VALUES (?, ?, ?, ?, ?, 1)',
      [id, name.trim(), phone.trim(), hashed, 'super_admin'],
    );
    const payload = { id, name: name.trim(), phone: phone.trim(), role: 'super_admin' };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    res.status(201).json({ token, user: payload });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ message: 'Phone number and password required' });

    const user = await one(
      'SELECT id, name, phone, role, password, is_active FROM users WHERE phone = ? AND is_active = 1',
      [phone],
    );
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const payload = { id: user.id, name: user.name, phone: user.phone, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    await audit(payload, 'user.login', 'user', user.id, { role: user.role });
    res.json({ token, user: payload });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/password', auth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ message: 'Current and new password required' });
    }
    if (new_password.length < 4) {
      return res.status(400).json({ message: 'New password must be at least 4 characters' });
    }
    const user = await one('SELECT id, password FROM users WHERE id = ?', [req.user.id]);
    const valid = await bcrypt.compare(current_password, user.password);
    if (!valid) return res.status(401).json({ message: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(new_password, 10);
    const { run } = require('../config/db');
    await run('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);
    await audit(req.user, 'user.password_change', 'user', req.user.id, {});
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/me', auth, async (req, res) => {
  try {
    const user = await one(
      'SELECT id, name, phone, role, is_active FROM users WHERE id = ?',
      [req.user.id],
    );
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
