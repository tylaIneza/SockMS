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
  if (req.user?.role !== 'super_admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

const branchGuard = (req, res, next) => {
  if (req.user?.role === 'super_admin') return next();
  const bid = req.query.branch_id || req.body.branch_id || req.params.branch_id;
  if (bid && bid !== req.user.branch_id) {
    return res.status(403).json({ message: 'Access denied to this branch' });
  }
  if (req.user.role === 'branch_user') {
    req.query.branch_id = req.user.branch_id;
  }
  next();
};

module.exports = { auth, adminOnly, branchGuard };
