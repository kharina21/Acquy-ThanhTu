// backend/src/UTest/batteryTradeInController.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ===== 1. HOISTED MOCKS & SHARED STATE =====
const {
    testState,
    mongooseMock,
    batteryTradeInMock,
    locationMock,
    managerLocationHelperMock,
    emailHelperMock
} = vi.hoisted(() => {
    // SHARED STATE
    const state = {
        dbError: false,
        requestExists: true,
        tradeInStatus: 'pending', // default status
        allowedLocIds: null, // null = admin, array = manager
    };

    const createQueryMock = (data) => {
        const chain = {
            select: vi.fn(() => chain),
            populate: vi.fn(() => chain),
            lean: vi.fn(async () => {
                if (state.dbError) throw new Error('DB Error');
                return data;
            }),
            then: vi.fn((resolve, reject) => {
                if (state.dbError) return reject(new Error('DB Error'));
                return resolve(data);
            })
        };
        return chain;
    };

    return {
        testState: state,
        mongooseMock: {
            Types: {
                ObjectId: {
                    isValid: vi.fn(() => true) // Giả lập mọi ID đều hợp lệ để pass qua validation
                }
            }
        },
        batteryTradeInMock: {
            findOne: vi.fn((query) => {
                if (state.dbError) return createQueryMock(null); // Will throw in lean()
                if (!state.requestExists) return createQueryMock(null);
                
                // Trả về mock data cho lookup
                return createQueryMock({
                    _id: 'req_id',
                    requestCode: 'TC-2026-1234ABCD',
                    email: 'test@gmail.com',
                    status: state.tradeInStatus,
                    preferredLocationId: 'loc1',
                    source: 'online',
                });
            }),
            findById: vi.fn((id) => {
                if (!state.requestExists) return createQueryMock(null);
                
                // Hỗ trợ UTCID01 (req1 - pending) và UTCID02 (req2 - completed) của updateStatus
                const statusToReturn = id === 'req2' ? 'completed' : state.tradeInStatus;
                
                return createQueryMock({
                    _id: id,
                    requestCode: 'TC-2026-1234ABCD',
                    email: 'test@gmail.com',
                    status: statusToReturn,
                    preferredLocationId: 'loc1',
                    source: 'online',
                });
            }),
            create: vi.fn(async () => {
                if (state.dbError) throw new Error('DB Error');
                return { _id: 'new_tradein_id' };
            }),
            findByIdAndUpdate: vi.fn(() => {
                if (state.dbError) throw new Error('DB Error');
                return createQueryMock({ _id: 'req_id', status: 'updated' });
            }),
            countDocuments: vi.fn(async () => 0),
            find: vi.fn(() => createQueryMock([]))
        },
        locationMock: {
            findById: vi.fn((id) => {
                // Trả về cơ sở luôn hoạt động
                return createQueryMock({ _id: id, isActive: true });
            })
        },
        managerLocationHelperMock: {
            getManagerAllowedLocationIds: vi.fn(async () => state.allowedLocIds)
        },
        emailHelperMock: {
            sendBatteryTradeInConfirmationEmail: vi.fn(async () => true),
            sendBatteryTradeInStatusUpdateEmail: vi.fn(async () => true)
        }
    };
});

// ===== 2. MOCK REGISTRATION =====
vi.mock('mongoose', () => ({ default: mongooseMock }));
vi.mock('../models/BatteryTradeIn.js', () => ({ default: batteryTradeInMock }));
vi.mock('../models/Location.js', () => ({ default: locationMock }));
vi.mock('../libs/managerLocationHelper.js', () => managerLocationHelperMock);
vi.mock('../libs/emailHelper.js', () => emailHelperMock);

// Mock Cloudinary upload function (bypass upload checking)
vi.mock('../utils/cloudinary.js', () => ({ uploadImageFromBuffer: vi.fn() }));

// Import controllers
import {
    lookupBatteryTradeIn,
    submitBatteryTradeIn,
    updateBatteryTradeInStatus
} from '../controllers/batteryTradeInController.js';

const createMockRes = () => ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
});

// ===== 3. TEST SUITES =====
describe('batteryTradeInController - Excel Matrix Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => {});
        
        // Reset state trước mỗi test case
        testState.dbError = false;
        testState.requestExists = true;
        testState.tradeInStatus = 'pending';
        testState.allowedLocIds = null; // Mặc định là Admin
    });

    // ==========================================
    // MODULE 1: lookupBatteryTradeIn
    // ==========================================
    describe('1. lookupBatteryTradeIn', () => {
        it('UTCID01: code: "TC-2026-1234ABCD", email: "test@gmail.com" (Normal)', async () => {
            const req = { body: { code: 'TC-2026-1234ABCD', email: 'test@gmail.com' } };
            const res = createMockRes();
            await lookupBatteryTradeIn(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('UTCID02: code: "", email: "test@gmail.com" (Missing code or email) (Abnormal)', async () => {
            const req = { body: { code: '', email: 'test@gmail.com' } }; 
            const res = createMockRes();
            await lookupBatteryTradeIn(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Vui lòng nhập mã yêu cầu và email Gmail." }));
        });

        it('UTCID03: code: "TC-WRONG-FORMAT" (invalid format) (Abnormal)', async () => {
            const req = { body: { code: 'TC-WRONG-FORMAT', email: 'test@gmail.com' } };
            const res = createMockRes();
            await lookupBatteryTradeIn(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Mã yêu cầu không đúng định dạng (ví dụ: TC-2025-AB12CD34)." }));
        });

        it('UTCID04: code: "TC-2026-1111AAAA", email: "test1@gmail.com" (not found) (Abnormal)', async () => {
            testState.requestExists = false; 
            // Lưu ý: Dùng mã hợp lệ Regex để pass qua validation và tiến vào logic DB check Not Found 404
            const req = { body: { code: 'TC-2026-1111AAAA', email: 'test1@gmail.com' } };
            const res = createMockRes();
            await lookupBatteryTradeIn(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Không tìm thấy yêu cầu. Kiểm tra lại mã và email đã dùng khi gửi đơn." }));
        });

        it('UTCID05: code: "TC-2026-1234ABCD", email: "test@gmail.com" (DB Error) (Abnormal)', async () => {
            testState.dbError = true;
            const req = { body: { code: 'TC-2026-1234ABCD', email: 'test@gmail.com' } };
            const res = createMockRes();
            await lookupBatteryTradeIn(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Lỗi khi tra cứu yêu cầu." }));
        });
    });

    // ==========================================
    // MODULE 2: submitBatteryTradeIn
    // ==========================================
    describe('2. submitBatteryTradeIn', () => {
        // Base valid payload
        const validPayload = {
            name: 'Nguyen Van A', phone: '0901234567', email: 'test@gmail.com',
            addressLine: '123 Valid Street', provinceCode: '01', districtCode: '001', wardCode: '0001',
            batteryName: 'Acquy Dong Nai', quantity: 1, manufacturingDate: '2022-01-01', expiryDate: '2025-01-01',
            pricingType: 'ampe', remainingAmps: 50, images: ['img1.jpg', 'img2.jpg']
        };

        it('UTCID01: Valid all data (name, phone, dates, >=2 images) (Normal)', async () => {
            const req = { body: validPayload, user: null };
            const res = createMockRes();
            await submitBatteryTradeIn(req, res);
            // Code controller trả về 201 cho creation success
            expect(res.status).toHaveBeenCalledWith(201); 
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Đã gửi yêu cầu thu cũ thành công. Cửa hàng sẽ liên hệ với bạn sớm." }));
        });

        it('UTCID02: Invalid email format (not @gmail.com) (Abnormal)', async () => {
            const req = { body: { ...validPayload, email: 'test@yahoo.com' }, user: null };
            const res = createMockRes();
            await submitBatteryTradeIn(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Vui lòng nhập đúng định dạng Gmail (ví dụ: ten@gmail.com)" }));
        });

        it('UTCID03: Empty images array or only 1 image (Abnormal)', async () => {
            const req = { body: { ...validPayload, images: ['only_one_image.jpg'] }, user: null };
            const res = createMockRes();
            await submitBatteryTradeIn(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Vui lòng tải ít nhất 2 ảnh ắc quy cũ" }));
        });

        it('UTCID04: Expiry date <= Manufacturing date (Abnormal)', async () => {
            const req = { body: { ...validPayload, manufacturingDate: '2025-01-01', expiryDate: '2022-01-01' }, user: null };
            const res = createMockRes();
            await submitBatteryTradeIn(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Hạn sử dụng phải sau ngày sản xuất" }));
        });

        it('UTCID05: Valid data (Trigger Database Error) (Abnormal)', async () => {
            testState.dbError = true;
            const req = { body: validPayload, user: null };
            const res = createMockRes();
            await submitBatteryTradeIn(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Lỗi khi gửi yêu cầu thu cũ." }));
        });
    });

    // ==========================================
    // MODULE 3: updateBatteryTradeInStatus
    // ==========================================
    describe('3. updateBatteryTradeInStatus', () => {
        it('UTCID01: id: "req1", status: "contacted", valid appointment (Normal)', async () => {
            testState.tradeInStatus = 'pending'; // Trạng thái hiện tại
            const req = { 
                params: { id: 'req1' }, 
                body: { status: 'contacted', appointmentAt: '2026-05-01T00:00:00.000Z', appointmentLocationId: 'loc1' }, 
                user: { _id: 'admin_id' } 
            };
            const res = createMockRes();
            await updateBatteryTradeInStatus(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('UTCID02: id: "req2", status: "pending" (Already completed) (Abnormal)', async () => {
            // Mock sẽ trả về 'completed' khi ID là req2 (dựa trên setup ở trên)
            const req = { params: { id: 'req2' }, body: { status: 'pending' }, user: { _id: 'admin_id' } };
            const res = createMockRes();
            await updateBatteryTradeInStatus(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Không thể thay đổi trạng thái sau khi đã hoàn thành hoặc đã hủy." }));
        });

        it('UTCID03: id: "req1", status: "contacted", missing appointment info (Abnormal)', async () => {
            testState.tradeInStatus = 'pending';
            const req = { params: { id: 'req1' }, body: { status: 'contacted' }, user: { _id: 'admin_id' } };
            const res = createMockRes();
            await updateBatteryTradeInStatus(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Vui lòng chọn thời gian đã xác nhận với khách." }));
        });

        it('UTCID04: id: "not-found", status: "contacted" (Abnormal)', async () => {
            testState.requestExists = false;
            const req = { params: { id: 'not-found' }, body: { status: 'contacted' }, user: { _id: 'admin_id' } };
            const res = createMockRes();
            await updateBatteryTradeInStatus(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Không tìm thấy yêu cầu thu cũ." }));
        });

        it('UTCID05: id: "req1", status: "contacted", unauthorized branch (Abnormal)', async () => {
            testState.tradeInStatus = 'pending';
            // User là manager chỉ được phép truy cập 'loc1'
            testState.allowedLocIds = ['loc1']; 
            
            // Nhưng lại cố gắng đặt lịch hẹn tại 'loc2'
            const req = { 
                params: { id: 'req1' }, 
                body: { status: 'contacted', appointmentAt: '2026-05-01T00:00:00.000Z', appointmentLocationId: 'loc2' }, 
                user: { _id: 'manager_id' } 
            };
            const res = createMockRes();
            await updateBatteryTradeInStatus(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Không được hẹn tại chi nhánh ngoài phạm vi được phân công." }));
        });

        it('UTCID06: Valid data (Trigger Database Error) (Abnormal)', async () => {
            testState.dbError = true;
            const req = { params: { id: 'req1' }, body: { status: 'cancelled' }, user: { _id: 'admin_id' } };
            const res = createMockRes();
            await updateBatteryTradeInStatus(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Lỗi khi cập nhật trạng thái." }));
        });
    });
});