const router = require('express').Router();
const { many, one } = require('../config/db');
const { auth } = require('../middleware/auth');

// ── Daily report (user comparison + products) ─────────────────────────
router.get('/daily', auth, async (req, res) => {
  try {
    if (!['super_admin','manager'].includes(req.user.role)) return res.status(403).json({ message: 'Admin only' });
    const date = req.query.date || new Date().toISOString().slice(0, 10);

    const users = await many(
      `SELECT u.id AS user_id, u.name AS user_name,
              COALESCE(SUM(s.total_revenue), 0) AS revenue,
              COALESCE(SUM(s.profit), 0) AS gross_profit,
              COUNT(s.id) AS sales_count,
              COALESCE(
                (SELECT SUM(e.amount) FROM expenses e WHERE e.user_id = u.id AND DATE(e.expense_date) = ?), 0
              ) AS expenses
       FROM users u
       LEFT JOIN sales s ON s.user_id = u.id AND DATE(s.sold_at) = ?
       WHERE u.is_active = 1 AND u.role = 'branch_user'
       GROUP BY u.id ORDER BY revenue DESC`,
      [date, date],
    );

    const usersWithNet = users.map(u => ({
      ...u,
      net_profit: parseFloat(u.gross_profit) - parseFloat(u.expenses),
    }));

    const products = await many(
      `SELECT p.name AS product_name, COALESCE(c.name, 'Uncategorized') AS category_name,
              u.name AS user_name,
              SUM(s.quantity) AS qty_sold,
              SUM(s.total_revenue) AS revenue,
              SUM(s.profit) AS profit
       FROM sales s
       JOIN products p ON p.id = s.product_id
       JOIN users u ON u.id = s.user_id
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE DATE(s.sold_at) = ?
       GROUP BY s.product_id, s.user_id
       ORDER BY p.name, u.name`,
      [date],
    );

    res.json({ date, users: usersWithNet, products });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Dashboard stats ───────────────────────────────────────────────────
router.get('/dashboard', auth, async (req, res) => {
  try {
    const userId = req.user.role === 'branch_user' ? req.user.id : req.query.user_id;
    const uFilter = userId ? 'AND s.user_id = ?' : '';
    const eFilter = userId ? 'AND e.user_id = ?' : '';
    const up      = userId ? [userId] : [];

    const todaySales = await one(
      `SELECT COALESCE(SUM(total_revenue),0) AS revenue,
              COALESCE(SUM(profit),0) AS profit,
              COUNT(*) AS sales_count
       FROM sales s WHERE DATE(s.sold_at) = CURDATE() ${uFilter}`, up);

    const weekSales = await one(
      `SELECT COALESCE(SUM(total_revenue),0) AS revenue,
              COALESCE(SUM(profit),0) AS profit
       FROM sales s WHERE YEARWEEK(s.sold_at,1)=YEARWEEK(CURDATE(),1) ${uFilter}`, up);

    const weekExp = await one(
      `SELECT COALESCE(SUM(amount),0) AS total
       FROM expenses e WHERE YEARWEEK(e.expense_date,1)=YEARWEEK(CURDATE(),1) ${eFilter}`, up);

    const allTime = await one(
      `SELECT COALESCE(SUM(total_revenue),0) AS revenue,
              COALESCE(SUM(profit),0) AS profit,
              COUNT(*) AS sales_count
       FROM sales s WHERE 1=1 ${uFilter}`, up);

    const allExp = await one(
      `SELECT COALESCE(SUM(amount),0) AS total FROM expenses e WHERE 1=1 ${eFilter}`, up);

    const topProducts = await many(
      `SELECT p.name, SUM(s.quantity) AS qty_sold, SUM(s.total_revenue) AS revenue
       FROM sales s JOIN products p ON p.id=s.product_id
       WHERE YEARWEEK(s.sold_at,1)=YEARWEEK(CURDATE(),1) ${uFilter}
       GROUP BY s.product_id ORDER BY qty_sold DESC LIMIT 5`, up);

    const lowStock = await many(
      `SELECT p.name, p.low_stock_alert, ps.quantity, c.name AS category_name
       FROM product_stock ps
       JOIN products p ON p.id=ps.product_id
       LEFT JOIN categories c ON c.id=p.category_id
       WHERE ps.quantity <= p.low_stock_alert AND p.is_active=1
       ORDER BY ps.quantity ASC LIMIT 20`,
      []);

    const weeklyChart = await many(
      `SELECT YEARWEEK(s.sold_at,1) AS week,
              DATE_FORMAT(MIN(s.sold_at),'%d %b') AS week_label,
              SUM(s.total_revenue) AS revenue,
              SUM(s.profit) AS profit
       FROM sales s
       WHERE s.sold_at >= DATE_SUB(CURDATE(), INTERVAL 8 WEEK) ${uFilter}
       GROUP BY YEARWEEK(s.sold_at,1) ORDER BY week`, up);

    let userSummary = [];
    if (['super_admin','manager'].includes(req.user.role)) {
      userSummary = await many(
        `SELECT u.name AS user_name,
                COALESCE(SUM(s.total_revenue),0) AS revenue,
                COALESCE(SUM(s.profit),0) AS profit,
                COUNT(s.id) AS sales_count
         FROM users u
         LEFT JOIN sales s ON s.user_id=u.id
         WHERE u.is_active=1 AND u.role = 'branch_user'
         GROUP BY u.id ORDER BY revenue DESC`);
    }

    res.json({
      today:        { revenue: todaySales?.revenue || 0, profit: todaySales?.profit || 0, sales_count: todaySales?.sales_count || 0 },
      this_week:    { revenue: weekSales?.revenue || 0, profit: weekSales?.profit || 0, expenses: weekExp?.total || 0 },
      all_time:     { revenue: allTime?.revenue || 0, profit: allTime?.profit || 0, expenses: allExp?.total || 0, sales_count: allTime?.sales_count || 0 },
      top_products: topProducts,
      low_stock:    lowStock,
      weekly_chart: weeklyChart,
      user_summary: userSummary,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Weekly report ─────────────────────────────────────────────────────
router.get('/weekly', auth, async (req, res) => {
  try {
    const userId = req.user.role === 'branch_user' ? req.user.id : req.query.user_id;
    const weekOffset = parseInt(req.query.week_offset) || 0;

    const now = new Date();
    const day = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - day - weekOffset * 7);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const sd = monday.toISOString().slice(0, 10);
    const ed = sunday.toISOString().slice(0, 10);

    const uFilter = userId ? 'AND s.user_id=?' : '';
    const eFilter = userId ? 'AND e.user_id=?' : '';
    const bp      = userId ? [sd, ed, userId] : [sd, ed];
    const ep      = userId ? [sd, ed, userId] : [sd, ed];

    const summary = await one(
      `SELECT COALESCE(SUM(total_revenue),0) AS revenue,
              COALESCE(SUM(profit),0) AS gross_profit,
              COUNT(*) AS sales_count
       FROM sales s WHERE DATE(sold_at) BETWEEN ? AND ? ${uFilter}`, bp);

    const expTotal = await one(
      `SELECT COALESCE(SUM(amount),0) AS total
       FROM expenses e WHERE expense_date BETWEEN ? AND ? ${eFilter}`, ep);

    const topProducts = await many(
      `SELECT p.name, SUM(s.quantity) AS qty_sold, SUM(s.total_revenue) AS revenue
       FROM sales s JOIN products p ON p.id=s.product_id
       WHERE DATE(s.sold_at) BETWEEN ? AND ? ${uFilter}
       GROUP BY s.product_id ORDER BY qty_sold DESC LIMIT 10`, bp);

    const daily = await many(
      `SELECT DATE(sold_at) AS date,
              DATE_FORMAT(DATE(sold_at), '%a %d') AS day_label,
              SUM(total_revenue) AS revenue,
              SUM(profit) AS profit,
              COUNT(*) AS sales_count
       FROM sales s WHERE DATE(sold_at) BETWEEN ? AND ? ${uFilter}
       GROUP BY DATE(sold_at) ORDER BY date`, bp);

    const dailyExp = await many(
      `SELECT expense_date AS date, SUM(amount) AS expenses
       FROM expenses e WHERE expense_date BETWEEN ? AND ? ${eFilter}
       GROUP BY expense_date`, ep);

    const expMap = Object.fromEntries(dailyExp.map(d => [d.date.toISOString ? d.date.toISOString().slice(0,10) : d.date, d.expenses]));
    const allDays = [];
    for (let d = new Date(monday); d <= sunday; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      const dayLabel = d.toLocaleDateString('en', { weekday: 'short', day: '2-digit' });
      const found = daily.find(r => {
        const rd = r.date instanceof Date ? r.date.toISOString().slice(0,10) : String(r.date).slice(0,10);
        return rd === dateStr;
      });
      allDays.push({
        date: dateStr,
        day_label: found?.day_label || dayLabel,
        revenue:     found?.revenue || 0,
        profit:      found?.profit  || 0,
        expenses:    expMap[dateStr] || 0,
        sales_count: found?.sales_count || 0,
      });
    }

    const expenseBreakdown = await many(
      `SELECT e.title AS description, u.name AS user_name, e.amount
       FROM expenses e
       JOIN users u ON u.id=e.user_id
       WHERE e.expense_date BETWEEN ? AND ? ${eFilter}
       ORDER BY e.amount DESC`, ep);

    const grossProfit = parseFloat(summary?.gross_profit || 0);
    const expenses    = parseFloat(expTotal?.total || 0);

    res.json({
      period:  { start: sd, end: ed },
      summary: {
        revenue:      parseFloat(summary?.revenue || 0),
        gross_profit: grossProfit,
        expenses,
        net_profit:   grossProfit - expenses,
        sales_count:  parseInt(summary?.sales_count || 0),
      },
      daily:             allDays,
      top_products:      topProducts,
      expense_breakdown: expenseBreakdown,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── User comparison (admin) ───────────────────────────────────────────
router.get('/users', auth, async (req, res) => {
  try {
    if (!['super_admin','manager'].includes(req.user.role)) return res.status(403).json({ message: 'Admin only' });

    const rows = await many(
      `SELECT u.id AS user_id, u.name AS user_name,
              COALESCE(SUM(s.total_revenue),0) AS revenue,
              COALESCE(SUM(s.profit),0) AS gross_profit,
              COUNT(s.id) AS sales_count,
              COALESCE((SELECT SUM(amount) FROM expenses e WHERE e.user_id=u.id),0) AS expenses
       FROM users u
       LEFT JOIN sales s ON s.user_id=u.id
       WHERE u.is_active=1 AND u.role = 'branch_user'
       GROUP BY u.id ORDER BY revenue DESC`);

    res.json(rows.map(r => ({
      ...r,
      net_profit: parseFloat(r.gross_profit) - parseFloat(r.expenses),
    })));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
