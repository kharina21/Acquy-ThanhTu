import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import 'dotenv/config';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware để xác thực JWT token và set req.user
 */
export const authenticate = async (req, res, next) => {
    try {
        // Lấy token từ header Authorization
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.split(' ')[1]) {
            return res.status(401).json({ message: 'Unauthorized: No token provided' });
        }

        const token = authHeader.split(' ')[1];

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);

        // Tìm user từ token
        const user = await User.findById(decoded.userId).select('-password');

        if (!user) {
            return res.status(401).json({ message: 'Unauthorized: User not found' });
        }

        // Set user vào request
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Unauthorized: Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Unauthorized: Token expired' });
        }
        return res.status(500).json({ message: 'Authentication error', error: error.message });
    }
};

/**
 * Xác thực tùy chọn - nếu có token hợp lệ thì set req.user, không thì tiếp tục (không lỗi)
 */
export const optionalAuthenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.split(' ')[1]) {
            return next();
        }
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');
        if (user) req.user = user;
        next();
    } catch {
        next();
    }
};
