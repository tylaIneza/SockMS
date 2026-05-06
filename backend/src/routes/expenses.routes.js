const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { many, one, run } = require('../config/db');
const { auth, branchGuard } = require('../middleware/auth');

router.get('/', auth, branchGuard, async (req, res) => {
  try {
    const { branch_id, start_date, end_date } = req.query;
    let sql = `
      SELECT e.*, b.name AS branch_name, u.name AS added_by
      FROM expenses e
      JOIN branches b ON b.id = e.branch_id
      JOIN users u ON u.id = e.user_id
      WHERE 1=1`;
    const params = [];
    if (branch_id)  { sql += ' AND e.branch_id = ?'; params.push(branch_id); }
    if (start_date) { sql += ' AND e.expense_date >= ?'; params.push(start_date); }
    if (end_date)   { sql += ' AND e.expense_date <= ?'; params.push(end_date); }
    sql += ' ORDER BY e.expense_date DESC, e.created_at DESC';
    res.json(await many(sql, params));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { title, amount, expense_date, note } = req.body;
    const branch_id = req.user.role === 'branch_user' ? req.user.branch_id : req.body.branch_id;
    if (!title || !amount || !expense_date || !branch_id) {
      return res.status(400).json({ message: 'Title, amount, and date required' });
    }
    const id = uuid();
    await run(
      'INSERT INTO expenses (id, branch_id, user_id, title, amount, expense_date, note) VALUES (?,?,?,?,?,?,?)',
      [id, branch_id, req.user.id, title, amount, expense_date, note || null],
    );
    res.status(201).json(await one(
      `SELECT e.*, b.name AS branch_name FROM expenses e JOIN branches b ON b.id = e.branch_id WHERE e.id = ?`,
      [id],
    ));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { title, amount, expense_date, note } = req.body;
    const expense = await one('SELECT * FROM expenses WHERE id = ?', [req.params.id]);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    if (req.user.role !== 'super_admin' && expense.branch_id !== req.user.branch_id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    await run(
      'UPDATE expenses SET title=?, amount=?, expense_date=?, note=? WHERE id=?',
      [title, amount, expense_date, note || null, req.params.id],
    );
    res.json(await one('SELECT * FROM expenses WHERE id = ?', [req.params.id]));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const expense = await one('SELECT * FROM expenses WHERE id = ?', [req.params.id]);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    if (req.user.role !== 'super_admin' && expense.branch_id !== req.user.branch_id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    await run('DELETE FROM expenses WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
