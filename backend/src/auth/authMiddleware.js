const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');
const excelManager = require('../excel/excelManager');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = excelManager.users.find((u) => u.userId === decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found or account deactivated.' });
    }
    req.user = { userId: user.userId, username: user.username };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
}

module.exports = authMiddleware;
