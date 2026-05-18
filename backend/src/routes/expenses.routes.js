const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { many, one, run } = require('../config/db');
const { auth, branchGuard } = require('../middleware/auth');
const { audit } = require('../utils/audit');

const isPrivileged = (role) => ['super_admin', 'manager'].includes(role);

router.get('/', auth, branchGuard, async (req, res) => {
  try {
    const { user_id, start_date, end_date } = req.query;
    let sql = `
      SELECT e.*, u.name AS user_name
      FROM expenses e
      JOIN users u ON u.id = e.user_id
      WHERE 1=1`;
    const params = [];
    if (user_id)    { sql += ' AND e.user_id = ?'; params.push(user_id); }
    if (start_date) { sql += ' AND e.expense_date >= ?'; params.push(start_date); }
    if (end_date)   { sql += ' AND e.expense_date <= ?'; params.push(end_date); }
    sql += ' ORDER BY e.expense_date DESC, e.created_at DESC';
    res.json(await many(sql, params));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { title, amount, expense_date, note } = req.body;
    if (!title || !amount || !expense_date) {
      return res.status(400).json({ message: 'Title, amount, and date required' });
    }
    // Admin/manager can create on behalf of any user; others own their own
    const userId = isPrivileged(req.user.role) && req.body.user_id
      ? req.body.user_id
      : req.user.id;
    const id = uuid();
    await run(
      'INSERT INTO expenses (id, user_id, title, amount, expense_date, note) VALUES (?,?,?,?,?,?)',
      [id, userId, title, amount, expense_date, note || null],
    );
    const created = await one(
      'SELECT e.*, u.name AS user_name FROM expenses e JOIN users u ON u.id = e.user_id WHERE e.id = ?',
      [id],
    );
    await audit(req.user, 'expense.create', 'expense', id, { title, amount, expense_date });
    res.status(201).json(created);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { title, amount, expense_date, note } = req.body;
    const expense = await one('SELECT * FROM expenses WHERE id = ?', [req.params.id]);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    if (!isPrivileged(req.user.role) && expense.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (req.user.role === 'branch_user') {
      await run(
        `UPDATE expenses SET approval_status = 'pending', pending_data = ? WHERE id = ?`,
        [JSON.stringify({ title, amount, expense_date, note: note || null }), req.params.id],
      );
      await audit(req.user, 'expense.update_pending', 'expense', req.params.id, { title, amount, expense_date });
      return res.json(await one('SELECT * FROM expenses WHERE id = ?', [req.params.id]));
    }

    await run(
      `UPDATE expenses SET title=?, amount=?, expense_date=?, note=?,
       approval_status='approved', pending_data=NULL WHERE id=?`,
      [title, amount, expense_date, note || null, req.params.id],
    );
    await audit(req.user, 'expense.update', 'expense', req.params.id, { title, amount, expense_date });
    res.json(await one('SELECT * FROM expenses WHERE id = ?', [req.params.id]));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/:id/approve', auth, async (req, res) => {
  try {
    if (req.user.role === 'branch_user') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const expense = await one('SELECT * FROM expenses WHERE id = ?', [req.params.id]);
    if (!expense) return res.status(404).json({ message: 'Not found' });
    if (!expense.pending_data) {
      return res.status(400).json({ message: 'No pending update to approve' });
    }
    const pd = JSON.parse(expense.pending_data);
    await run(
      `UPDATE expenses SET title=?, amount=?, expense_date=?, note=?,
       approval_status='approved', pending_data=NULL WHERE id=?`,
      [pd.title, pd.amount, pd.expense_date, pd.note || null, req.params.id],
    );
    await audit(req.user, 'expense.approve', 'expense', req.params.id, { approved_data: pd });
    res.json(await one('SELECT * FROM expenses WHERE id = ?', [req.params.id]));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/:id/reject', auth, async (req, res) => {
  try {
    if (req.user.role === 'branch_user') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const expense = await one('SELECT * FROM expenses WHERE id = ?', [req.params.id]);
    if (!expense) return res.status(404).json({ message: 'Not found' });
    await run(
      `UPDATE expenses SET approval_status='approved', pending_data=NULL WHERE id=?`,
      [req.params.id],
    );
    await audit(req.user, 'expense.reject', 'expense', req.params.id);
    res.json(await one('SELECT * FROM expenses WHERE id = ?', [req.params.id]));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    if (!isPrivileged(req.user.role)) {
      return res.status(403).json({ message: 'Only admin or manager can delete expenses' });
    }
    const expense = await one('SELECT * FROM expenses WHERE id = ?', [req.params.id]);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    await run('DELETE FROM expenses WHERE id = ?', [req.params.id]);
    await audit(req.user, 'expense.delete', 'expense', req.params.id, { title: expense.title, amount: expense.amount });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
