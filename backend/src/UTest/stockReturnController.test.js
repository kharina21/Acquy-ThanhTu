// backend/src/UTest/stockReturnController.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ===== 1. HOISTED MOCKS & SHARED STATE =====
const {
    testState,
    stockInMock,
    productStockMock,
    stockReturnMock
} = vi.hoisted(() => {
    // SHARED STATE để điều khiển kịch bản test
    const state = {
        dbError: false,
        stockInStatus: 'confirmed',
        importedQty: 10,
        alreadyReturnedQty: 0,
        physicalStockQty: 100,
        stockInSerials: [], // legacy field trên mock phiếu nhập (không còn validate trả theo seri)
    };

    const createChain = (data) => ({
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn(async () => {
            if (state.dbError) throw new Error('DB Error');
            return data;
        }),
        then: (resolve, reject) => state.dbError ? reject(new Error('DB Error')) : resolve(data)
    });

    // Mock instance method save() cho Model StockReturn
    const mockStockReturnInstance = {
        _id: 'new_return_id',
        save: vi.fn(async () => {
            if (state.dbError) throw new Error('DB Error');
            return true;
        })
    };

    // Khởi tạo hàm constructor mock cho StockReturn
    const MockStockReturn = vi.fn(() => mockStockReturnInstance);

    // Gắn các static methods vào constructor
    MockStockReturn.find = vi.fn(() => createChain([
        { items: [{ product: 'A', quantity: state.alreadyReturnedQty }] }
    ]));
    MockStockReturn.findOne = vi.fn().mockResolvedValue(null); // Giả lập không trùng mã code
    MockStockReturn.findById = vi.fn(() => createChain({
        _id: 'new_return_id',
        code: 'RET-01',
        stockIn: 'IN01',
        items: []
    }));

    return {
        testState: state,
        stockInMock: {
            findById: vi.fn((id) => {
                if (state.dbError) return createChain(null);
                
                // Trả về phiếu nhập hợp lệ
                return createChain({
                    _id: id,
                    status: id === 'IN02' ? 'pending' : state.stockInStatus,
                    location: 'loc_123',
                    items: [{ 
                        product: { _id: 'A', name: 'Product A' }, 
                        quantity: state.importedQty,
                        serials: state.stockInSerials
                    }]
                });
            })
        },
        productStockMock: {
            findOne: vi.fn(() => createChain({ quantity: state.physicalStockQty })),
            findOneAndUpdate: vi.fn(async () => {
                if (state.dbError) throw new Error('DB Error');
                return true;
            })
        },
        stockReturnMock: MockStockReturn
    };
});

// ===== 2. MOCK REGISTRATION =====
vi.mock('../models/StockIn.js', () => ({ default: stockInMock }));
vi.mock('../models/ProductStock.js', () => ({ default: productStockMock }));
vi.mock('../models/StockReturn.js', () => ({ default: stockReturnMock }));

// Import controller
import { createStockReturn } from '../controllers/stockReturnController.js';

const createMockRes = () => ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
});

// ===== 3. TEST SUITES =====
describe('stockReturnController - createStockReturn', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => {});

        // Reset trạng thái trước mỗi test case
        testState.dbError = false;
        testState.stockInStatus = 'confirmed';
        testState.importedQty = 10;
        testState.alreadyReturnedQty = 0;
        testState.physicalStockQty = 100;
        testState.stockInSerials = [];
    });

    it('UTCID01: Should create successfully with valid qty & serials (Normal)', async () => {
        const req = { 
            user: { _id: 'admin_id' },
            body: { 
                code: 'RET-01', // Truyền sẵn code để bỏ qua hàm generate code nội bộ
                stockInId: 'IN01', 
                items: [{ product: 'A', quantity: 2 }] 
            } 
        };
        const res = createMockRes();

        await createStockReturn(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
            message: "Tạo phiếu trả hàng thành công" 
        }));
    });

    it('UTCID02: Should return 400 when StockIn is unconfirmed (IN02 is "pending") (Abnormal)', async () => {
        const req = { 
            user: { _id: 'admin_id' },
            body: { stockInId: 'IN02', items: [{ product: 'A', quantity: 2 }] } 
        };
        const res = createMockRes();

        await createStockReturn(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
            message: "Chỉ được trả hàng từ phiếu nhập đã xác nhận" 
        }));
    });

    it('UTCID03: Should return 400 when return quantity exceeds max returnable (Abnormal)', async () => {
        testState.importedQty = 5;
        testState.alreadyReturnedQty = 2; // Còn lại tối đa được trả là 3
        const req = { 
            user: { _id: 'admin_id' },
            body: { stockInId: 'IN01', items: [{ product: 'A', quantity: 5 }] } // Đòi trả 5 -> Lỗi
        };
        const res = createMockRes();

        await createStockReturn(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
            message: expect.stringContaining("Số lượng trả vượt quá số còn lại được trả") 
        }));
    });

    it('UTCID04: Should return 400 when current physical available is insufficient (Abnormal)', async () => {
        testState.physicalStockQty = 0; // Hàng đã bán hết, kho vật lý = 0
        const req = { 
            user: { _id: 'admin_id' },
            body: { stockInId: 'IN01', items: [{ product: 'A', quantity: 2 }] } 
        };
        const res = createMockRes();

        await createStockReturn(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
            message: expect.stringContaining("Tồn kho không đủ để trả") 
        }));
    });

    it('UTCID05: Should create when legacy stock-in has serials on file (seri không còn bắt buộc)', async () => {
        testState.stockInSerials = ['S1', 'S2', 'S3'];
        const req = {
            user: { _id: 'admin_id' },
            body: {
                code: 'RET-05',
                stockInId: 'IN01',
                items: [{ product: 'A', quantity: 2 }],
            },
        };
        const res = createMockRes();

        await createStockReturn(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                message: 'Tạo phiếu trả hàng thành công',
            }),
        );
    });

    it('UTCID06: Should return 500 on database execution error (Abnormal)', async () => {
        testState.dbError = true;
        const req = { 
            user: { _id: 'admin_id' },
            body: { code: 'RET-01', stockInId: 'IN01', items: [{ product: 'A', quantity: 2 }] } 
        };
        const res = createMockRes();

        await createStockReturn(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
            message: "Lỗi khi tạo phiếu trả hàng" 
        }));
    });
});