const router = require('express').Router();
const { many } = require('../config/db');
const { auth, adminOnly } = require('../middleware/auth');

router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 200, 1000);
    const rows = await many(
      'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?',
      [limit],
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
