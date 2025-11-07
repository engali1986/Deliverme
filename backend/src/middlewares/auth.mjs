import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

// Middleware: expects Authorization: Bearer <token>
export default function authenticateToken(req, res, next) {
  try {
    const auth = req.headers.authorization || req.headers.Authorization;
    console.log("authenticateToken auth header:", auth);
    if (!auth || !auth.startsWith('Bearer ')) {
      console.warn('Missing or invalid Authorization header');
      return res.status(401).json({ message: 'Missing or invalid Authorization header' });
    }
    const token = auth.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ message: 'Server misconfigured (no JWT_SECRET)' });

    jwt.verify(token, secret, (err, payload) => {
      if (err) {
        return res.status(401).json({ message: 'Invalid token' });
      }
      // payload should include driver id (e.g. { id, role, ... })
      req.user = payload;
      next();
    });
  } catch (e) {
    console.error('authenticateToken error', e);
    return res.status(500).json({ message: 'Authentication error' });
  }
}