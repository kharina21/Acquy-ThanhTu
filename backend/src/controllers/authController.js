import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import Session from '../models/Session.js';
import { assignDefaultRole } from '../libs/rbacHelpers.js';

//jwt
const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN;
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN;

const generateAccessToken = (user) => {
    return jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
};

const generateRefreshToken = (user) => {
    return jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
};

//đăng ký cho user thường
export const registerUser = async (req, res) => {
    try {
        const { username, password, email, firstName, lastName, phoneNumber, address } = req.body;

        const existingUser = await User.findOne({ username }).select('-password');

        if (existingUser) {
            return res.status(400).json({ message: 'Username đã tồn tại' });
        }

        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({ message: 'Email đã tồn tại' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({ username, password: hashedPassword, email, firstName, lastName, phoneNumber, address });
        //gán role mặc định cho user
        await assignDefaultRole(user);

        res.status(201).json({ user });
    } catch (error) {
        console.log('Lỗi khi gọi register: ' + error.message);
        res.status(500).json({ message: 'Lỗi khi gọi register', error: error.message });
    }
};

export const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Vui lòng nhập username và password' });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: 'Tài khoản hoặc mật khẩu không chính xác' });
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(400).json({ message: 'Tài khoản hoặc mật khẩu không chính xác' });
        }

        //access token và refresh token
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        //lưu session vào database
        await Session.create({ userId: user._id, refreshToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });

        //lưu refresh token vào cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true, //chỉ server có thể đọc cookie
            sameSite: 'strict', //chỉ chấp nhận cookie từ cùng một domain
            maxAge: 7 * 24 * 60 * 60 * 1000, //thời gian tồn tại của cookie
            secure: process.env.NODE_ENV === 'production', //chỉ gửi cookie trên https trong production
        });

        return res.status(200).json({ message: `user ${user.username} đã đăng nhập thành công`, accessToken });
    } catch (error) {
        console.log('Lỗi khi gọi login: ' + error.message);
        res.status(500).json({ message: 'Lỗi khi gọi login', error: error.message });
    }
};
