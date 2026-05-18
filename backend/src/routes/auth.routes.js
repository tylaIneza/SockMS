const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { one } = require('../config/db');
const { auth } = require('../middleware/auth');
const { audit } = require('../utils/audit');

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
