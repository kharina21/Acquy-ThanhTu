// backend/src/UTest/userController.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ===== 1. KHAI BÁO MOCK VỚI vi.hoisted =====
const {
    userMock,
    roleMock,
    locationMock,
    employeeMock,
    orderMock,
    mockUserInstance,
    rbacHelpersMock,
    activityLoggerMock,
    createQueryMock
} = vi.hoisted(() => {
    const mockUserInstance = {
        _id: 'target_user_id',
        username: 'targetuser',
        roles: [],
        save: vi.fn().mockResolvedValue(true)
    };

    const createQueryMock = (result) => ({
        select: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => Promise.resolve(result).then(resolve)),
        catch: vi.fn((reject) => Promise.resolve(result).catch(reject))
    });

    const UserFunction = vi.fn(() => mockUserInstance);
    UserFunction.findById = vi.fn();
    UserFunction.findOne = vi.fn();

    const RoleFunction = vi.fn();
    RoleFunction.findOne = vi.fn();

    const LocationFunction = vi.fn();
    LocationFunction.findById = vi.fn();

    const EmployeeFunction = vi.fn();
    EmployeeFunction.findOne = vi.fn();
    EmployeeFunction.create = vi.fn().mockResolvedValue({ _id: 'emp1' });

    const OrderFunction = vi.fn();
    OrderFunction.exists = vi.fn();

    return {
        userMock: UserFunction,
        roleMock: RoleFunction,
        locationMock: LocationFunction,
        employeeMock: EmployeeFunction,
        orderMock: OrderFunction,
        mockUserInstance,
        rbacHelpersMock: {
            // FIX LỖI TRIỆT ĐỂ: Hàm mock tự động trả về true nếu thấy cờ isAdminForTest
            userHasAdminRole: vi.fn(async (user) => user && user.isAdminForTest === true),
            userHasAnyOfRoles: vi.fn((roles, allowed) => allowed.some(r => roles.includes(r))),
            roleNameMatchesCanonical: vi.fn((role, canonical) => role === canonical),
            canonicalRoleName: vi.fn((role) => role)
        },
        activityLoggerMock: {
            logAuthActivity: vi.fn(),
            getClientIp: vi.fn(() => '127.0.0.1'),
            getUserAgent: vi.fn(() => 'vitest-agent')
        },
        createQueryMock
    };
});

// ===== 2. ĐĂNG KÝ MOCK =====
vi.mock('../models/User.js', () => ({ default: userMock }));
vi.mock('../models/Role.js', () => ({ default: roleMock }));
vi.mock('../models/Location.js', () => ({ default: locationMock }));
vi.mock('../models/Employee.js', () => ({ default: employeeMock }));
vi.mock('../models/Order.js', () => ({ default: orderMock }));
vi.mock('../libs/rbacHelpers.js', () => rbacHelpersMock); 
vi.mock('../libs/activityLogger.js', () => activityLoggerMock);

import { assignRoles } from '../controllers/userController.js';

const createMockRes = () => ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
});

// ===== 3. TEST SUITES =====
describe('userController', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'log').mockImplementation(() => {}); 
        orderMock.exists.mockResolvedValue(false); // Đảm bảo clear state mua hàng
    });

    describe('assignRoles', () => {
        
        // Helper này giờ sẽ tạo ra dữ liệu user động, không bị rò rỉ sang test khác
        const setupDefaultUserMock = (targetUserOverride = {}) => {
            userMock.findById.mockImplementation((id) => {
                if (id === 'admin_executor_id') {
                    return createQueryMock({ _id: 'admin_executor_id', roles: [{ name: 'admin' }] });
                }
                if (id === 'manager_executor_id') {
                    return createQueryMock({ _id: 'manager_executor_id', roles: [{ name: 'manager' }] });
                }
                if (id === 'target_user_id') {
                    // Spread operator (...) để clone object, ngăn việc bị ghi đè dữ liệu
                    return createQueryMock({ ...mockUserInstance, ...targetUserOverride });
                }
                return createQueryMock(null);
            });
        };

        it('UTCID01: Trả về 200 và gán role staff thành công (Normal)', async () => {
            setupDefaultUserMock();
            const req = { 
                user: { _id: 'admin_executor_id', username: 'admin_boss' },
                params: { id: 'target_user_id' }, 
                body: { roles: ['seller'], locationId: 'loc1' } 
            };
            const res = createMockRes();

            roleMock.findOne.mockReturnValue(createQueryMock({ _id: 'role_seller_id', name: 'seller' }));
            locationMock.findById.mockReturnValue(createQueryMock({ _id: 'loc1', name: 'Cửa hàng 1' }));
            employeeMock.findOne.mockReturnValue(createQueryMock(null)); 

            await assignRoles(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
                message: "Cập nhật vai trò thành công" 
            }));
            expect(employeeMock.create).toHaveBeenCalled(); 
        });

        it('UTCID02: Trả về 400 nếu thiếu roles (Abnormal)', async () => {
            const req = { params: { id: 'target_user_id' }, body: { locationId: 'loc1' } }; 
            const res = createMockRes();
            await assignRoles(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "Vui lòng chọn một vai trò" });
        });

        it('UTCID03: Trả về 404 nếu không tìm thấy target user (Abnormal)', async () => {
            userMock.findById.mockReturnValue(createQueryMock(null));
            const req = { params: { id: 'fake_id' }, body: { roles: ['seller'], locationId: 'loc1' } };
            const res = createMockRes();
            await assignRoles(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
        });

        it('UTCID04: Trả về 403 nếu cố gắng đổi quyền của Admin (Abnormal)', async () => {
            // FIX LỖI: Bơm cờ isAdminForTest vào trực tiếp data của user này!
            setupDefaultUserMock({ isAdminForTest: true }); 
            
            const req = { 
                user: { _id: 'admin_executor_id' },
                params: { id: 'target_user_id' }, 
                body: { roles: ['seller'], locationId: 'loc1' } 
            };
            const res = createMockRes();
            await assignRoles(req, res);
            
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: "Không được sửa đổi quyền tài khoản quản trị viên" });
        });

        it('UTCID05: Trả về 403 nếu cố tình gán role Admin (Abnormal)', async () => {
            setupDefaultUserMock(); // Không có cờ Admin, an toàn tuyệt đối
            const req = { 
                user: { _id: 'admin_executor_id' },
                params: { id: 'target_user_id' }, 
                body: { roles: ['admin'] } 
            };
            const res = createMockRes();
            await assignRoles(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: "Không được gán vai trò quản trị viên" });
        });

        it('UTCID06: Trả về 403 nếu Manager gán quyền không được phép (Abnormal)', async () => {
            setupDefaultUserMock(); 
            const req = { 
                user: { _id: 'manager_executor_id' }, 
                params: { id: 'target_user_id' }, 
                body: { roles: ['user'] } 
            };
            const res = createMockRes();
            await assignRoles(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
                message: "Quản lý chỉ được gán vai trò Nhân viên bán hàng hoặc Quản lý kho" 
            }));
        });

        it('UTCID07: Trả về 400 nếu gán quyền User cho người đã có hóa đơn (Abnormal)', async () => {
            setupDefaultUserMock();
            const req = { 
                user: { _id: 'admin_executor_id' },
                params: { id: 'target_user_id' }, 
                body: { roles: ['user'] } 
            };
            const res = createMockRes();
            
            roleMock.findOne.mockReturnValue(createQueryMock({ _id: 'role_user_id', name: 'user' }));
            orderMock.exists.mockResolvedValue(true); // Mô phỏng đã có đơn hàng

            await assignRoles(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
                message: expect.stringContaining("Không thể gán vai trò Người dùng thường") 
            }));
        });

        it('UTCID08: Trả về 400 nếu gán role Staff nhưng thiếu locationId (Abnormal)', async () => {
            setupDefaultUserMock();
            const req = { 
                user: { _id: 'admin_executor_id' },
                params: { id: 'target_user_id' }, 
                body: { roles: ['seller'] } 
            };
            const res = createMockRes();
            roleMock.findOne.mockReturnValue(createQueryMock({ _id: 'role_seller_id', name: 'seller' }));

            await assignRoles(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "Vui lòng chọn cơ sở cho nhân viên" });
        });

        it('UTCID09: Trả về 400 nếu locationId không tồn tại (Abnormal)', async () => {
            setupDefaultUserMock();
            const req = { 
                user: { _id: 'admin_executor_id' },
                params: { id: 'target_user_id' }, 
                body: { roles: ['seller'], locationId: 'fake_loc' } 
            };
            const res = createMockRes();
            roleMock.findOne.mockReturnValue(createQueryMock({ _id: 'role_seller_id', name: 'seller' }));
            locationMock.findById.mockReturnValue(createQueryMock(null)); 

            await assignRoles(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "Cơ sở không tồn tại" });
        });

        it('UTCID10: Trả về 500 nếu Database lỗi (Abnormal)', async () => {
            userMock.findById.mockRejectedValue(new Error('DB Error')); 
            const req = { 
                user: { _id: 'admin_executor_id' },
                params: { id: 'target_user_id' }, 
                body: { roles: ['seller'], locationId: 'loc1' } 
            };
            const res = createMockRes();
            
            await assignRoles(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});