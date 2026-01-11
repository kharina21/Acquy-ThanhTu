import jwt from 'jsonwebtoken';
import 'dotenv/config';
import User from '../models/User.js';
import '../models/Permission.js'; // Đăng ký Permission model để populate nested
import '../models/Role.js'; // Đăng ký Role model

const JWT_SECRET = process.env.JWT_SECRET;

export const ProtectedRoute = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const user = await User.findById(decoded.userId).select('-password').populate('roles', 'name isActive');
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        req.user = user;
        next();
    } catch (error) {
        console.log('Lỗi khi gọi authenticate:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống.', error: error.message });
    }
};
