// backend/src/UTest/authController.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ===== 1. KHAI BÁO MOCK VỚI vi.hoisted =====
const {
    userMock,
    mockUserInstance,
    customerMock,
    sessionMock,
    passwordResetMock,
    bcryptMock,
    jwtMock,
    rbacHelpersMock,
    activityLoggerMock,
    employeeModelMock
} = vi.hoisted(() => {
    const mockUserInstance = {
        _id: 'mock-user-id',
        username: 'test',
        password: 'hashed_password',
        email: 'test@gmail.com',
        phoneNumber: '0999999999',
        status: 'active',
        isDeleted: false,
        roles: [],
        save: vi.fn().mockResolvedValue(true)
    };

    const createQueryMock = (result) => ({
        select: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => Promise.resolve(result).then(resolve)),
        catch: vi.fn((reject) => Promise.resolve(result).catch(reject))
    });

    const UserFunction = vi.fn(() => mockUserInstance);
    UserFunction.findOne = vi.fn();
    UserFunction.findById = vi.fn();
    UserFunction.create = vi.fn().mockResolvedValue(mockUserInstance);
    UserFunction.findByIdAndUpdate = vi.fn();

    const CustomerFunction = vi.fn();
    CustomerFunction.findOne = vi.fn();
    CustomerFunction.create = vi.fn().mockResolvedValue({ _id: 'cust-id', save: vi.fn() });

    const SessionFunction = vi.fn();
    SessionFunction.findOne = vi.fn();
    SessionFunction.create = vi.fn().mockResolvedValue({});

    const PasswordResetFunction = vi.fn();
    PasswordResetFunction.findOne = vi.fn();
    PasswordResetFunction.deleteMany = vi.fn().mockResolvedValue({});

    const employeeModelMock = { findOne: vi.fn() };

    return {
        userMock: UserFunction,
        mockUserInstance,
        customerMock: CustomerFunction,
        sessionMock: SessionFunction,
        passwordResetMock: PasswordResetFunction,
        bcryptMock: { compare: vi.fn(), hash: vi.fn() },
        jwtMock: { sign: vi.fn(() => 'mocked_token') },
        rbacHelpersMock: { assignDefaultRole: vi.fn() },
        activityLoggerMock: {
            logAuthActivity: vi.fn(),
            getClientIp: vi.fn(() => '127.0.0.1'),
            getUserAgent: vi.fn(() => 'vitest-agent')
        },
        employeeModelMock
    };
});

// ===== 2. ĐĂNG KÝ MOCK =====
vi.mock('../models/User.js', () => ({ default: userMock }));
vi.mock('../models/Customer.js', () => ({ default: customerMock }));
vi.mock('../models/Session.js', () => ({ default: sessionMock }));
vi.mock('../models/PasswordReset.js', () => ({ default: passwordResetMock }));
vi.mock('bcryptjs', () => ({ default: bcryptMock }));
vi.mock('jsonwebtoken', () => ({ default: jwtMock }));
vi.mock('../libs/rbacHelpers.js', () => rbacHelpersMock);
vi.mock('../libs/activityLogger.js', () => activityLoggerMock);
vi.mock('../models/Employee.js', () => ({ default: employeeModelMock }));

import { login, registerUser, refreshToken, resetPassword } from '../controllers/authController.js';

const createMockRes = () => ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
    cookie: vi.fn(),
    clearCookie: vi.fn()
});

const mockQuery = (data) => ({
    select: vi.fn().mockReturnThis(),
    populate: vi.fn().mockReturnThis(),
    then: vi.fn(resolve => Promise.resolve(data).then(resolve))
});

// ===== 3. TEST SUITES =====
describe('authController', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'log').mockImplementation(() => {}); 
    });

    // ==========================================
    // BẢNG 1: LOGIN (5 CASE)
    // ==========================================
    describe('1. login', () => {
        beforeEach(() => {
            mockUserInstance.status = 'active';
            mockUserInstance.isDeleted = false;
            mockUserInstance.roles = [];
            employeeModelMock.findOne.mockReset();
        });

        it('UTCID01: Trả về 200 và đăng nhập thành công (Normal)', async () => {
            const req = { body: { username: 'test', password: 'ooo123' } };
            const res = createMockRes();
            userMock.findOne.mockReturnValue(mockQuery(mockUserInstance));
            bcryptMock.compare.mockResolvedValue(true);

            await login(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
                message: "user test đã đăng nhập thành công" 
            }));
            expect(activityLoggerMock.logAuthActivity).toHaveBeenCalledWith(expect.objectContaining({
                description: "User test đã đăng nhập thành công"
            }));
        });

        it('UTCID02: Trả về 400 nếu thiếu tham số đầu vào (Abnormal)', async () => {
            const req = { body: { username: 'test' } };
            const res = createMockRes();
            await login(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "Vui lòng nhập username và password" });
        });

        it('UTCID03: Trả về 400 nếu tài khoản không tồn tại (Abnormal)', async () => {
            const req = { body: { username: 'ghost', password: '123' } };
            const res = createMockRes();
            userMock.findOne.mockReturnValue(mockQuery(null));
            await login(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "Tài khoản hoặc mật khẩu không chính xác" });
        });

        it('UTCID04: Trả về 400 nếu sai mật khẩu (Abnormal)', async () => {
            const req = { body: { username: 'test', password: 'wrong' } };
            const res = createMockRes();
            userMock.findOne.mockReturnValue(mockQuery(mockUserInstance));
            bcryptMock.compare.mockResolvedValue(false);
            await login(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "Tài khoản hoặc mật khẩu không chính xác" });
        });

        it('UTCID05: Trả về 500 nếu Database lỗi (Abnormal)', async () => {
            const req = { body: { username: 'test', password: '123' } };
            const res = createMockRes();
            
            // FIX LỖI: Chỉ giả lập lỗi ở lần đầu tiên. Lần 2 (trong khối catch) cho qua an toàn.
            userMock.findOne
                .mockRejectedValueOnce(new Error('DB Error'))
                .mockReturnValueOnce(mockQuery(null));
                
            await login(req, res);
            
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Lỗi khi gọi login" }));
        });

        it('Trả về 403 nếu tài khoản inactive', async () => {
            const req = { body: { username: 'test', password: 'ooo123' } };
            const res = createMockRes();
            mockUserInstance.status = 'inactive';
            userMock.findOne.mockReturnValue(mockQuery(mockUserInstance));
            bcryptMock.compare.mockResolvedValue(true);

            await login(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    code: 'account_inactive',
                    message: expect.stringContaining('không hoạt động'),
                })
            );
            expect(sessionMock.create).not.toHaveBeenCalled();
        });

        it('Trả về 403 nếu seller chưa có Employee/cơ sở', async () => {
            const req = { body: { username: 'test', password: 'ooo123' } };
            const res = createMockRes();
            mockUserInstance.roles = [{ name: 'seller' }];
            employeeModelMock.findOne.mockResolvedValue(null);
            userMock.findOne.mockReturnValue(mockQuery(mockUserInstance));
            bcryptMock.compare.mockResolvedValue(true);

            await login(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    code: 'staff_needs_setup',
                    message: expect.stringContaining('quản trị viên'),
                })
            );
            expect(employeeModelMock.findOne).toHaveBeenCalled();
            expect(sessionMock.create).not.toHaveBeenCalled();
        });
    });

    // ==========================================
    // BẢNG 2: REGISTER USER (5 CASE)
    // ==========================================
    describe('2. registerUser', () => {
        it('UTCID01: Trả về 201 tạo user thành công (Normal)', async () => {
            const req = { body: { username: 'new', password: '123', email: 'new@g.com', phoneNumber: '0123' } };
            const res = createMockRes();
            userMock.findOne.mockReturnValue(mockQuery(null));
            customerMock.findOne.mockReturnValue(mockQuery(null));
            await registerUser(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(activityLoggerMock.logAuthActivity).toHaveBeenCalledWith(expect.objectContaining({
                description: "User new đã đăng ký thành công"
            }));
        });

        it('UTCID02: Trả về 400 nếu Username đã tồn tại (Abnormal)', async () => {
            const req = { body: { username: 'test' } };
            const res = createMockRes();
            userMock.findOne.mockReturnValue(mockQuery({ username: 'test' }));
            await registerUser(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "Username đã tồn tại" });
        });

        it('UTCID03: Trả về 400 nếu Email đã tồn tại (Abnormal)', async () => {
            const req = { body: { email: 'test@gmail.com' } };
            const res = createMockRes();
            userMock.findOne.mockReturnValueOnce(mockQuery(null)).mockReturnValueOnce(mockQuery({ email: 'test@gmail.com' }));
            await registerUser(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "Email đã tồn tại" });
        });

        it('UTCID04: Trả về 400 nếu Số điện thoại đã tồn tại (Abnormal)', async () => {
            const req = { body: { phoneNumber: '0999999999' } };
            const res = createMockRes();
            userMock.findOne.mockReturnValueOnce(mockQuery(null)).mockReturnValueOnce(mockQuery(null)).mockReturnValueOnce(mockQuery({ phoneNumber: '0999999999' }));
            await registerUser(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "Số điện thoại đã được sử dụng bởi người dùng khác" });
        });

        it('UTCID05: Trả về 500 nếu Database lỗi (Abnormal)', async () => {
            const req = { body: { username: 'new' } };
            const res = createMockRes();
            userMock.findOne.mockRejectedValue(new Error('DB Error'));
            await registerUser(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Lỗi khi gọi register" }));
        });
    });

    // ==========================================
    // BẢNG 3: REFRESH TOKEN (5 CASE)
    // ==========================================
    describe('3. refreshToken', () => {
        it('UTCID01: Trả về 200 thành công (Normal)', async () => {
            const req = { cookies: { refreshToken: 'valid' } };
            const res = createMockRes();
            sessionMock.findOne.mockReturnValue(mockQuery({ userId: 'u1', expiresAt: new Date(Date.now() + 10000) }));
            await refreshToken(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ accessToken: 'mocked_token' });
        });

        it('UTCID02: Trả về 401 nếu thiếu token đầu vào (Abnormal)', async () => {
            const req = { cookies: {} };
            const res = createMockRes();
            await refreshToken(req, res);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ message: "Token không tồn tại!" });
        });

        it('UTCID03: Trả về 403 nếu token không hợp lệ (Abnormal)', async () => {
            const req = { cookies: { refreshToken: 'fake' } };
            const res = createMockRes();
            sessionMock.findOne.mockReturnValue(mockQuery(null));
            await refreshToken(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: "Token không hợp lệ hoặc đã hết hạn" });
        });

        it('UTCID04: Trả về 403 nếu token đã hết hạn (Abnormal)', async () => {
            const req = { cookies: { refreshToken: 'expired' } };
            const res = createMockRes();
            sessionMock.findOne.mockReturnValue(mockQuery({ expiresAt: new Date(Date.now() - 10000) }));
            await refreshToken(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: "Token đã hết hạn" });
        });

        it('UTCID05: Trả về 500 nếu Database lỗi (Abnormal)', async () => {
            const req = { cookies: { refreshToken: 'valid' } };
            const res = createMockRes();
            sessionMock.findOne.mockRejectedValue(new Error('DB Error'));
            await refreshToken(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // ==========================================
    // BẢNG 4: RESET PASSWORD (6 CASE)
    // ==========================================
    describe('4. resetPassword', () => {
        it('UTCID01: Trả về 200 đổi mật khẩu thành công (Normal)', async () => {
            const req = { body: { token: 'valid', password: 'newpass123' } };
            const res = createMockRes();
            
            // FIX LỖI: Tạo mock cụ thể cho save và bcrypt
            const fakePasswordReset = { 
                userId: 'u1', 
                expiresAt: new Date(Date.now() + 100000), 
                save: vi.fn().mockResolvedValue(true) 
            };
            
            passwordResetMock.findOne.mockReturnValue(mockQuery(fakePasswordReset));
            bcryptMock.hash.mockResolvedValue('new_hashed_password');
            userMock.findByIdAndUpdate.mockResolvedValue(true);
            
            await resetPassword(req, res);
            
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: "Đặt lại mật khẩu thành công. Vui lòng đăng nhập với mật khẩu mới" });
            expect(activityLoggerMock.logAuthActivity).toHaveBeenCalledWith(expect.objectContaining({
                description: "Đặt lại mật khẩu thành công"
            }));
        });

        it('UTCID02: Trả về 400 nếu thiếu token/password (Abnormal)', async () => {
            const req = { body: { token: 'valid' } };
            const res = createMockRes();
            await resetPassword(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "Token và mật khẩu mới là bắt buộc" });
        });

        it('UTCID03: Trả về 400 nếu mật khẩu < 6 ký tự (Abnormal)', async () => {
            const req = { body: { token: 'valid', password: '123' } };
            const res = createMockRes();
            await resetPassword(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "Mật khẩu phải có ít nhất 6 ký tự" });
        });

        it('UTCID04: Trả về 400 nếu token sai/đã dùng (Abnormal)', async () => {
            const req = { body: { token: 'fake', password: 'newpass123' } };
            const res = createMockRes();
            passwordResetMock.findOne.mockReturnValue(mockQuery(null));
            await resetPassword(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "Token không hợp lệ hoặc đã được sử dụng" });
        });

        it('UTCID05: Trả về 400 nếu token hết hạn (Abnormal)', async () => {
            const req = { body: { token: 'expired', password: 'newpass123' } };
            const res = createMockRes();
            passwordResetMock.findOne.mockReturnValue(mockQuery({ expiresAt: new Date(Date.now() - 10000) }));
            await resetPassword(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "Token đã hết hạn. Vui lòng yêu cầu link mới" });
        });

        it('UTCID06: Trả về 500 nếu Database lỗi (Abnormal)', async () => {
            const req = { body: { token: 'valid', password: 'newpass123' } };
            const res = createMockRes();
            passwordResetMock.findOne.mockRejectedValue(new Error('DB Error'));
            await resetPassword(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Lỗi khi đặt lại mật khẩu" }));
        });
    });
});