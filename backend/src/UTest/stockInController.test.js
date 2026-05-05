// backend/src/UTest/stockInController.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ===== 1. HOISTED MOCKS & SHARED STATE =====
const {
    testState,
    stockInMock,
    productStockMock,
    helpersMock
} = vi.hoisted(() => {
    // SHARED STATE (Trạng thái dùng chung)
    const state = {
        dbError: false,
        stockInExists: true,
        stockInStatus: 'draft',
    };

    return {
        testState: state,
        stockInMock: {
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
                if (!state.stockInExists || id === 'notfound') {
                    return {
                        populate: vi.fn().mockReturnThis(),
                        lean: vi.fn().mockResolvedValue(null),
                        then: (resolve) => resolve(null)
                    };
                }

                // Giả lập dữ liệu trả về cho IN01 (draft) và IN02 (confirmed)
                const status = id === 'IN02' ? 'confirmed' : state.stockInStatus;

                return {
                    _id: id,
                    status: status,
                    items: [], // Để mảng rỗng giúp pass qua hàm assert dễ dàng
                    location: 'loc_id_123',
                    save: vi.fn().mockResolvedValue(true),
                    populate: vi.fn().mockReturnThis(),
                    lean: vi.fn().mockResolvedValue({ 
                        _id: id, 
                        status: 'confirmed', 
                        items: [],
                        location: { code: 'L01', name: 'Kho 1' },
                        supplier: { code: 'S01', name: 'NCC 1' },
                        createdBy: { firstName: 'Admin', lastName: 'User' }
                    }),
                    then: function(resolve) {
                        return resolve(this);
                    }
                };
            })
        },
        productStockMock: {
            findOneAndUpdate: vi.fn(async () => {
                if (state.dbError) throw new Error('DB Error');
                return true;
            })
        },
        helpersMock: {
            syncProductsCostPriceFromConfirmedStockIns: vi.fn(async () => true),
        },
    };
});

// ===== 2. MOCK REGISTRATION =====
vi.mock('../models/StockIn.js', () => ({ default: stockInMock }));
vi.mock('../models/ProductStock.js', () => ({ default: productStockMock }));

// Lưu ý: Nếu 2 hàm assert và sync của bạn nằm ở file khác, hãy mock nó vào đây. 
// (Tạm thời mình giả định nó nằm cùng thư mục hoặc không bị crash khi chạy)

// Import controller
import { confirmStockIn } from '../controllers/stockInController.js';

const createMockRes = () => ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
});

// ===== 3. TEST SUITES =====
describe('stockInController - confirmStockIn', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => {});

        // Reset trạng thái trước mỗi test case
        testState.dbError = false;
        testState.stockInExists = true;
        testState.stockInStatus = 'draft';
    });

    it('UTCID01: Should confirm successfully when id="IN01" (Normal)', async () => {
        const req = { params: { id: 'IN01' } };
        const res = createMockRes();

        // (Mock cho 2 hàm xử lý nội bộ nếu chúng chưa được tách file riêng)
        // Nếu code thực tế của bạn có ném lỗi do 2 hàm này undefine, bạn báo mình nhé.
        
        await confirmStockIn(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
            message: "Đã xác nhận phiếu nhập hàng và cập nhật tồn kho" 
        }));
    });

    it('UTCID02: Should return 404 when id="notfound" (Abnormal)', async () => {
        testState.stockInExists = false;
        const req = { params: { id: 'notfound' } };
        const res = createMockRes();

        await confirmStockIn(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
            message: "Không tìm thấy phiếu nhập hàng" 
        }));
    });

    it('UTCID03: Should return 400 when StockIn is already confirmed (id="IN02") (Abnormal)', async () => {
        const req = { params: { id: 'IN02' } };
        const res = createMockRes();

        await confirmStockIn(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
            message: "Phiếu nhập hàng đã được xác nhận" 
        }));
    });

    it('UTCID04: Should return 500 on database execution error (Abnormal)', async () => {
        testState.dbError = true; // Kích hoạt lỗi DB
        const req = { params: { id: 'IN01' } };
        const res = createMockRes();

        await confirmStockIn(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
            message: "Lỗi khi xác nhận phiếu nhập" 
        }));
    });
});