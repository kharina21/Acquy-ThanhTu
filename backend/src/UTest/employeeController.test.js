import { describe, it, expect, vi, beforeEach } from 'vitest';

// ===== 1. KHAI BÁO MOCK VỚI vi.hoisted =====
const { employeeModelMock, userModelMock } = vi.hoisted(() => {
    return {
        employeeModelMock: {
            find: vi.fn(),
            findOne: vi.fn(),
            findById: vi.fn(),
            create: vi.fn(),
            countDocuments: vi.fn(),
        },
        userModelMock: {
            findById: vi.fn(),
        }
    };
});

// ===== 2. ĐĂNG KÝ vi.mock =====
vi.mock('../models/Employee.js', () => ({ default: employeeModelMock }));
vi.mock('../models/User.js', () => ({ default: userModelMock }));

import {
    getAllEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee
} from '../controllers/employeeController.js';

// ===== 3. HELPER TẠO RES GIẢ VÀ CHUỖI MONGOOSE =====
const createMockRes = () => ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
});

// Hỗ trợ Mongoose chaining (kèm cả select cho hàm getNextEmpCode)
const mockQueryChain = (data) => {
    const chain = {
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(data),
    };
    // Phép thuật: Trực tiếp biến chain thành một Promise để await có thể resolve Data
    // Kể cả khi Controller không dùng .lean() ở cuối
    chain.then = (resolve) => resolve(data);
    return chain;
};

// ===== 4. TEST SUITE CHÍNH =====
describe('employeeController', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // -----------------------------------------------------------------
    // MODULE 1: getAllEmployees (Lấy danh sách nhân viên)
    // -----------------------------------------------------------------
    describe('getAllEmployees', () => {
        it('UTCID01: Trả về 200 với query mặc định', async () => {
            const req = { query: {} };
            const res = createMockRes();

            employeeModelMock.find.mockReturnValue(mockQueryChain([{ _id: 'emp1' }]));
            employeeModelMock.countDocuments.mockResolvedValue(1);

            await getAllEmployees(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(employeeModelMock.find).toHaveBeenCalledWith({ isDeleted: false });
        });

        it('UTCID02: Trả về 200 khi lọc theo status và locationId', async () => {
            const req = { query: { status: 'active', locationId: 'loc1' } };
            const res = createMockRes();

            employeeModelMock.find.mockReturnValue(mockQueryChain([]));
            employeeModelMock.countDocuments.mockResolvedValue(0);

            await getAllEmployees(req, res);

            expect(employeeModelMock.find).toHaveBeenCalledWith(expect.objectContaining({
                isDeleted: false,
                isActive: true,
                $or: expect.any(Array)
            }));
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('UTCID03: Trả về 500 khi DB lỗi', async () => {
            const req = { query: {} };
            const res = createMockRes();

            employeeModelMock.find.mockImplementation(() => { throw new Error('DB Error') });

            await getAllEmployees(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // -----------------------------------------------------------------
    // MODULE 2: getEmployeeById (Xem chi tiết)
    // -----------------------------------------------------------------
    describe('getEmployeeById', () => {
        it('UTCID01: Trả về 200 khi tìm thấy nhân viên', async () => {
            const req = { params: { id: 'emp1' } };
            const res = createMockRes();
            const fakeEmp = { _id: 'emp1', empCode: 'NV00001' };

            // Đã fix: Dùng mockQueryChain chuẩn để resolve data
            employeeModelMock.findOne.mockReturnValue(mockQueryChain(fakeEmp));

            await getEmployeeById(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: { employee: fakeEmp } }));
        });

        it('UTCID02: Trả về 404 khi không tìm thấy nhân viên', async () => {
            const req = { params: { id: 'not-found' } };
            const res = createMockRes();

            // Đã fix: Resolve null để mô phỏng DB không tìm thấy
            employeeModelMock.findOne.mockReturnValue(mockQueryChain(null));

            await getEmployeeById(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Không tìm thấy nhân viên' });
        });

        it('UTCID03: Trả về 500 khi DB lỗi', async () => {
            const req = { params: { id: 'emp1' } };
            const res = createMockRes();

            employeeModelMock.findOne.mockImplementation(() => { throw new Error('DB Error') });

            await getEmployeeById(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // -----------------------------------------------------------------
    // MODULE 3: createEmployee (Tạo hồ sơ nhân viên)
    // -----------------------------------------------------------------
    describe('createEmployee', () => {
        it('UTCID01: Trả về 400 nếu thiếu userId', async () => {
            const req = { body: {} };
            const res = createMockRes();

            await createEmployee(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Thiếu userId' });
        });

        it('UTCID02: Trả về 400 nếu mã nhân viên sai định dạng', async () => {
            const req = { body: { userId: 'u1', empCode: 'ABC' } };
            const res = createMockRes();

            await createEmployee(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('UTCID03: Trả về 400 nếu mã nhân viên đã tồn tại', async () => {
            const req = { body: { userId: 'u1', empCode: 'NV00001' } };
            const res = createMockRes();

            employeeModelMock.findOne.mockResolvedValue({ _id: 'emp1' }); // Bị trùng

            await createEmployee(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Mã nhân viên đã tồn tại' });
        });

        it('UTCID04: Trả về 404 nếu không tìm thấy User', async () => {
            const req = { body: { userId: 'u1', empCode: 'NV00002' } };
            const res = createMockRes();

            employeeModelMock.findOne.mockResolvedValue(null); // Không trùng mã
            userModelMock.findById.mockResolvedValue(null);    // Không tìm thấy user

            await createEmployee(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('UTCID05: Trả về 400 nếu User không có quyền nhân viên (isStaff = false)', async () => {
            const req = { body: { userId: 'u1' } };
            const res = createMockRes();

            employeeModelMock.find.mockReturnValue({ select: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue([]) });
            
            userModelMock.findById.mockReturnValue({
                populate: vi.fn().mockResolvedValue({ roles: [{ name: 'admin' }] })
            });

            await createEmployee(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Chỉ tạo hồ sơ nhân viên cho tài khoản nhân viên' });
        });

        it('UTCID06: Trả về 400 nếu User đang có hồ sơ nhân viên Active', async () => {
            const req = { body: { userId: 'u1' } };
            const res = createMockRes();

            employeeModelMock.find.mockReturnValue({ select: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue([]) });
            userModelMock.findById.mockReturnValue({ populate: vi.fn().mockResolvedValue({ roles: [{ name: 'staff' }] }) });
            
            // Đã có hồ sơ và chưa xóa
            employeeModelMock.findOne.mockResolvedValue({ _id: 'emp1', isDeleted: false });

            await createEmployee(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Nhân viên này đã có hồ sơ' });
        });

        it('UTCID07: Trả về 200 (Khôi phục) nếu User có hồ sơ nhưng đã bị xóa mềm', async () => {
            const req = { body: { userId: 'u1' } };
            const res = createMockRes();
            const existingEmp = { _id: 'emp1', isDeleted: true, save: vi.fn() };

            employeeModelMock.find.mockReturnValue({ select: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue([]) });
            userModelMock.findById.mockReturnValue({ populate: vi.fn().mockResolvedValue({ roles: [{ name: 'staff' }] }) });
            
            // FIX LỖI Ở ĐÂY: Hàm findOne được gọi 2 lần trong Controller, nên phải mock 2 lần trả về khác nhau
            employeeModelMock.findOne
                .mockResolvedValueOnce(existingEmp) // Lần 1: findOne({ user: userId }) -> Tìm ra người cũ
                .mockResolvedValueOnce(null);       // Lần 2: findOne({ empCode }) -> Kiểm tra trùng mã code -> Không trùng

            employeeModelMock.findById.mockReturnValue(mockQueryChain(existingEmp));

            await createEmployee(req, res);
            expect(existingEmp.save).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Khôi phục và cập nhật hồ sơ nhân viên thành công' }));
        });

        it('UTCID08: Trả về 201 tạo mới nhân viên thành công', async () => {
            const req = { body: { userId: 'u1' } }; // Không cấp empCode để hệ thống tự tạo
            const res = createMockRes();

            employeeModelMock.find.mockReturnValue({ select: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue([]) });
            userModelMock.findById.mockReturnValue({ populate: vi.fn().mockResolvedValue({ roles: [{ name: 'staff' }] }) });
            employeeModelMock.findOne.mockResolvedValue(null); // Chưa có hồ sơ
            
            const newEmp = { _id: 'emp-new' };
            employeeModelMock.create.mockResolvedValue(newEmp);
            employeeModelMock.findById.mockReturnValue(mockQueryChain(newEmp));

            await createEmployee(req, res);
            expect(employeeModelMock.create).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Tạo hồ sơ nhân viên thành công' }));
        });

        it('UTCID09: Trả về 500 khi DB lỗi', async () => {
            const req = { body: { userId: 'u1' } };
            const res = createMockRes();
            employeeModelMock.find.mockImplementation(() => { throw new Error('DB Error') });

            await createEmployee(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // -----------------------------------------------------------------
    // MODULE 4: updateEmployee (Cập nhật hồ sơ)
    // -----------------------------------------------------------------
    describe('updateEmployee', () => {
        it('UTCID01: Trả về 404 khi không tìm thấy nhân viên', async () => {
            const req = { params: { id: 'emp1' }, body: {} };
            const res = createMockRes();

            employeeModelMock.findOne.mockResolvedValue(null);

            await updateEmployee(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('UTCID02: Trả về 400 nếu sửa mã nhân viên thành định dạng sai', async () => {
            const req = { params: { id: 'emp1' }, body: { empCode: 'SAI_CODE' } };
            const res = createMockRes();

            employeeModelMock.findOne.mockResolvedValue({ _id: 'emp1' });

            await updateEmployee(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Mã nhân viên phải có dạng NV + 5 chữ số (ví dụ: NV00001)' }));
        });

        it('UTCID03: Trả về 400 nếu sửa mã nhân viên trùng với người khác', async () => {
            const req = { params: { id: 'emp1' }, body: { empCode: 'NV00002' } };
            const res = createMockRes();

            employeeModelMock.findOne
                .mockResolvedValueOnce({ _id: 'emp1' }) // Tìm thấy NV cần sửa
                .mockResolvedValueOnce({ _id: 'emp2' }); // Trùng mã NV với thằng emp2

            await updateEmployee(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Mã nhân viên đã tồn tại' });
        });

        it('UTCID04: Trả về 200 cập nhật thành công', async () => {
            const req = { params: { id: 'emp1' }, body: { baseSalary: 1000, isActive: false } };
            const res = createMockRes();
            const empMock = { _id: 'emp1', baseSalary: 500, save: vi.fn() };

            employeeModelMock.findOne.mockResolvedValue(empMock);
            employeeModelMock.findById.mockReturnValue(mockQueryChain(empMock));

            await updateEmployee(req, res);
            
            expect(empMock.save).toHaveBeenCalled();
            expect(empMock.baseSalary).toBe(1000); // Đã update field
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Cập nhật hồ sơ nhân viên thành công' }));
        });

        it('UTCID05: Trả về 500 khi DB lỗi', async () => {
            const req = { params: { id: 'emp1' }, body: {} };
            const res = createMockRes();
            employeeModelMock.findOne.mockRejectedValue(new Error('DB Error'));

            await updateEmployee(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // -----------------------------------------------------------------
    // MODULE 5: deleteEmployee (Xóa mềm)
    // -----------------------------------------------------------------
    describe('deleteEmployee', () => {
        it('UTCID01: Trả về 404 khi không tìm thấy hoặc đã xóa', async () => {
            const req = { params: { id: 'not-found' } };
            const res = createMockRes();

            employeeModelMock.findById.mockResolvedValue(null);

            await deleteEmployee(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Không tìm thấy nhân viên' });
        });

        it('UTCID02: Trả về 200 và xóa mềm (isDeleted = true) thành công', async () => {
            const req = { params: { id: 'emp1' } };
            const res = createMockRes();
            const empMock = { _id: 'emp1', isDeleted: false, isActive: true, save: vi.fn() };

            employeeModelMock.findById.mockResolvedValue(empMock);

            await deleteEmployee(req, res);

            expect(empMock.isDeleted).toBe(true);
            expect(empMock.isActive).toBe(false);
            expect(empMock.save).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: 'Xóa hồ sơ nhân viên thành công', success: true });
        });

        it('UTCID03: Trả về 500 khi DB lỗi', async () => {
            const req = { params: { id: 'emp1' } };
            const res = createMockRes();
            employeeModelMock.findById.mockRejectedValue(new Error('DB Error'));

            await deleteEmployee(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});