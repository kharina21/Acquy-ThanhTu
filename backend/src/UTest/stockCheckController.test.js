// backend/src/UTest/stockCheckController.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ===== 1. HOISTED MOCKS & SHARED STATE =====
const {
    testState,
    stockCheckMock,
    productStockMock
} = vi.hoisted(() => {
    // SHARED STATE (Trạng thái dùng chung)
    const state = {
        dbError: false,
        stockCheckExists: true,
        stockCheckStatus: 'draft',
    };

    return {
        testState: state,
        stockCheckMock: {
            findById: vi.fn((id) => {
                // Kịch bản: Lỗi Database (UTCID04)
                if (state.dbError) {
                    return {
                        populate: vi.fn().mockReturnThis(),
                        lean: vi.fn().mockRejectedValue(new Error('DB Error')),
                        then: (resolve, reject) => reject(new Error('DB Error'))
                    };
                }

                // Kịch bản: Không tìm thấy ID (UTCID03)
                if (!state.stockCheckExists || id === 'notfound') {
                    return {
                        populate: vi.fn().mockReturnThis(),
                        lean: vi.fn().mockResolvedValue(null),
                        then: (resolve) => resolve(null)
                    };
                }

                // Giả lập trạng thái cho Valid ID 'draft' (UTCID01) và 'confirmed' (UTCID02)
                const status = id === 'SC02' ? 'confirmed' : state.stockCheckStatus;

                return {
                    _id: id,
                    status: status,
                    location: 'loc_id_123',
                    items: [
                        { product: 'prod_123', quantityCounted: 10 } // Số lượng đếm là 10
                    ],
                    save: vi.fn().mockResolvedValue(true),
                    populate: vi.fn().mockReturnThis(),
                    lean: vi.fn().mockResolvedValue({ 
                        _id: id, 
                        status: 'confirmed', 
                        location: { code: 'L01', name: 'Kho 1' },
                        createdBy: { firstName: 'Admin', lastName: 'User' },
                        items: [{ product: { name: 'Acquy', sku: 'AQ-01' } }]
                    }),
                    then: function(resolve) {
                        return resolve(this);
                    }
                };
            })
        },
        productStockMock: {
            findOne: vi.fn(() => {
                return {
                    lean: vi.fn().mockResolvedValue({
                        // Giả lập đang giữ 5 cái cho đơn online. 
                        // quantityCounted (10) > reservedOnlineQty (5) -> PASS logic
                        reservedOnlineQty: 5 
                    })
                };
            }),
            findOneAndUpdate: vi.fn(async () => {
                if (state.dbError) throw new Error('DB Error');
                return true;
            })
        }
    };
});

// ===== 2. MOCK REGISTRATION =====
vi.mock('../models/StockCheck.js', () => ({ default: stockCheckMock }));
vi.mock('../models/ProductStock.js', () => ({ default: productStockMock }));

// Import controller
import { confirmStockCheck } from '../controllers/stockCheckController.js';

const createMockRes = () => ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
});

// ===== 3. TEST SUITES =====
describe('stockCheckController - confirmStockCheck', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => {});

        // Reset trạng thái trước mỗi test case
        testState.dbError = false;
        testState.stockCheckExists = true;
        testState.stockCheckStatus = 'draft';
    });

    it('UTCID01: Should confirm successfully when Valid ID (Status "draft") is passed (Normal)', async () => {
        const req = { params: { id: 'SC01' } };
        const res = createMockRes();

        await confirmStockCheck(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
            message: expect.stringContaining("Đã xác nhận phiếu kiểm kho") 
        }));

        // Data Verification: Kiểm tra hàm lưu và cập nhật kho đã được gọi
        expect(productStockMock.findOneAndUpdate).toHaveBeenCalled();
    });

    it('UTCID02: Should return 400 when Valid ID (Status "confirmed") is passed (Abnormal)', async () => {
        const req = { params: { id: 'SC02' } }; // 'SC02' được mock cứng trả về status 'confirmed'
        const res = createMockRes();

        await confirmStockCheck(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
            message: "Phiếu kiểm kho đã được xác nhận" 
        }));
    });

    it('UTCID03: Should return 404 when Non-existing ID is passed (Abnormal)', async () => {
        testState.stockCheckExists = false;
        const req = { params: { id: 'notfound' } };
        const res = createMockRes();

        await confirmStockCheck(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
            message: "Không tìm thấy phiếu kiểm kho" 
        }));
    });

    it('UTCID04: Should return 500 when Trigger Database Error (Abnormal)', async () => {
        testState.dbError = true; // Kích hoạt ném lỗi DB
        const req = { params: { id: 'SC01' } };
        const res = createMockRes();

        await confirmStockCheck(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
            message: "Lỗi khi xác nhận phiếu kiểm kho" 
        }));
    });
});