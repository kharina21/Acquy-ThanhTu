// backend/src/UTest/categoryController.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ===== 1. KHAI BÁO MOCK =====
const {
    categoryMock,
    mockCategoryInstance,
    productMock,
    logAuthActivityMock,
    getClientIpMock,
    getUserAgentMock
} = vi.hoisted(() => {
    const mockCategoryInstance = {
        save: vi.fn(),
        name: 'MockName',
        description: 'MockDesc',
        _id: 'mock-id'
    };

    const CategoryFunction = vi.fn(function() {
        return mockCategoryInstance;
    });
    
    CategoryFunction.find = vi.fn();
    CategoryFunction.findById = vi.fn();
    CategoryFunction.findOne = vi.fn();
    CategoryFunction.findByIdAndDelete = vi.fn();

    return {
        categoryMock: CategoryFunction,
        mockCategoryInstance,
        productMock: {
            countDocuments: vi.fn(),
        },
        logAuthActivityMock: vi.fn(),
        getClientIpMock: vi.fn(() => '127.0.0.1'),
        getUserAgentMock: vi.fn(() => 'vitest-agent'),
    };
});

// ===== 2. ĐĂNG KÝ MOCK =====
vi.mock('../models/Category.js', () => ({ default: categoryMock }));
vi.mock('../models/Product.js', () => ({ default: productMock }));
vi.mock('../libs/activityLogger.js', () => ({
    logAuthActivity: logAuthActivityMock,
    getClientIp: getClientIpMock,
    getUserAgent: getUserAgentMock,
}));

import {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory
} from '../controllers/categoryController.js';

const createMockRes = () => ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
});

// ===== 4. TEST SUITES =====
describe('categoryController', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ---------- getAllCategories ----------
    describe('getAllCategories', () => {
        it('UTCID01: Trả về 200 và danh sách categories (Success)', async () => {
            const req = {};
            const res = createMockRes();
            const fakeCategories = [{ _id: 'c1', name: 'Cat 1' }];

            categoryMock.find.mockReturnValue({
                sort: vi.fn().mockResolvedValue(fakeCategories)
            });

            await getAllCategories(req, res);

            expect(categoryMock.find).toHaveBeenCalledWith({});
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { categories: fakeCategories }
            });
        });

        it('UTCID02: Trả về 500 nếu có lỗi DB', async () => {
            const req = {};
            const res = createMockRes();

            categoryMock.find.mockReturnValue({
                sort: vi.fn().mockRejectedValue(new Error('DB Error'))
            });

            await getAllCategories(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Lỗi khi lấy danh sách loại hàng',
                error: 'DB Error'
            });
        });
    });

    // ---------- getCategoryById ----------
    describe('getCategoryById', () => {
        it('UTCID01: Trả về 200 nếu tìm thấy', async () => {
            const req = { params: { id: '65b2c3d4e5f6a70018b2c3d4' } };
            const res = createMockRes();
            const fakeCat = { _id: '65b2c3d4e5f6a70018b2c3d4', name: 'Cat' };

            categoryMock.findById.mockResolvedValue(fakeCat);

            await getCategoryById(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ success: true, data: { category: fakeCat } });
        });

        it('UTCID02: Trả về 404 nếu không tìm thấy', async () => {
            const req = { params: { id: '65c3d4e5f6a7b80019c3d4e5' } };
            const res = createMockRes();

            categoryMock.findById.mockResolvedValue(null);

            await getCategoryById(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Không tìm thấy loại hàng' });
        });

        it('UTCID03: Trả về 500 nếu DB lỗi', async () => {
            const req = { params: { id: 'id-loi-dinh-dang' } };
            const res = createMockRes();

            categoryMock.findById.mockRejectedValue(new Error('DB Lỗi'));

            await getCategoryById(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // ---------- createCategory ----------
    describe('createCategory', () => {
        it('UTCID01: Trả về 400 nếu tên bị bỏ trống', async () => {
            const req = { body: { name: '   ' }, user: { _id: '64a1b2c3d4e5f60017a1b2c3' } };
            const res = createMockRes();

            await createCategory(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Tên loại hàng là bắt buộc' });
        });

        it('UTCID02: Trả về 400 nếu tên đã tồn tại', async () => {
            const req = { body: { name: 'Laptop' }, user: { _id: '64a1b2c3d4e5f60017a1b2c3' } };
            const res = createMockRes();

            categoryMock.findOne.mockResolvedValue({ _id: '65b2c3d4e5f6a70018b2c3d4', name: 'Laptop' });

            await createCategory(req, res);

            expect(categoryMock.findOne).toHaveBeenCalledWith({ name: 'Laptop' });
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Loại hàng đã tồn tại' });
        });

        it('UTCID03: Trả về 201 tạo thành công và ghi log', async () => {
            const req = { 
                body: { name: 'Bàn phím', description: 'Mô tả' }, 
                user: { _id: '64a1b2c3d4e5f60017a1b2c3' } 
            };
            const res = createMockRes();

            categoryMock.findOne.mockResolvedValue(null);
            mockCategoryInstance.save.mockResolvedValue({});
            logAuthActivityMock.mockResolvedValue({});

            await createCategory(req, res);

            expect(mockCategoryInstance.save).toHaveBeenCalled();
            expect(logAuthActivityMock).toHaveBeenCalledWith(expect.objectContaining({ action: 'create' }));
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Tạo loại hàng thành công' }));
        });
    });

    // ---------- updateCategory ----------
    describe('updateCategory', () => {
        it('UTCID01: Trả về 404 nếu category không tồn tại', async () => {
            const req = { params: { id: '65c3d4e5f6a7b80019c3d4e5' }, body: { name: 'A' }, user: { _id: '64a1b2c3d4e5f60017a1b2c3' } };
            const res = createMockRes();

            categoryMock.findById.mockResolvedValue(null);

            await updateCategory(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Không tìm thấy loại hàng' });
        });

        it('UTCID02: Trả về 400 nếu tên update trống', async () => {
            const req = { params: { id: '65b2c3d4e5f6a70018b2c3d4' }, body: { name: '   ' }, user: { _id: '64a1b2c3d4e5f60017a1b2c3' } };
            const res = createMockRes();

            categoryMock.findById.mockResolvedValue({ _id: '65b2c3d4e5f6a70018b2c3d4', name: 'Cũ', save: vi.fn() });

            await updateCategory(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Tên loại hàng không được để trống' });
        });

        it('UTCID03: Trả về 400 nếu tên update bị trùng category khác', async () => {
            const req = { params: { id: '65b2c3d4e5f6a70018b2c3d4' }, body: { name: 'Điện thoại' }, user: { _id: '64a1b2c3d4e5f60017a1b2c3' } };
            const res = createMockRes();

            categoryMock.findById.mockResolvedValue({ _id: '65b2c3d4e5f6a70018b2c3d4', name: 'Cũ', save: vi.fn() });
            categoryMock.findOne.mockResolvedValue({ _id: '65e5f6a7b8c9d0001be5f6a7' }); // Trùng tên

            await updateCategory(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Tên loại hàng đã tồn tại' });
        });

        it('UTCID04: Trả về 200 update thành công và ghi log', async () => {
            const req = { params: { id: '65b2c3d4e5f6a70018b2c3d4' }, body: { name: 'Tên mới hợp lệ', description: 'Desc' }, user: { _id: '64a1b2c3d4e5f60017a1b2c3' } };
            const res = createMockRes();

            const fakeCat = { _id: '65b2c3d4e5f6a70018b2c3d4', name: 'Cũ', description: 'Cũ', save: vi.fn() };
            categoryMock.findById.mockResolvedValue(fakeCat);
            categoryMock.findOne.mockResolvedValue(null); // Không trùng

            await updateCategory(req, res);

            expect(fakeCat.name).toBe('Tên mới hợp lệ');
            expect(fakeCat.save).toHaveBeenCalled();
            expect(logAuthActivityMock).toHaveBeenCalledWith(expect.objectContaining({ action: 'update' }));
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    // ---------- deleteCategory ----------
    describe('deleteCategory', () => {
        it('UTCID01: Trả về 404 nếu category không tồn tại', async () => {
            const req = { params: { id: '65c3d4e5f6a7b80019c3d4e5' }, user: { _id: '64a1b2c3d4e5f60017a1b2c3' } };
            const res = createMockRes();

            categoryMock.findById.mockResolvedValue(null);

            await deleteCategory(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Không tìm thấy loại hàng' });
        });

        it('UTCID02: Trả về 400 nếu đang có Product sử dụng', async () => {
            const req = { params: { id: '65d4e5f6a7b8c9001ad4e5f6' }, user: { _id: '64a1b2c3d4e5f60017a1b2c3' } };
            const res = createMockRes();

            categoryMock.findById.mockResolvedValue({ _id: '65d4e5f6a7b8c9001ad4e5f6', name: 'Cat' });
            productMock.countDocuments.mockResolvedValue(5);

            await deleteCategory(req, res);

            expect(productMock.countDocuments).toHaveBeenCalledWith({ category: '65d4e5f6a7b8c9001ad4e5f6', isDeleted: false });
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('5 sản phẩm') }));
        });

        it('UTCID03: Trả về 200 xóa thành công và ghi log', async () => {
            const req = { params: { id: '65b2c3d4e5f6a70018b2c3d4' }, user: { _id: '64a1b2c3d4e5f60017a1b2c3' } };
            const res = createMockRes();

            categoryMock.findById.mockResolvedValue({ _id: '65b2c3d4e5f6a70018b2c3d4', name: 'Cat' });
            productMock.countDocuments.mockResolvedValue(0);

            await deleteCategory(req, res);

            expect(categoryMock.findByIdAndDelete).toHaveBeenCalledWith('65b2c3d4e5f6a70018b2c3d4');
            expect(logAuthActivityMock).toHaveBeenCalledWith(expect.objectContaining({ action: 'delete' }));
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Xóa loại hàng thành công' });
        });
    });
});