// backend/src/UTest/categoryController.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ===== 1. HOISTED MOCKS & SHARED STATE =====
const {
    testState,
    categoryMock,
    productMock,
    activityLoggerMock
} = vi.hoisted(() => {
    // SHARED STATE (Trạng thái dùng chung để điều khiển mock)
    const state = {
        dbError: false,
        categoryExists: true,
        activeProductCount: 0,
    };

    return {
        testState: state,
        categoryMock: {
            findById: vi.fn(async (id) => {
                if (state.dbError) throw new Error('DB Error');
                if (!state.categoryExists || id === 'notfound') return null;
                return { _id: id, name: 'Acquy' };
            }),
            findByIdAndDelete: vi.fn(async (id) => {
                if (state.dbError) throw new Error('DB Error');
                return true;
            }),
        },
        productMock: {
            countDocuments: vi.fn(async (query) => {
                if (state.dbError) throw new Error('DB Error');
                return state.activeProductCount;
            }),
        },
        activityLoggerMock: {
            logAuthActivity: vi.fn(async () => true),
            getClientIp: vi.fn(() => '127.0.0.1'),
            getUserAgent: vi.fn(() => 'Mozilla/5.0 (Test Agent)'),
        }
    };
});

// ===== 2. MOCK REGISTRATION =====
vi.mock('../models/Category.js', () => ({ default: categoryMock }));
vi.mock('../models/Product.js', () => ({ default: productMock }));
vi.mock('../libs/activityLogger.js', () => activityLoggerMock);

// Import controller sau khi đã mock
import { deleteCategory } from '../controllers/categoryController.js';

const createMockRes = () => ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
});

// ===== 3. TEST SUITES =====
describe('categoryController - deleteCategory', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Ẩn log console để terminal sạch sẽ khi test lỗi
        vi.spyOn(console, 'error').mockImplementation(() => {});

        // Reset trạng thái trước mỗi test case
        testState.dbError = false;
        testState.categoryExists = true;
        testState.activeProductCount = 0;
    });

    it('UTCID01: Should delete successfully when category exists and has NO active products (Normal)', async () => {
        const req = { 
            params: { id: 'acquy' },
            user: { _id: 'admin_id' }
        };
        const res = createMockRes();

        await deleteCategory(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
            message: "Xóa loại hàng thành công" 
        }));
        
        // Đảm bảo hàm xóa và log được gọi
        expect(categoryMock.findByIdAndDelete).toHaveBeenCalledWith('acquy');
        expect(activityLoggerMock.logAuthActivity).toHaveBeenCalledWith(
            expect.objectContaining({ status: 'success', action: 'delete' })
        );
    });

    it('UTCID02: Should return 404 when category is not found (Abnormal)', async () => {
        testState.categoryExists = false;
        const req = { 
            params: { id: 'notfound' },
            user: { _id: 'admin_id' }
        };
        const res = createMockRes();

        await deleteCategory(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
            message: "Không tìm thấy loại hàng" 
        }));
    });

    it('UTCID03: Should return 400 when category has active dependent products (Abnormal)', async () => {
        testState.activeProductCount = 5; // Có 5 sản phẩm đang sử dụng category này
        const req = { 
            params: { id: 'acquy' },
            user: { _id: 'admin_id' }
        };
        const res = createMockRes();

        await deleteCategory(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
            message: "Không thể xóa loại hàng này vì có 5 sản phẩm đang sử dụng" 
        }));
        
        // Đảm bảo lệnh xóa không bị thực thi
        expect(categoryMock.findByIdAndDelete).not.toHaveBeenCalled();
    });

    it('UTCID04: Should return 500 on database execution error (Abnormal)', async () => {
        testState.dbError = true; // Kích hoạt lỗi DB
        const req = { 
            params: { id: 'acquy' },
            user: { _id: 'admin_id' }
        };
        const res = createMockRes();

        await deleteCategory(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
            message: "Lỗi khi xóa loại hàng" 
        }));
        
        // Đảm bảo logAuthActivity ghi nhận thất bại
        expect(activityLoggerMock.logAuthActivity).toHaveBeenCalledWith(
            expect.objectContaining({ status: 'failed' })
        );
    });
});