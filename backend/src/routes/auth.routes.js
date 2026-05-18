const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { one } = require('../config/db');
const { auth } = require('../middleware/auth');

router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ message: 'Phone number and password required' });

    const user = await one(
      `SELECT u.*, b.name AS branch_name FROM users u
       LEFT JOIN branches b ON b.id = u.branch_id
       WHERE u.phone = ? AND u.is_active = 1`,
      [phone],
    );
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const payload = {
      id: user.id, name: user.name, phone: user.phone,
      role: user.role, branch_id: user.branch_id, branch_name: user.branch_name,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    res.json({ token, user: payload });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/me', auth, async (req, res) => {
  try {
    const user = await one(
      `SELECT u.id, u.name, u.phone, u.role, u.branch_id, u.is_active,
              b.name AS branch_name, b.location AS branch_location
       FROM users u LEFT JOIN branches b ON b.id = u.branch_id
       WHERE u.id = ?`,
      [req.user.id],
    );
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
