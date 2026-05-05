// backend/src/UTest/dashboardController.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ===== 1. HOISTED MOCKS & SHARED STATE =====
const {
    testState,
    mongooseMock,
    locationMock,
    orderMock,
    batteryTradeInMock,
    customerMock,
    productMock,
    managerLocationHelperMock
} = vi.hoisted(() => {
    // SHARED STATE
    const state = {
        dbError: false,
        allowedLocIds: null, // null = Admin, [] = Manager no branches, ['loc1'] = Manager assigned loc1
    };

    // Generic mock data for aggregations to prevent TypeError during destructuring/mapping
    const genericAggResult = [{ 
        _id: 'mock_id', 
        total: 1000000, 
        count: 10, 
        orderCount: 5, 
        totalSpent: 500000,
        quantitySold: 20,
        revenue: 1000000,
        user: { firstName: 'Nguyen', lastName: 'A', email: 'a@gmail.com', username: 'nguyena' },
        product: { name: 'Acquy Dong Nai', sku: 'AQ-DN' }
    }];

    return {
        testState: state,
        mongooseMock: {
            Types: {
                // giả lập constructor + static isValid
                // eslint-disable-next-line func-names
                ObjectId: Object.assign(function (value) {
                    this.value = value;
                }, {
                    isValid: vi.fn(() => true), // Bypass check ID format
                }),
            }
        },
        managerLocationHelperMock: {
            getManagerAllowedLocationIds: vi.fn(async () => {
                return state.allowedLocIds;
            })
        },
        locationMock: {
            findById: vi.fn(() => ({
                lean: vi.fn(async () => {
                    if (state.dbError) throw new Error('DB Error');
                    return { _id: 'loc1', isOnlineLocation: true };
                })
            }))
        },
        orderMock: {
            aggregate: vi.fn(async () => {
                if (state.dbError) throw new Error('DB Error');
                return genericAggResult;
            }),
            countDocuments: vi.fn(async () => {
                if (state.dbError) throw new Error('DB Error');
                return 15;
            })
        },
        batteryTradeInMock: {
            aggregate: vi.fn(async () => {
                if (state.dbError) throw new Error('DB Error');
                return genericAggResult;
            })
        },
        customerMock: {
            countDocuments: vi.fn(async () => {
                if (state.dbError) throw new Error('DB Error');
                return 100;
            })
        },
        productMock: {
            countDocuments: vi.fn(async () => {
                if (state.dbError) throw new Error('DB Error');
                return 50;
            })
        }
    };
});

// ===== 2. MOCK REGISTRATION =====
vi.mock('mongoose', () => ({ default: mongooseMock }));
vi.mock('../models/Location.js', () => ({ default: locationMock }));
vi.mock('../models/Order.js', () => ({ default: orderMock }));
vi.mock('../models/BatteryTradeIn.js', () => ({ default: batteryTradeInMock }));
vi.mock('../models/Customer.js', () => ({ default: customerMock }));
vi.mock('../models/Product.js', () => ({ default: productMock }));
vi.mock('../libs/managerLocationHelper.js', () => managerLocationHelperMock);
// KHÔNG mock các hàm dateHelper vì getDateRange là hàm nội bộ trong controller.

// Import controller
import { getDashboardStats } from '../controllers/dashboardController.js';

const createMockRes = () => ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
});

// ===== 3. TEST SUITES =====
describe('dashboardController - getDashboardStats', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => {});

        // ĐÓNG BĂNG THỜI GIAN: Giả lập lúc này luôn là ngày 15/04/2026 12:00:00
        // Đảm bảo hàm getDateRange nội bộ hoạt động chính xác 100% không phụ thuộc ngày giờ thật
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-04-15T12:00:00.000Z'));

        // Reset state trước mỗi test case
        testState.dbError = false;
        testState.allowedLocIds = null; // Mặc định là Admin truy cập toàn quyền
    });

    afterEach(() => {
        // Trả lại thời gian thực cho hệ thống sau khi test xong
        vi.useRealTimers();
    });

    it('UTCID01: Admin logged in, period: "month", locationId: "all" (Normal)', async () => {
        const req = { 
            user: { _id: 'admin_id' },
            query: { period: 'month', locationId: 'all' }
        };
        const res = createMockRes();

        await getDashboardStats(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('UTCID02: Manager assigned to "loc1", period: "week", locationId: "loc1" (Normal)', async () => {
        testState.allowedLocIds = ['loc1']; // Manager được phân công loc1
        const req = { 
            user: { _id: 'manager_id' },
            query: { period: 'week', locationId: 'loc1' }
        };
        const res = createMockRes();

        await getDashboardStats(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('UTCID03: Manager assigned to NO locations, requests "all" (Abnormal)', async () => {
        testState.allowedLocIds = []; // Manager chưa được phân công chi nhánh nào
        const req = { 
            user: { _id: 'manager_id' },
            query: { period: 'month', locationId: 'all' }
        };
        const res = createMockRes();

        await getDashboardStats(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
            message: "Bạn chưa được phân công chi nhánh. Vui lòng liên hệ quản trị viên." 
        }));
    });

    it('UTCID04: Manager assigned to "loc1" requests unauthorized "loc2" (Abnormal)', async () => {
        testState.allowedLocIds = ['loc1']; // Manager chỉ có quyền ở loc1
        const req = { 
            user: { _id: 'manager_id' },
            query: { period: 'month', locationId: 'loc2' } // Cố tình truy cập loc2
        };
        const res = createMockRes();

        await getDashboardStats(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
            message: "Bạn không có quyền xem thống kê chi nhánh này. Chỉ được xem chi nhánh được phân công." 
        }));
    });

    it('UTCID05: Admin logged in, specific dateFrom and dateTo (Normal)', async () => {
        testState.allowedLocIds = null; // Admin
        const req = { 
            user: { _id: 'admin_id' },
            query: { dateFrom: '2026-04-01', dateTo: '2026-04-30' }
        };
        const res = createMockRes();

        await getDashboardStats(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('UTCID06: Valid parameters but Database Aggregation execution error (Abnormal)', async () => {
        testState.allowedLocIds = null;
        testState.dbError = true; // Kích hoạt lỗi DB Aggregate
        const req = { 
            user: { _id: 'admin_id' },
            query: { period: 'month', locationId: 'all' }
        };
        const res = createMockRes();

        await getDashboardStats(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
            message: "Lỗi khi lấy thống kê" 
        }));
    });
});