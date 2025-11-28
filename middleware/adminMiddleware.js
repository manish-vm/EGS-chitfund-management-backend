module.exports = function requireAdmin(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const role = (req.user.role || '').toString().toLowerCase();
    const isAdminFlag = req.user.isAdmin || role === 'admin' || role === 'superadmin';

    if (!isAdminFlag) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    next();
  } catch (err) {
    console.error('requireAdmin middleware error', err);
    res.status(500).json({ message: 'Server error in admin middleware' });
  }
};