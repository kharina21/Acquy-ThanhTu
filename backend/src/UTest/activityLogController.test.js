import { describe, it, expect, vi, beforeEach } from 'vitest';

// ===== 1. KHAI BÁO MOCK VỚI vi.hoisted =====
const { activityLogModelMock } = vi.hoisted(() => {
    return {
        activityLogModelMock: {
            find: vi.fn(),
            findById: vi.fn(),
            findByIdAndDelete: vi.fn(),
            countDocuments: vi.fn(),
        },
    };
});

// ===== 2. ĐĂNG KÝ vi.mock =====
vi.mock('../models/ActivityLog.js', () => ({ default: activityLogModelMock }));

// Import controller sau khi đã mock xong
import {
    getActivityLogs,
    getActivityLogById,
    getMyActivityLogs,
    deleteActivityLog
} from '../controllers/activityLogController.js';

// ===== 3. HELPER TẠO RES GIẢ VÀ CHUỖI MONGOOSE =====
const createMockRes = () => ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
});

// Hàm hỗ trợ giả lập chuỗi Mongoose (.populate.sort.skip.limit.lean)
const mockQueryChain = (data) => ({
    populate: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(data),
});

// ===== 4. TEST SUITE CHÍNH =====
describe('activityLogController', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // -----------------------------------------------------------------
    // MODULE 1: getActivityLogs (Admin lấy tất cả log)
    // -----------------------------------------------------------------
    describe('getActivityLogs', () => {
        it('UTCID01: Lấy danh sách thành công với query mặc định', async () => {
            const req = { query: {} };
            const res = createMockRes();

            activityLogModelMock.find.mockReturnValue(mockQueryChain([{ _id: 'log1' }]));
            activityLogModelMock.countDocuments.mockResolvedValue(1);

            await getActivityLogs(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('UTCID02: Lọc thành công theo userId, action, status', async () => {
            const req = { query: { userId: 'u1', action: 'CREATE', status: 'SUCCESS' } };
            const res = createMockRes();

            activityLogModelMock.find.mockReturnValue(mockQueryChain([{ _id: 'log1' }]));
            activityLogModelMock.countDocuments.mockResolvedValue(1);

            await getActivityLogs(req, res);

            expect(activityLogModelMock.find).toHaveBeenCalledWith(expect.objectContaining({
                userId: 'u1', action: 'CREATE', status: 'SUCCESS'
            }));
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('UTCID03: Lọc thành công theo ngày (startDate, endDate) và search text', async () => {
            const req = { query: { startDate: '2024-01-01', endDate: '2024-12-31', search: 'error' } };
            const res = createMockRes();

            activityLogModelMock.find.mockReturnValue(mockQueryChain([]));
            activityLogModelMock.countDocuments.mockResolvedValue(0);

            await getActivityLogs(req, res);

            expect(activityLogModelMock.find).toHaveBeenCalledWith(expect.objectContaining({
                createdAt: { $gte: expect.any(Date), $lte: expect.any(Date) },
                $or: expect.any(Array)
            }));
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('UTCID04: Trả 500 khi Database gặp lỗi', async () => {
            const req = { query: {} };
            const res = createMockRes();

            activityLogModelMock.find.mockImplementation(() => { throw new Error('DB Error'); });

            await getActivityLogs(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Lỗi khi lấy activity logs' }));
        });
    });

    // -----------------------------------------------------------------
    // MODULE 2: getActivityLogById (Xem chi tiết 1 log)
    // -----------------------------------------------------------------
    describe('getActivityLogById', () => {
        it('UTCID01: Trả về 200 và chi tiết log khi ID tồn tại', async () => {
            const req = { params: { id: 'log1' } };
            const res = createMockRes();
            const fakeLog = { _id: 'log1', action: 'UPDATE' };

            activityLogModelMock.findById.mockReturnValue({
                populate: vi.fn().mockReturnThis(),
                lean: vi.fn().mockResolvedValue(fakeLog)
            });

            await getActivityLogById(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ success: true, data: fakeLog });
        });

        it('UTCID02: Trả 404 khi không tìm thấy log', async () => {
            const req = { params: { id: 'not-found' } };
            const res = createMockRes();

            activityLogModelMock.findById.mockReturnValue({
                populate: vi.fn().mockReturnThis(),
                lean: vi.fn().mockResolvedValue(null)
            });

            await getActivityLogById(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Activity log không tồn tại' }));
        });

        it('UTCID03: Trả 500 khi Database gặp lỗi', async () => {
            const req = { params: { id: 'log1' } };
            const res = createMockRes();

            activityLogModelMock.findById.mockImplementation(() => { throw new Error('DB Error'); });

            await getActivityLogById(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // -----------------------------------------------------------------
    // MODULE 3: getMyActivityLogs (User xem log của chính họ)
    // -----------------------------------------------------------------
    describe('getMyActivityLogs', () => {
        it('UTCID01: Lấy thành công danh sách log của bản thân', async () => {
            const req = { user: { _id: 'u1' }, query: { action: 'LOGIN' } };
            const res = createMockRes();

            activityLogModelMock.find.mockReturnValue(mockQueryChain([{ _id: 'log1' }]));
            activityLogModelMock.countDocuments.mockResolvedValue(1);

            await getMyActivityLogs(req, res);

            expect(activityLogModelMock.find).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', action: 'LOGIN' }));
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('UTCID02: Trả 500 khi Database gặp lỗi', async () => {
            const req = { user: { _id: 'u1' }, query: {} };
            const res = createMockRes();

            activityLogModelMock.find.mockImplementation(() => { throw new Error('DB Error'); });

            await getMyActivityLogs(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // -----------------------------------------------------------------
    // MODULE 4: deleteActivityLog (Admin xóa log)
    // -----------------------------------------------------------------
    describe('deleteActivityLog', () => {
        it('UTCID01: Xóa thành công khi ID tồn tại -> Trả 200', async () => {
            const req = { params: { id: 'log1' } };
            const res = createMockRes();

            activityLogModelMock.findByIdAndDelete.mockResolvedValue({ _id: 'log1' });

            await deleteActivityLog(req, res);

            expect(activityLogModelMock.findByIdAndDelete).toHaveBeenCalledWith('log1');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Đã xóa activity log thành công' }));
        });

        it('UTCID02: Trả 404 khi ID không tồn tại', async () => {
            const req = { params: { id: 'not-found' } };
            const res = createMockRes();

            activityLogModelMock.findByIdAndDelete.mockResolvedValue(null);

            await deleteActivityLog(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Activity log không tồn tại' }));
        });

        it('UTCID03: Trả 500 khi Database gặp lỗi', async () => {
            const req = { params: { id: 'log1' } };
            const res = createMockRes();

            activityLogModelMock.findByIdAndDelete.mockRejectedValue(new Error('DB Error'));

            await deleteActivityLog(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});