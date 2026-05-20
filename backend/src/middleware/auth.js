const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  try {
    const token = header.slice(7);
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const adminOnly = (req, res, next) => {
  if (!['super_admin', 'manager'].includes(req.user?.role)) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

const superAdminOnly = (req, res, next) => {
  if (req.user?.role !== 'super_admin') {
    return res.status(403).json({ message: 'Super admin access required' });
  }
  next();
};

const managerOrAdmin = (req, res, next) => {
  if (!['super_admin', 'manager'].includes(req.user?.role)) {
    return res.status(403).json({ message: 'Manager or admin access required' });
  }
  next();
};

// manager and super_admin see all data; branch_user scoped to their own user_id
const branchGuard = (req, res, next) => {
  if (['super_admin', 'manager'].includes(req.user?.role)) return next();
  const uid = req.query.user_id;
  if (uid && uid !== req.user.id) {
    return res.status(403).json({ message: 'Access denied' });
  }
  req.query.user_id = req.user.id;
  next();
};

module.exports = { auth, adminOnly, superAdminOnly, managerOrAdmin, branchGuard };
