import { describe, it, expect, vi, beforeEach } from 'vitest';

// ===== 1. KHAI BÁO MOCK VỚI vi.hoisted =====
const { brandMock, productMock, activityLoggerMock } = vi.hoisted(() => {
    return {
        brandMock: {
            find: vi.fn(),
            findById: vi.fn(),
            findOne: vi.fn(),
            create: vi.fn(),
            findByIdAndDelete: vi.fn(),
        },
        productMock: {
            countDocuments: vi.fn(),
        },
        activityLoggerMock: {
            logAuthActivity: vi.fn(),
            getClientIp: vi.fn(() => '127.0.0.1'),
            getUserAgent: vi.fn(() => 'test-agent'),
        }
    };
});

// ===== 2. ĐĂNG KÝ vi.mock =====
vi.mock('../models/Brand.js', () => ({ default: brandMock }));
vi.mock('../models/Product.js', () => ({ default: productMock }));
vi.mock('../libs/activityLogger.js', () => activityLoggerMock);

import {
    getAllBrands,
    getBrandById,
    createBrand,
    updateBrand,
    deleteBrand
} from '../controllers/brandController.js';

// ===== 3. HELPER TẠO RES GIẢ VÀ CHUỖI MONGOOSE =====
const createMockRes = () => ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
});

// Xử lý chuỗi .sort() của getAllBrands
const mockSortChain = (data) => {
    const chain = {
        sort: vi.fn().mockReturnThis(),
    };
    chain.then = (resolve) => resolve(data);
    return chain;
};

// ===== 4. TEST SUITE CHÍNH =====
describe('brandController', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const mockUser = { _id: 'u1' };

    // -----------------------------------------------------------------
    // MODULE 1: getAllBrands
    // -----------------------------------------------------------------
    describe('getAllBrands', () => {
        it('UTCID01: Lấy danh sách thành công', async () => {
            const req = {};
            const res = createMockRes();
            const fakeBrands = [{ _id: 'b1', name: 'Nike' }];

            brandMock.find.mockReturnValue(mockSortChain(fakeBrands));

            await getAllBrands(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ success: true, data: { brands: fakeBrands } });
        });

        it('UTCID02: Trả về 500 khi DB lỗi', async () => {
            const req = {};
            const res = createMockRes();
            brandMock.find.mockImplementation(() => { throw new Error('DB Error'); });

            await getAllBrands(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // -----------------------------------------------------------------
    // MODULE 2: getBrandById
    // -----------------------------------------------------------------
    describe('getBrandById', () => {
        it('UTCID01: Trả về 200 khi tìm thấy thương hiệu', async () => {
            const req = { params: { id: 'b1' } };
            const res = createMockRes();
            const fakeBrand = { _id: 'b1', name: 'Nike' };

            brandMock.findById.mockResolvedValue(fakeBrand);

            await getBrandById(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ success: true, data: { brand: fakeBrand } });
        });

        it('UTCID02: Trả về 404 khi không tìm thấy thương hiệu', async () => {
            const req = { params: { id: 'not-found' } };
            const res = createMockRes();

            brandMock.findById.mockResolvedValue(null);

            await getBrandById(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Không tìm thấy thương hiệu' });
        });

        it('UTCID03: Trả về 500 khi DB lỗi', async () => {
            const req = { params: { id: 'b1' } };
            const res = createMockRes();
            brandMock.findById.mockRejectedValue(new Error('DB Error'));

            await getBrandById(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // -----------------------------------------------------------------
    // MODULE 3: createBrand
    // -----------------------------------------------------------------
    describe('createBrand', () => {
        it('UTCID01: Trả về 400 nếu tên thương hiệu trống', async () => {
            const req = { body: { name: '   ' } };
            const res = createMockRes();

            await createBrand(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Tên thương hiệu là bắt buộc' });
        });

        it('UTCID02: Trả về 400 nếu thương hiệu đã tồn tại', async () => {
            const req = { body: { name: 'Nike' } };
            const res = createMockRes();

            brandMock.findOne.mockResolvedValue({ _id: 'b1', name: 'Nike' });

            await createBrand(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Thương hiệu đã tồn tại' });
        });

        it('UTCID03: Trả về 201 tạo thương hiệu thành công và ghi log', async () => {
            const req = { user: mockUser, body: { name: 'Adidas', description: 'Giày thể thao' } };
            const res = createMockRes();
            const newBrand = { _id: 'b2', name: 'Adidas' };

            brandMock.findOne.mockResolvedValue(null);
            brandMock.create.mockResolvedValue(newBrand);

            await createBrand(req, res);

            expect(brandMock.create).toHaveBeenCalled();
            expect(activityLoggerMock.logAuthActivity).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Tạo thương hiệu thành công' }));
        });

        it('UTCID04: Trả về 400 nếu bắt được lỗi Duplicate Key 11000 từ Mongoose', async () => {
            const req = { user: mockUser, body: { name: 'Nike' } };
            const res = createMockRes();

            brandMock.findOne.mockResolvedValue(null);
            const duplicateError = new Error('Duplicate');
            duplicateError.code = 11000; // Mã lỗi kinh điển của MongoDB
            brandMock.create.mockRejectedValue(duplicateError);

            await createBrand(req, res);

            expect(activityLoggerMock.logAuthActivity).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Thương hiệu đã tồn tại' });
        });

        it('UTCID05: Trả về 500 khi gặp lỗi DB bất kỳ khác', async () => {
            const req = { user: mockUser, body: { name: 'Nike' } };
            const res = createMockRes();

            brandMock.findOne.mockResolvedValue(null);
            brandMock.create.mockRejectedValue(new Error('DB Error'));

            await createBrand(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // -----------------------------------------------------------------
    // MODULE 4: updateBrand
    // -----------------------------------------------------------------
    describe('updateBrand', () => {
        it('UTCID01: Trả về 404 khi không tìm thấy thương hiệu', async () => {
            const req = { params: { id: 'not-found' }, body: {} };
            const res = createMockRes();

            brandMock.findById.mockResolvedValue(null);

            await updateBrand(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('UTCID02: Trả về 400 nếu tên mới bị để trống', async () => {
            const req = { params: { id: 'b1' }, body: { name: '   ' } };
            const res = createMockRes();

            brandMock.findById.mockResolvedValue({ _id: 'b1', name: 'Old Name' });

            await updateBrand(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Tên thương hiệu không được để trống' });
        });

        it('UTCID03: Trả về 400 nếu tên mới trùng với thương hiệu khác', async () => {
            const req = { params: { id: 'b1' }, body: { name: 'Adidas' } };
            const res = createMockRes();

            brandMock.findById.mockResolvedValue({ _id: 'b1', name: 'Nike' });
            brandMock.findOne.mockResolvedValue({ _id: 'b2', name: 'Adidas' }); // Đã có b2 tên Adidas

            await updateBrand(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Tên thương hiệu đã tồn tại' });
        });

        it('UTCID04: Trả về 200 cập nhật thành công và ghi log', async () => {
            const req = { user: mockUser, params: { id: 'b1' }, body: { name: 'Nike Pro', description: 'New Desc' } };
            const res = createMockRes();
            const brandObj = { _id: 'b1', name: 'Nike', description: 'Old Desc', save: vi.fn() };

            brandMock.findById.mockResolvedValue(brandObj);
            brandMock.findOne.mockResolvedValue(null); // Không trùng ai

            await updateBrand(req, res);

            expect(brandObj.save).toHaveBeenCalled();
            expect(activityLoggerMock.logAuthActivity).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Cập nhật thương hiệu thành công' }));
        });

        it('UTCID05: Trả về 400 nếu lỗi Duplicate Key 11000 khi save', async () => {
            const req = { user: mockUser, params: { id: 'b1' }, body: { name: 'Nike Pro' } };
            const res = createMockRes();
            const brandObj = { _id: 'b1', save: vi.fn() };

            brandMock.findById.mockResolvedValue(brandObj);
            brandMock.findOne.mockResolvedValue(null);
            
            const duplicateError = new Error('Duplicate');
            duplicateError.code = 11000;
            brandObj.save.mockRejectedValue(duplicateError);

            await updateBrand(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Tên thương hiệu đã tồn tại' });
        });

        it('UTCID06: Trả về 500 khi có lỗi DB khác', async () => {
            const req = { user: mockUser, params: { id: 'b1' }, body: {} };
            const res = createMockRes();

            brandMock.findById.mockRejectedValue(new Error('DB Error'));

            await updateBrand(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // -----------------------------------------------------------------
    // MODULE 5: deleteBrand
    // -----------------------------------------------------------------
    describe('deleteBrand', () => {
        it('UTCID01: Trả về 404 khi không tìm thấy thương hiệu', async () => {
            const req = { params: { id: 'not-found' } };
            const res = createMockRes();

            brandMock.findById.mockResolvedValue(null);

            await deleteBrand(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('UTCID02: Trả về 400 nếu thương hiệu đang được sử dụng trong Product', async () => {
            const req = { params: { id: 'b1' } };
            const res = createMockRes();

            brandMock.findById.mockResolvedValue({ _id: 'b1', name: 'Nike' });
            productMock.countDocuments.mockResolvedValue(5); // Có 5 sản phẩm dùng Brand này

            await deleteBrand(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Không thể xóa thương hiệu này vì có 5 sản phẩm đang sử dụng' });
        });

        it('UTCID03: Trả về 200 xóa thành công nếu không có Product nào dùng', async () => {
            const req = { user: mockUser, params: { id: 'b1' } };
            const res = createMockRes();

            brandMock.findById.mockResolvedValue({ _id: 'b1', name: 'Nike' });
            productMock.countDocuments.mockResolvedValue(0); // An toàn để xóa

            await deleteBrand(req, res);

            expect(brandMock.findByIdAndDelete).toHaveBeenCalledWith('b1');
            expect(activityLoggerMock.logAuthActivity).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Xóa thương hiệu thành công' }));
        });

        it('UTCID04: Trả về 500 khi DB lỗi', async () => {
            const req = { user: mockUser, params: { id: 'b1' } };
            const res = createMockRes();

            brandMock.findById.mockRejectedValue(new Error('DB Error'));

            await deleteBrand(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});