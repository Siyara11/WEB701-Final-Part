// middleware/auth.js
// Protects routes with JSON Web Tokens (JWT).
// The client sends "Authorization: Bearer <token>". If the token is valid, the decoded
// payload { id, role } is attached to req.user so later handlers know who is calling.
const jwt = require('jsonwebtoken');

function auth(req, res, next) {
  const header = req.header('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Access denied: no token provided' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET); // throws if expired or tampered
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Role check used after auth(), e.g. requireRole('member')
function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: `Only ${role}s can perform this action` });
    }
    next();
  };
}

module.exports = auth;
module.exports.requireRole = requireRole;
