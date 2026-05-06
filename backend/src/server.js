require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const app = express();

app.use(cors({ origin: /^http:\/\/localhost:\d+$/, credentials: true }));
app.use(express.json());

app.use('/api/auth',       require('./routes/auth.routes'));
app.use('/api/categories', require('./routes/categories.routes'));
app.use('/api/branches',   require('./routes/branches.routes'));
app.use('/api/users',      require('./routes/users.routes'));
app.use('/api/products',   require('./routes/products.routes'));
app.use('/api/stock',      require('./routes/stock.routes'));
app.use('/api/sales',      require('./routes/sales.routes'));
app.use('/api/expenses',   require('./routes/expenses.routes'));
app.use('/api/reports',    require('./routes/reports.routes'));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`SockMS API running on port ${PORT}`));
