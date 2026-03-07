import jwt from 'jsonwebtoken';
import db from '../db.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-for-jwt-signing';

export const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await db.queryOne('SELECT force_logout_at FROM users WHERE id = ?', [decoded.id]);
    if (user?.force_logout_at) {
      const logoutAt = new Date(user.force_logout_at).getTime() / 1000;
      const iat = decoded.iat ?? 0;
      if (logoutAt > iat) return res.status(401).json({ error: 'Session revoked. Please log in again.' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireAdmin = async (req: any, res: any, next: any) => {
  try {
    const user = await db.queryOne('SELECT role FROM users WHERE id = ?', [req.user.id]);
    if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    next();
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

export { JWT_SECRET };
