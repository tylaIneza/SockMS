const router = require('express').Router();
const { many, one } = require('../config/db');
const { auth, branchGuard } = require('../middleware/auth');

// ── Dashboard stats ───────────────────────────────────────────────────
router.get('/dashboard', auth, async (req, res) => {
  try {
    const branchId = req.user.role === 'branch_user' ? req.user.branch_id : req.query.branch_id;
    const bFilter  = branchId ? 'AND s.branch_id = ?' : '';
    const eFilter  = branchId ? 'AND e.branch_id = ?' : '';
    const bp       = branchId ? [branchId] : [];

    const todaySales = await one(
      `SELECT COALESCE(SUM(total_revenue),0) AS revenue,
              COALESCE(SUM(profit),0) AS profit,
              COUNT(*) AS sales_count
       FROM sales s WHERE DATE(s.sold_at) = CURDATE() ${bFilter}`, bp);

    const weekSales = await one(
      `SELECT COALESCE(SUM(total_revenue),0) AS revenue,
              COALESCE(SUM(profit),0) AS profit
       FROM sales s WHERE YEARWEEK(s.sold_at,1)=YEARWEEK(CURDATE(),1) ${bFilter}`, bp);

    const weekExp = await one(
      `SELECT COALESCE(SUM(amount),0) AS total
       FROM expenses e WHERE YEARWEEK(e.expense_date,1)=YEARWEEK(CURDATE(),1) ${eFilter}`, bp);

    const allTime = await one(
      `SELECT COALESCE(SUM(total_revenue),0) AS revenue,
              COALESCE(SUM(profit),0) AS profit,
              COUNT(*) AS sales_count
       FROM sales s WHERE 1=1 ${bFilter}`, bp);

    const allExp = await one(
      `SELECT COALESCE(SUM(amount),0) AS total FROM expenses e WHERE 1=1 ${eFilter}`, bp);

    const topProducts = await many(
      `SELECT p.name, SUM(s.quantity) AS qty_sold, SUM(s.total_revenue) AS revenue
       FROM sales s JOIN products p ON p.id=s.product_id
       WHERE YEARWEEK(s.sold_at,1)=YEARWEEK(CURDATE(),1) ${bFilter}
       GROUP BY s.product_id ORDER BY qty_sold DESC LIMIT 5`, bp);

    const lowStock = await many(
      `SELECT p.name, p.low_stock_alert, bs.quantity, b.name AS branch_name
       FROM branch_stock bs
       JOIN products p ON p.id=bs.product_id
       JOIN branches b ON b.id=bs.branch_id
       WHERE bs.quantity <= p.low_stock_alert AND p.is_active=1
       ${branchId ? 'AND bs.branch_id=?' : ''}
       ORDER BY bs.quantity ASC LIMIT 20`,
      branchId ? [branchId] : []);

    const weeklyChart = await many(
      `SELECT YEARWEEK(s.sold_at,1) AS week,
              DATE_FORMAT(MIN(s.sold_at),'%d %b') AS week_label,
              SUM(s.total_revenue) AS revenue,
              SUM(s.profit) AS profit
       FROM sales s
       WHERE s.sold_at >= DATE_SUB(CURDATE(), INTERVAL 8 WEEK) ${bFilter}
       GROUP BY YEARWEEK(s.sold_at,1) ORDER BY week`, bp);

    let branchSummary = [];
    if (req.user.role === 'super_admin') {
      branchSummary = await many(
        `SELECT b.name AS branch_name,
                COALESCE(SUM(s.total_revenue),0) AS revenue,
                COALESCE(SUM(s.profit),0) AS profit,
                COUNT(s.id) AS sales_count
         FROM branches b
         LEFT JOIN sales s ON s.branch_id=b.id
         WHERE b.is_active=1
         GROUP BY b.id ORDER BY revenue DESC`);
    }

    res.json({
      today:          { revenue: todaySales?.revenue || 0, profit: todaySales?.profit || 0, sales_count: todaySales?.sales_count || 0 },
      this_week:      { revenue: weekSales?.revenue || 0, profit: weekSales?.profit || 0, expenses: weekExp?.total || 0 },
      all_time:       { revenue: allTime?.revenue || 0, profit: allTime?.profit || 0, expenses: allExp?.total || 0, sales_count: allTime?.sales_count || 0 },
      top_products:   topProducts,
      low_stock:      lowStock,
      weekly_chart:   weeklyChart,
      branch_summary: branchSummary,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Weekly report ─────────────────────────────────────────────────────
router.get('/weekly', auth, async (req, res) => {
  try {
    const branchId = req.user.role === 'branch_user' ? req.user.branch_id : req.query.branch_id;
    const weekOffset = parseInt(req.query.week_offset) || 0;

    // Calculate week start (Monday) and end (Sunday) for the offset
    const now = new Date();
    const day = now.getDay() === 0 ? 6 : now.getDay() - 1; // 0=Mon
    const monday = new Date(now);
    monday.setDate(now.getDate() - day - weekOffset * 7);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const sd = monday.toISOString().slice(0, 10);
    const ed = sunday.toISOString().slice(0, 10);

    const bFilter  = branchId ? 'AND s.branch_id=?' : '';
    const eFilter  = branchId ? 'AND e.branch_id=?' : '';
    const bp       = branchId ? [sd, ed, branchId] : [sd, ed];
    const ep       = branchId ? [sd, ed, branchId] : [sd, ed];

    const summary = await one(
      `SELECT COALESCE(SUM(total_revenue),0) AS revenue,
              COALESCE(SUM(profit),0) AS gross_profit,
              COUNT(*) AS sales_count
       FROM sales s WHERE DATE(sold_at) BETWEEN ? AND ? ${bFilter}`, bp);

    const expTotal = await one(
      `SELECT COALESCE(SUM(amount),0) AS total
       FROM expenses e WHERE expense_date BETWEEN ? AND ? ${eFilter}`, ep);

    const topProducts = await many(
      `SELECT p.name, SUM(s.quantity) AS qty_sold, SUM(s.total_revenue) AS revenue
       FROM sales s JOIN products p ON p.id=s.product_id
       WHERE DATE(s.sold_at) BETWEEN ? AND ? ${bFilter}
       GROUP BY s.product_id ORDER BY qty_sold DESC LIMIT 10`, bp);

    // Daily breakdown with expenses
    const daily = await many(
      `SELECT DATE(sold_at) AS date,
              DATE_FORMAT(DATE(sold_at), '%a %d') AS day_label,
              SUM(total_revenue) AS revenue,
              SUM(profit) AS profit,
              COUNT(*) AS sales_count
       FROM sales s WHERE DATE(sold_at) BETWEEN ? AND ? ${bFilter}
       GROUP BY DATE(sold_at) ORDER BY date`, bp);

    // Merge in expense data per day
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
        revenue: found?.revenue || 0,
        profit: found?.profit || 0,
        expenses: expMap[dateStr] || 0,
        sales_count: found?.sales_count || 0,
      });
    }

    const expenseBreakdown = await many(
      `SELECT e.title AS description, b.name AS branch_name, e.amount
       FROM expenses e
       JOIN branches b ON b.id=e.branch_id
       WHERE e.expense_date BETWEEN ? AND ? ${eFilter}
       ORDER BY e.amount DESC`, ep);

    const grossProfit = parseFloat(summary?.gross_profit || 0);
    const expenses    = parseFloat(expTotal?.total || 0);

    res.json({
      period:   { start: sd, end: ed },
      summary:  {
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

// ── Branch comparison (admin) ─────────────────────────────────────────
router.get('/branches', auth, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') return res.status(403).json({ message: 'Admin only' });

    const rows = await many(
      `SELECT b.id AS branch_id, b.name AS branch_name,
              COALESCE(SUM(s.total_revenue),0) AS revenue,
              COALESCE(SUM(s.profit),0) AS gross_profit,
              COUNT(s.id) AS sales_count,
              COALESCE((SELECT SUM(amount) FROM expenses e WHERE e.branch_id=b.id),0) AS expenses,
              (SELECT COUNT(*) FROM users u WHERE u.branch_id=b.id AND u.is_active=1) AS user_count
       FROM branches b
       LEFT JOIN sales s ON s.branch_id=b.id
       WHERE b.is_active=1
       GROUP BY b.id ORDER BY revenue DESC`);

    res.json(rows.map(r => ({
      ...r,
      net_profit: parseFloat(r.gross_profit) - parseFloat(r.expenses),
    })));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
