// backend/src/UTest/stockOutController.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ===== 1. HOISTED MOCKS & SHARED STATE =====
const {
    testState,
    stockOutMock,
    productStockMock
} = vi.hoisted(() => {
    // SHARED STATE (Trạng thái dùng chung)
    const state = {
        dbError: false,
        stockOutExists: true,
        stockOutStatus: 'draft',
        sufficientStock: true, // Kiểm soát tồn kho đủ hay thiếu
    };

    return {
        testState: state,
        stockOutMock: {
            findById: vi.fn((id) => {
                // Xử lý case DB Error
                if (state.dbError) {
                    return {
                        populate: vi.fn().mockReturnThis(),
                        lean: vi.fn().mockRejectedValue(new Error('DB Error')),
                        then: (resolve, reject) => reject(new Error('DB Error'))
                    };
                }

                // Xử lý case Không tìm thấy (UTCID02)
                if (!state.stockOutExists || id === 'notfound') {
                    return {
                        populate: vi.fn().mockReturnThis(),
                        lean: vi.fn().mockResolvedValue(null),
                        then: (resolve) => resolve(null)
                    };
                }

                // Giả lập dữ liệu trả về cho OUT01 (draft) và OUT02 (confirmed)
                const status = id === 'OUT02' ? 'confirmed' : state.stockOutStatus;

                return {
                    _id: id,
                    status: status,
                    items: [{ product: 'prod_123', quantity: 10 }], // Cần xuất 10 cái
                    location: 'loc_id_123',
                    save: vi.fn().mockResolvedValue(true),
                    populate: vi.fn().mockReturnThis(),
                    lean: vi.fn().mockResolvedValue({ 
                        _id: id, 
                        status: 'confirmed', 
                        items: [{ product: { name: 'Acquy', sku: 'AQ-01' } }],
                        location: { code: 'L01', name: 'Kho 1' },
                        createdBy: { firstName: 'Admin', lastName: 'User' }
                    }),
                    then: function(resolve) {
                        return resolve(this);
                    }
                };
            })
        },
        productStockMock: {
            findOne: vi.fn(() => {
                // Giả lập hàm lấy tồn kho vật lý
                return {
                    lean: vi.fn().mockResolvedValue(
                        state.sufficientStock 
                            ? { quantity: 100 } // Kho còn 100 -> Đủ xuất 10 (UTCID01)
                            : { quantity: 5 }   // Kho còn 5 -> Không đủ xuất 10 (UTCID04)
                    )
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
vi.mock('../models/StockOut.js', () => ({ default: stockOutMock }));
vi.mock('../models/ProductStock.js', () => ({ default: productStockMock }));

// Import controller
import { confirmStockOut } from '../controllers/stockOutController.js';

const createMockRes = () => ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
});

// ===== 3. TEST SUITES =====
describe('stockOutController - confirmStockOut', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => {});

        // Reset trạng thái trước mỗi test case
        testState.dbError = false;
        testState.stockOutExists = true;
        testState.stockOutStatus = 'draft';
        testState.sufficientStock = true;
    });

    it('UTCID01: Should confirm successfully when id="OUT01" and stock is sufficient (Normal)', async () => {
        const req = { params: { id: 'OUT01' } };
        const res = createMockRes();

        await confirmStockOut(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
            message: "Đã xác nhận phiếu xuất kho và trừ tồn" 
        }));
    });

    it('UTCID02: Should return 404 when id="notfound" (Abnormal)', async () => {
        testState.stockOutExists = false;
        const req = { params: { id: 'notfound' } };
        const res = createMockRes();

        await confirmStockOut(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
            message: "Không tìm thấy phiếu xuất kho" 
        }));
    });

    it('UTCID03: Should return 400 when StockOut is already confirmed (id="OUT02") (Abnormal)', async () => {
        const req = { params: { id: 'OUT02' } };
        const res = createMockRes();

        await confirmStockOut(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
            message: "Phiếu xuất đã được xác nhận" 
        }));
    });

    it('UTCID04: Should return 400 when physical stock is insufficient (Abnormal)', async () => {
        testState.sufficientStock = false; // Kích hoạt trạng thái thiếu hàng trong kho
        const req = { params: { id: 'OUT01' } };
        const res = createMockRes();

        await confirmStockOut(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
            message: expect.stringContaining("Không đủ tồn kho để xuất") 
        }));
    });

    it('UTCID05: Should return 500 on database execution error (Abnormal)', async () => {
        testState.dbError = true; // Kích hoạt lỗi DB
        const req = { params: { id: 'OUT01' } };
        const res = createMockRes();

        await confirmStockOut(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
            message: "Lỗi khi xác nhận phiếu xuất" 
        }));
    });
});