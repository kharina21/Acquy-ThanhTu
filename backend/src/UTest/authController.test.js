// src/controllers/authController.test.js
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

// ===== 1. DÙNG vi.hoisted() ĐỂ KHAI BÁO MOCK — CŨNG ĐƯỢC HOIST LÊN ĐẦU =====
const {
  userModelMock,
  sessionModelMock,
  emailVerificationModelMock,
  passwordResetModelMock,
  bcryptMock,
  jwtMock,
  logAuthActivityMock,
  getClientIpMock,
  getUserAgentMock,
  createVerificationCodeMock,
  sendVerificationEmailMock,
  sendPasswordResetEmailMock,
  assignDefaultRoleMock,
} = vi.hoisted(() => {
  return {
    userModelMock: {
      findOne: vi.fn(),
      findById: vi.fn(),
      findByIdAndUpdate: vi.fn(),
      create: vi.fn(),
    },
    sessionModelMock: {
      create: vi.fn(),
      findOne: vi.fn(),
      findOneAndDelete: vi.fn(),
    },
    emailVerificationModelMock: {
      findOne: vi.fn(),
      deleteMany: vi.fn(),
    },
    passwordResetModelMock: {
      deleteMany: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      generateToken: vi.fn(),
    },
    bcryptMock: {
      compare: vi.fn(),
      hash: vi.fn(),
    },
    jwtMock: {
      sign: vi.fn(),
    },
    logAuthActivityMock: vi.fn(),
    getClientIpMock: vi.fn(() => '127.0.0.1'),
    getUserAgentMock: vi.fn(() => 'vitest-agent'),
    createVerificationCodeMock: vi.fn(),
    sendVerificationEmailMock: vi.fn(),
    sendPasswordResetEmailMock: vi.fn(),
    assignDefaultRoleMock: vi.fn(),
  };
});

// ===== 2. ĐĂNG KÝ vi.mock =====
vi.mock('../models/User.js', () => ({ default: userModelMock }));
vi.mock('../models/Session.js', () => ({ default: sessionModelMock }));
vi.mock('../models/EmailVerification.js', () => ({ default: emailVerificationModelMock }));
vi.mock('../models/PasswordReset.js', () => ({ default: passwordResetModelMock }));
vi.mock('bcryptjs', () => ({ default: bcryptMock }));
vi.mock('jsonwebtoken', () => ({ default: jwtMock }));
vi.mock('../libs/activityLogger.js', () => ({
  logAuthActivity: logAuthActivityMock,
  getClientIp: getClientIpMock,
  getUserAgent: getUserAgentMock,
}));
vi.mock('../libs/emailHelper.js', () => ({
  createVerificationCode: createVerificationCodeMock,
  sendVerificationEmail: sendVerificationEmailMock,
  sendPasswordResetEmail: sendPasswordResetEmailMock,
}));
vi.mock('../libs/rbacHelpers.js', () => ({
  assignDefaultRole: assignDefaultRoleMock,
}));

// ===== 3. SET ENV + IMPORT =====
beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret';
  process.env.ACCESS_TOKEN_EXPIRES_IN = '15m';
  process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';
  process.env.FRONTEND_URL = 'http://localhost:5173';
});

import {
  registerUser,
  login,
  getCurrentUser,
  updateProfile,
  sendVerificationCode,
  verifyEmail,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  changePassword,
} from '../controllers/authController.js';

// ===== 4. HELPER TẠO res GIẢ =====
const createMockRes = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn(),
  cookie: vi.fn(),
  clearCookie: vi.fn(),
});

// ===== 5. TEST =====
describe('authController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------- registerUser ----------
  describe('registerUser', () => {
    it('trả 400 nếu username đã tồn tại', async () => {
      const req = {
        body: { username: 'existing', password: '123456', email: 'test@example.com' },
      };
      const res = createMockRes();

      userModelMock.findOne.mockReturnValueOnce({
        select: vi.fn().mockResolvedValue({ _id: 'u1' }),
      });

      await registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Username đã tồn tại' });
    });

    it('trả 400 nếu email đã tồn tại', async () => {
      const req = {
        body: { username: 'newuser', password: '123456', email: 'dup@example.com' },
      };
      const res = createMockRes();

      userModelMock.findOne
        .mockReturnValueOnce({ select: vi.fn().mockResolvedValue(null) })
        .mockResolvedValueOnce({ _id: 'u2' });

      await registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Email đã tồn tại' });
    });

    it('đăng ký thành công', async () => {
      const req = {
        body: {
          username: 'newuser',
          password: '123456',
          email: 'new@example.com',
          firstName: 'A',
          lastName: 'B',
          phoneNumber: '0123',
          address: 'HN',
        },
      };
      const res = createMockRes();

      userModelMock.findOne
        .mockReturnValueOnce({ select: vi.fn().mockResolvedValue(null) })
        .mockResolvedValueOnce(null);

      bcryptMock.hash.mockResolvedValue('hashed-pass');
      const fakeUser = { _id: 'u1', username: 'newuser' };
      userModelMock.create.mockResolvedValue(fakeUser);
      assignDefaultRoleMock.mockResolvedValue(fakeUser);
      logAuthActivityMock.mockResolvedValue({});

      await registerUser(req, res);

      expect(bcryptMock.hash).toHaveBeenCalledWith('123456', 10);
      expect(userModelMock.create).toHaveBeenCalled();
      expect(assignDefaultRoleMock).toHaveBeenCalledWith(fakeUser);
      expect(logAuthActivityMock).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ user: fakeUser });
    });
  });

  // ---------- login ----------
  describe('login', () => {
    it('trả 400 nếu thiếu username hoặc password', async () => {
      const req = { body: { username: 'test' }, cookies: {}, headers: {} };
      const res = createMockRes();

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Vui lòng nhập username và password',
      });
    });

    it('trả 400 nếu user không tồn tại', async () => {
      const req = { body: { username: 'ghost', password: '123456' }, cookies: {}, headers: {} };
      const res = createMockRes();

      userModelMock.findOne.mockResolvedValue(null);

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Tài khoản hoặc mật khẩu không chính xác',
      });
    });

    it('trả 400 nếu mật khẩu sai', async () => {
      const req = { body: { username: 'test', password: 'wrong' }, cookies: {}, headers: {} };
      const res = createMockRes();

      userModelMock.findOne.mockResolvedValue({ _id: 'u1', username: 'test', password: 'hashed' });
      bcryptMock.compare.mockResolvedValue(false);

      await login(req, res);

      expect(bcryptMock.compare).toHaveBeenCalledWith('wrong', 'hashed');
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('login thành công', async () => {
      const req = { body: { username: 'test', password: '123456' }, cookies: {}, headers: {} };
      const res = createMockRes();

      userModelMock.findOne.mockResolvedValue({ _id: 'u1', username: 'test', password: 'hashed' });
      bcryptMock.compare.mockResolvedValue(true);
      jwtMock.sign.mockReturnValue('fake-token');
      sessionModelMock.create.mockResolvedValue({});
      logAuthActivityMock.mockResolvedValue({});

      await login(req, res);

      expect(sessionModelMock.create).toHaveBeenCalled();
      expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'fake-token', expect.any(Object));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'user test đã đăng nhập thành công',
        accessToken: 'fake-token',
      });
    });
  });

  // ---------- refreshToken ----------
  describe('refreshToken', () => {
    it('trả 401 nếu không có refreshToken trong cookie', async () => {
      const req = { cookies: {} };
      const res = createMockRes();

      await refreshToken(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Token không tồn tại!' });
    });

    it('trả 403 nếu session không tồn tại', async () => {
      const req = { cookies: { refreshToken: 'invalid' } };
      const res = createMockRes();

      sessionModelMock.findOne.mockResolvedValue(null);

      await refreshToken(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('trả 403 nếu session hết hạn', async () => {
      const req = { cookies: { refreshToken: 'rt1' } };
      const res = createMockRes();

      sessionModelMock.findOne.mockResolvedValue({
        userId: 'u1',
        expiresAt: new Date(Date.now() - 10000), // đã hết hạn
      });

      await refreshToken(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Token đã hết hạn' });
    });

    it('trả 200 với accessToken mới', async () => {
      const req = { cookies: { refreshToken: 'rt1' } };
      const res = createMockRes();

      sessionModelMock.findOne.mockResolvedValue({
        userId: 'u1',
        expiresAt: new Date(Date.now() + 100000),
      });
      jwtMock.sign.mockReturnValue('new-access');

      await refreshToken(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ accessToken: 'new-access' });
    });
  });

  // ---------- logout ----------
  describe('logout', () => {
    it('trả 401 nếu không có refreshToken', async () => {
      const req = { cookies: {} };
      const res = createMockRes();

      await logout(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('trả 401 nếu session không tồn tại', async () => {
      const req = { cookies: { refreshToken: 'rt1' } };
      const res = createMockRes();

      sessionModelMock.findOne.mockResolvedValue(null);

      await logout(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('logout thành công', async () => {
      const req = {
        cookies: { refreshToken: 'rt1' },
        user: { _id: 'u1', username: 'test' },
      };
      const res = createMockRes();

      sessionModelMock.findOne.mockResolvedValue({ _id: 's1' });
      sessionModelMock.findOneAndDelete.mockResolvedValue({});
      logAuthActivityMock.mockResolvedValue({});

      await logout(req, res);

      expect(sessionModelMock.findOneAndDelete).toHaveBeenCalledWith({ refreshToken: 'rt1' });
      expect(res.clearCookie).toHaveBeenCalledWith('refreshToken');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Đăng xuất thành công' });
    });
  });

  // ---------- getCurrentUser ----------
  describe('getCurrentUser', () => {
    it('trả 404 nếu user không tồn tại', async () => {
      const req = { user: { _id: 'u1' } };
      const res = createMockRes();

      userModelMock.findById.mockReturnValue({
        select: vi.fn().mockReturnValue({
          populate: vi.fn().mockResolvedValue(null),
        }),
      });

      await getCurrentUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('trả 200 với user data', async () => {
      const req = { user: { _id: 'u1' } };
      const res = createMockRes();
      const fakeUser = { _id: 'u1', username: 'test', roles: [] };

      userModelMock.findById.mockReturnValue({
        select: vi.fn().mockReturnValue({
          populate: vi.fn().mockResolvedValue(fakeUser),
        }),
      });

      await getCurrentUser(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ user: fakeUser });
    });
  });

  // ---------- updateProfile ----------
  describe('updateProfile', () => {
    it('trả 404 nếu user không tồn tại', async () => {
      const req = { user: { _id: 'u1' }, body: { firstName: 'A' } };
      const res = createMockRes();

      userModelMock.findById.mockResolvedValue(null);

      await updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('trả 400 nếu email trùng với user khác', async () => {
      const req = {
        user: { _id: 'u1', username: 'test' },
        body: { email: 'dup@example.com' },
      };
      const res = createMockRes();

      userModelMock.findById.mockResolvedValue({ _id: 'u1', email: 'old@example.com' });
      userModelMock.findOne.mockResolvedValue({ _id: 'u2' }); // email trùng user khác

      await updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Email đã được sử dụng bởi người dùng khác',
      });
    });

    it('cập nhật profile thành công', async () => {
      const req = {
        user: { _id: 'u1', username: 'test' },
        body: { firstName: 'New', lastName: 'Name' },
      };
      const res = createMockRes();

      userModelMock.findById.mockResolvedValue({ _id: 'u1', email: 'test@example.com' });
      userModelMock.findOne.mockResolvedValue(null); // email OK

      const updatedUser = { _id: 'u1', username: 'test', firstName: 'New' };
      userModelMock.findByIdAndUpdate.mockReturnValue({
        select: vi.fn().mockReturnValue({
          populate: vi.fn().mockResolvedValue(updatedUser),
        }),
      });
      logAuthActivityMock.mockResolvedValue({});

      await updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ user: updatedUser }),
      );
    });
  });

  // ---------- changePassword ----------
  describe('changePassword', () => {
    it('trả 400 nếu thiếu currentPassword hoặc newPassword', async () => {
      const req = { user: { _id: 'u1' }, body: { currentPassword: '123' } };
      const res = createMockRes();

      await changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Mật khẩu hiện tại và mật khẩu mới là bắt buộc',
      });
    });

    it('trả 400 nếu newPassword quá ngắn', async () => {
      const req = { user: { _id: 'u1' }, body: { currentPassword: 'old', newPassword: '12' } };
      const res = createMockRes();

      await changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Mật khẩu mới phải có ít nhất 6 ký tự',
      });
    });

    it('trả 400 nếu mật khẩu hiện tại sai', async () => {
      const req = {
        user: { _id: 'u1', username: 'test' },
        body: { currentPassword: 'wrong', newPassword: 'newPass123' },
      };
      const res = createMockRes();

      userModelMock.findById.mockResolvedValue({ _id: 'u1', password: 'hashed', username: 'test' });
      bcryptMock.compare.mockResolvedValue(false); // mật khẩu sai
      logAuthActivityMock.mockResolvedValue({});

      await changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Mật khẩu hiện tại không đúng' });
    });

    it('đổi mật khẩu thành công', async () => {
      const req = {
        user: { _id: 'u1', username: 'test' },
        body: { currentPassword: 'old', newPassword: 'newPass123' },
      };
      const res = createMockRes();

      userModelMock.findById.mockResolvedValue({ _id: 'u1', password: 'hashed-old', username: 'test' });
      bcryptMock.compare
        .mockResolvedValueOnce(true)   // currentPassword đúng
        .mockResolvedValueOnce(false); // newPassword khác mật khẩu cũ
      bcryptMock.hash.mockResolvedValue('hashed-new');
      userModelMock.findByIdAndUpdate.mockResolvedValue({});
      logAuthActivityMock.mockResolvedValue({});

      await changePassword(req, res);

      expect(bcryptMock.hash).toHaveBeenCalledWith('newPass123', 10);
      expect(userModelMock.findByIdAndUpdate).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Đổi mật khẩu thành công' });
    });
  });

  // ---------- sendVerificationCode ----------
  describe('sendVerificationCode', () => {
    it('trả 404 nếu user không tồn tại', async () => {
      const req = { user: { _id: 'u1' } };
      const res = createMockRes();

      userModelMock.findById.mockResolvedValue(null);

      await sendVerificationCode(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('trả 400 nếu email đã được xác thực', async () => {
      const req = { user: { _id: 'u1' } };
      const res = createMockRes();

      userModelMock.findById.mockResolvedValue({ _id: 'u1', isVerified: true });

      await sendVerificationCode(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Email đã được xác thực' });
    });

    it('gửi mã xác thực thành công', async () => {
      const req = { user: { _id: 'u1' } };
      const res = createMockRes();

      userModelMock.findById.mockResolvedValue({ _id: 'u1', email: 'test@example.com', isVerified: false });
      createVerificationCodeMock.mockResolvedValue({ code: '123456' });
      sendVerificationEmailMock.mockResolvedValue({});
      logAuthActivityMock.mockResolvedValue({});

      await sendVerificationCode(req, res);

      expect(createVerificationCodeMock).toHaveBeenCalledWith('u1', 'test@example.com');
      expect(sendVerificationEmailMock).toHaveBeenCalledWith('test@example.com', '123456');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Mã xác thực đã được gửi đến email của bạn' }),
      );
    });
  });

  // ---------- verifyEmail ----------
  describe('verifyEmail', () => {
    it('trả 400 nếu thiếu code', async () => {
      const req = { user: { _id: 'u1' }, body: {} };
      const res = createMockRes();

      await verifyEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Vui lòng nhập mã xác thực' });
    });

    it('trả 400 nếu code không hợp lệ', async () => {
      const req = { user: { _id: 'u1' }, body: { code: '000000' } };
      const res = createMockRes();

      emailVerificationModelMock.findOne.mockResolvedValue(null);

      await verifyEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Mã xác thực không hợp lệ hoặc đã được sử dụng',
      });
    });

    it('trả 400 nếu code đã hết hạn', async () => {
      const req = { user: { _id: 'u1' }, body: { code: '123456' } };
      const res = createMockRes();

      emailVerificationModelMock.findOne.mockResolvedValue({
        code: '123456',
        isUsed: false,
        expiresAt: new Date(Date.now() - 10000), // hết hạn
      });

      await verifyEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới',
      });
    });

    it('xác thực email thành công', async () => {
      const req = { user: { _id: 'u1' }, body: { code: '123456' } };
      const res = createMockRes();

      const saveMock = vi.fn();
      emailVerificationModelMock.findOne.mockResolvedValue({
        code: '123456',
        isUsed: false,
        expiresAt: new Date(Date.now() + 100000),
        save: saveMock,
      });

      const verifiedUser = { _id: 'u1', isVerified: true, email: 'test@example.com' };
      userModelMock.findByIdAndUpdate.mockReturnValue({
        select: vi.fn().mockReturnValue({
          populate: vi.fn().mockResolvedValue(verifiedUser),
        }),
      });
      emailVerificationModelMock.deleteMany.mockResolvedValue({});
      logAuthActivityMock.mockResolvedValue({});

      await verifyEmail(req, res);

      expect(saveMock).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Xác thực email thành công' }),
      );
    });
  });

  // ---------- forgotPassword ----------
  describe('forgotPassword', () => {
    it('trả 400 nếu thiếu email', async () => {
      const req = { body: {} };
      const res = createMockRes();

      await forgotPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Vui lòng nhập email' });
    });

    it('trả 200 kể cả khi email không tồn tại (bảo mật)', async () => {
      const req = { body: { email: 'notfound@example.com' } };
      const res = createMockRes();

      userModelMock.findOne.mockResolvedValue(null);

      await forgotPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Nếu email tồn tại, chúng tôi đã gửi link khôi phục mật khẩu đến email của bạn',
      });
    });

    it('gửi email reset khi email tồn tại', async () => {
      const req = { body: { email: 'test@example.com' } };
      const res = createMockRes();

      userModelMock.findOne.mockResolvedValue({ _id: 'u1', email: 'test@example.com' });
      passwordResetModelMock.deleteMany.mockResolvedValue({});
      passwordResetModelMock.generateToken.mockReturnValue('reset-token-abc');
      passwordResetModelMock.create.mockResolvedValue({});
      sendPasswordResetEmailMock.mockResolvedValue({});
      logAuthActivityMock.mockResolvedValue({});

      await forgotPassword(req, res);

      expect(passwordResetModelMock.deleteMany).toHaveBeenCalled();
      expect(passwordResetModelMock.create).toHaveBeenCalled();
      expect(sendPasswordResetEmailMock).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ---------- resetPassword ----------
  describe('resetPassword', () => {
    it('trả 400 nếu thiếu token hoặc password', async () => {
      const req = { body: { token: 't1' } };
      const res = createMockRes();

      await resetPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Token và mật khẩu mới là bắt buộc' });
    });

    it('trả 400 nếu password quá ngắn', async () => {
      const req = { body: { token: 't1', password: '123' } };
      const res = createMockRes();

      await resetPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Mật khẩu phải có ít nhất 6 ký tự' });
    });

    it('trả 400 nếu token không hợp lệ', async () => {
      const req = { body: { token: 'bad', password: '123456' } };
      const res = createMockRes();

      passwordResetModelMock.findOne.mockResolvedValue(null);

      await resetPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Token không hợp lệ hoặc đã được sử dụng',
      });
    });

    it('reset password thành công', async () => {
      const req = { body: { token: 'valid-token', password: 'newPass123' }, headers: {} };
      const res = createMockRes();

      const saveMock = vi.fn();
      passwordResetModelMock.findOne.mockResolvedValue({
        userId: 'u1',
        token: 'valid-token',
        isUsed: false,
        expiresAt: new Date(Date.now() + 100000),
        save: saveMock,
      });
      bcryptMock.hash.mockResolvedValue('hashed-new');
      userModelMock.findByIdAndUpdate.mockResolvedValue({});
      passwordResetModelMock.deleteMany.mockResolvedValue({});
      logAuthActivityMock.mockResolvedValue({});

      await resetPassword(req, res);

      expect(bcryptMock.hash).toHaveBeenCalledWith('newPass123', 10);
      expect(userModelMock.findByIdAndUpdate).toHaveBeenCalled();
      expect(saveMock).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập với mật khẩu mới',
      });
    });
  });
});