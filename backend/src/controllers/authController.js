import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import Session from '../models/Session.js';
import EmailVerification from '../models/EmailVerification.js';
import { assignDefaultRole } from '../libs/rbacHelpers.js';
import { logAuthActivity, getClientIp, getUserAgent } from '../libs/activityLogger.js';
import { createVerificationCode, sendVerificationEmail } from '../libs/emailHelper.js';

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

        const user = await User.create({
            username,
            password: hashedPassword,
            email,
            firstName,
            lastName,
            phoneNumber,
            address,
        });
        //gán role mặc định cho user
        await assignDefaultRole(user);

        // Log activity
        await logAuthActivity({
            userId: user._id,
            action: 'register',
            description: `User ${username} đã đăng ký thành công`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'success',
        });

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
        await Session.create({
            userId: user._id,
            refreshToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });

        //lưu refresh token vào cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true, //chỉ server có thể đọc cookie
            sameSite: 'strict', //chỉ chấp nhận cookie từ cùng một domain
            maxAge: 7 * 24 * 60 * 60 * 1000, //thời gian tồn tại của cookie
            secure: process.env.NODE_ENV === 'production', //chỉ gửi cookie trên https trong production
        });

        // Log activity
        await logAuthActivity({
            userId: user._id,
            action: 'login',
            description: `User ${user.username} đã đăng nhập thành công`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'success',
        });

        return res
            .status(200)
            .json({ message: `user ${user.username} đã đăng nhập thành công`, accessToken });
    } catch (error) {
        console.log('Lỗi khi gọi login: ' + error.message);

        // Log failed login attempt
        const failedUser = await User.findOne({ username: req.body.username });
        if (failedUser) {
            await logAuthActivity({
                userId: failedUser._id,
                action: 'login',
                description: `Đăng nhập thất bại cho user ${req.body.username}`,
                ipAddress: getClientIp(req),
                userAgent: getUserAgent(req),
                status: 'failed',
                errorMessage: error.message,
            });
        }

        res.status(500).json({ message: 'Lỗi khi gọi login', error: error.message });
    }
};

// Lấy thông tin user hiện tại (với roles)
export const getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password').populate({
            path: 'roles',
            select: 'name description',
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ user });
    } catch (error) {
        console.log('Lỗi khi lấy thông tin user: ' + error.message);
        res.status(500).json({ message: 'Lỗi khi lấy thông tin user', error: error.message });
    }
};

// Cập nhật thông tin profile
export const updateProfile = async (req, res) => {
    try {
        const { firstName, lastName, email, phoneNumber, address } = req.body;
        const userId = req.user._id;

        // Lấy thông tin user hiện tại để so sánh email
        const currentUser = await User.findById(userId);
        if (!currentUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Kiểm tra email có bị trùng với user khác không
        if (email) {
            const existingUser = await User.findOne({ email, _id: { $ne: userId } });
            if (existingUser) {
                return res.status(400).json({ message: 'Email đã được sử dụng bởi người dùng khác' });
            }
        }

        // Kiểm tra email có thay đổi không
        const emailChanged = email && email !== currentUser.email;

        // Chuẩn bị dữ liệu cập nhật
        const updateData = {
            firstName,
            lastName,
            email,
            phoneNumber,
            address,
        };

        // Nếu email thay đổi, set isVerified = false
        if (emailChanged) {
            updateData.isVerified = false;
        }

        // Cập nhật thông tin user
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        ).select('-password').populate({
            path: 'roles',
            select: 'name description',
        });

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Log activity
        try {
            const description = emailChanged
                ? `User ${updatedUser.username} đã cập nhật thông tin profile và thay đổi email (cần xác thực lại)`
                : `User ${updatedUser.username} đã cập nhật thông tin profile`;

            await logAuthActivity({
                userId: updatedUser._id,
                action: 'update_profile',
                description,
                ipAddress: getClientIp(req),
                userAgent: getUserAgent(req),
                status: 'success',
            });
        } catch (logError) {
            console.log('Lỗi khi log activity: ' + logError.message);
        }

        const message = emailChanged
            ? 'Cập nhật thông tin thành công. Email đã thay đổi, vui lòng xác thực email mới.'
            : 'Cập nhật thông tin thành công';

        res.status(200).json({ message, user: updatedUser });
    } catch (error) {
        console.log('Lỗi khi cập nhật profile: ' + error.message);

        // Log failed update
        await logAuthActivity({
            userId: req.user._id,
            action: 'update_profile',
            description: `Cập nhật profile thất bại cho user ${req.user.username}`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'failed',
            errorMessage: error.message,
        });

        res.status(500).json({ message: 'Lỗi khi cập nhật profile', error: error.message });
    }
};

// Gửi mã xác thực email
export const sendVerificationCode = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.isVerified) {
            return res.status(400).json({ message: 'Email đã được xác thực' });
        }

        // Tạo và lưu mã xác thực
        const verification = await createVerificationCode(user._id, user.email);

        // Gửi email
        await sendVerificationEmail(user.email, verification.code);

        // Log activity
        try {
            await logAuthActivity({
                userId: user._id,
                action: 'send_verification_email',
                description: `Gửi mã xác thực email cho ${user.email}`,
                ipAddress: getClientIp(req),
                userAgent: getUserAgent(req),
                status: 'success',
            });
        } catch (logError) {
            console.log('Lỗi khi log activity: ' + logError.message);
        }

        res.status(200).json({
            message: 'Mã xác thực đã được gửi đến email của bạn',
            expiresIn: 15 * 60, // 15 phút (giây)
        });
    } catch (error) {
        console.log('Lỗi khi gửi mã xác thực: ' + error.message);

        // Log failed
        try {
            await logAuthActivity({
                userId: req.user._id,
                action: 'send_verification_email',
                description: `Gửi mã xác thực email thất bại`,
                ipAddress: getClientIp(req),
                userAgent: getUserAgent(req),
                status: 'failed',
                errorMessage: error.message,
            });
        } catch (logError) {
            console.log('Lỗi khi log activity: ' + logError.message);
        }

        res.status(500).json({ message: 'Lỗi khi gửi mã xác thực', error: error.message });
    }
};

// Xác thực email với mã
export const verifyEmail = async (req, res) => {
    try {
        const { code } = req.body;
        const userId = req.user._id;

        if (!code) {
            return res.status(400).json({ message: 'Vui lòng nhập mã xác thực' });
        }

        // Tìm mã xác thực
        const verification = await EmailVerification.findOne({
            userId,
            code,
            isUsed: false,
        });

        if (!verification) {
            return res.status(400).json({ message: 'Mã xác thực không hợp lệ hoặc đã được sử dụng' });
        }

        // Kiểm tra mã đã hết hạn chưa
        if (verification.expiresAt < new Date()) {
            return res.status(400).json({ message: 'Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới' });
        }

        // Cập nhật user thành đã xác thực
        const user = await User.findByIdAndUpdate(
            userId,
            { isVerified: true },
            { new: true }
        ).select('-password').populate({
            path: 'roles',
            select: 'name description',
        });

        // Đánh dấu mã đã được sử dụng
        verification.isUsed = true;
        await verification.save();

        // Xóa tất cả các mã xác thực cũ của user này
        await EmailVerification.deleteMany({
            userId,
            isUsed: false,
        });

        // Log activity
        try {
            await logAuthActivity({
                userId: user._id,
                action: 'verify_email',
                description: `Xác thực email thành công cho ${user.email}`,
                ipAddress: getClientIp(req),
                userAgent: getUserAgent(req),
                status: 'success',
            });
        } catch (logError) {
            console.log('Lỗi khi log activity: ' + logError.message);
        }

        res.status(200).json({
            message: 'Xác thực email thành công',
            user,
        });
    } catch (error) {
        console.log('Lỗi khi xác thực email: ' + error.message);

        // Log failed
        try {
            await logAuthActivity({
                userId: req.user._id,
                action: 'verify_email',
                description: `Xác thực email thất bại`,
                ipAddress: getClientIp(req),
                userAgent: getUserAgent(req),
                status: 'failed',
                errorMessage: error.message,
            });
        } catch (logError) {
            console.log('Lỗi khi log activity: ' + logError.message);
        }

        res.status(500).json({ message: 'Lỗi khi xác thực email', error: error.message });
    }
};

export const logout = async (req, res) => {
    try {
        const { refreshToken } = req.cookies;
        if (!refreshToken) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const session = await Session.findOne({ refreshToken });
        if (!session) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        await Session.findOneAndDelete({ refreshToken });
        res.clearCookie('refreshToken');
        res.status(200).json({ message: 'Đăng xuất thành công' });
        await logAuthActivity({
            userId: req.user._id,
            action: 'logout',
            description: `User ${req.user.username} đã đăng xuất thành công`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'success',
        });
    } catch (error) {
        console.log('Lỗi khi gọi logout: ' + error.message);
        res.status(500).json({ message: 'Lỗi khi gọi logout', error: error.message });
    }
};

export const refreshToken = async (req, res) => {
    try {
        //lấy refresh token từ cookie
        const token = req.cookies?.refreshToken;
        if (!token) {
            return res.status(401).json({ message: 'Token không tồn tại!' });
        }

        //so với refresh token trong db
        const session = await Session.findOne({ refreshToken: token });
        if (!session)
            return res
                .status(403)
                .json({ message: 'Token không hợp lệ hoặc đã hết hạn' });

        //kiểm tra hết hạn hay chưa
        if (session.expiresAt < new Date())
            return res.status(403).json({ message: 'Token đã hết hạn' });

        //taọ access token mới
        const accessToken = generateAccessToken(session.userId);
        //return
        return res.status(200).json({ accessToken });
    } catch (e) {
        return res.status(500).json({ message: e });
    }
}