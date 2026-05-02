import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';
import User from '../models/User.js';

export async function protect(req, res, next) {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      if (user.status === 'suspended') {
        return res.status(403).json({ success: false, message: 'Your account has been suspended' });
      }

      req.user = user;
      req.userId = decoded.id;
      next();
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`,
      });
    }
    next();
  };
}

export function generateToken(userId) {
  return jwt.sign({ id: userId }, config.jwtSecret, {
    expiresIn: config.jwtExpire,
  });
}
