// backend/src/UTest/paymentController.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ===== 1. HOISTED MOCKS & SHARED STATE =====
const {
    testState,
    mongooseMock,
    orderModelMock,
    customerModelMock,
    paymentLinkMock,
    payosHelperMock
} = vi.hoisted(() => {
    // SHARED STATE (The "Iron Hand")
    const state = {
        dbError: false,
        verifyError: false,
        verifyErrorMessage: 'Webhook verification failed',
        paymentLinkExists: true,
        paymentLinkStatus: 'pending',
        orderExists: true,
        mockOrderCode: 123456,
    };

    const createQueryMock = (data) => {
        const chain = {
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
                ObjectId: { isValid: vi.fn(() => true) }
            }
        },
        orderModelMock: {
            findById: vi.fn(async (id) => {
                if (state.dbError) throw new Error('DB Error');
                if (!state.orderExists) return null;
                return { _id: id, totalAmount: 500000, customerProfile: 'cust_profile_id' };
            }),
            findByIdAndUpdate: vi.fn(async () => {
                if (state.dbError) throw new Error('DB Error');
                return true;
            })
        },
        customerModelMock: {
            findByIdAndUpdate: vi.fn(async () => {
                if (state.dbError) throw new Error('DB Error');
                return true;
            })
        },
        paymentLinkMock: {
            findOne: vi.fn(() => {
                if (!state.paymentLinkExists) return createQueryMock(null);
                return createQueryMock({
                    _id: 'payment_link_id',
                    orderCode: state.mockOrderCode,
                    order: 'order_id',
                    status: state.paymentLinkStatus
                });
            }),
            updateOne: vi.fn(async () => {
                if (state.dbError) throw new Error('DB Error');
                return true;
            })
        },
        payosHelperMock: {
            verifyPayOSWebhook: vi.fn(async (body) => {
                if (state.verifyError) throw new Error(state.verifyErrorMessage);
                // Trả về data sau khi verify thành công
                return { orderCode: state.mockOrderCode, reference: 'REF_999' };
            })
        }
    };
});

// ===== 2. MOCK REGISTRATION =====
vi.mock('mongoose', () => ({ default: mongooseMock }));
vi.mock('../models/Order.js', () => ({ default: orderModelMock }));
vi.mock('../models/Customer.js', () => ({ default: customerModelMock }));
vi.mock('../models/PaymentLink.js', () => ({ default: paymentLinkMock }));
vi.mock('../libs/payosHelper.js', () => payosHelperMock);
vi.mock('../libs/orderNotificationHelper.js', () => ({
    notifyOrderCustomerStatusChange: vi.fn().mockResolvedValue(undefined),
    resolveOrderNotificationRecipient: vi.fn(),
}));

// Import controller
import { handlePayOSWebhook } from '../controllers/paymentController.js';

const createMockRes = () => ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
});

// ===== 3. TEST SUITES =====
describe('paymentController - handlePayOSWebhook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});

        // Reset shared state trước mỗi test case
        testState.dbError = false;
        testState.verifyError = false;
        testState.paymentLinkExists = true;
        testState.paymentLinkStatus = 'pending';
        testState.orderExists = true;
        testState.mockOrderCode = 123456;
    });

    it('UTCID01: Should process successful payment and return 200 with "success" (Normal)', async () => {
        const req = { body: { data: { dummy: 'data' }, signature: 'valid_signature', success: true } };
        const res = createMockRes();

        await handlePayOSWebhook(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ code: '00', desc: 'success' });
        
        // Kiểm tra xem đã update status thành 'paid' chưa
        expect(paymentLinkMock.updateOne).toHaveBeenCalledWith(
            { _id: 'payment_link_id' }, 
            { status: 'paid' }
        );
    });

    it('UTCID02: Should process failed payment (success: false) and return 200 with "success" (Normal)', async () => {
        const req = { body: { data: { dummy: 'data' }, signature: 'valid_signature', success: false } };
        const res = createMockRes();

        await handlePayOSWebhook(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ code: '00', desc: 'success' });
        
        // Kiểm tra xem đã update status thành 'failed' chưa
        expect(paymentLinkMock.updateOne).toHaveBeenCalledWith(
            { _id: 'payment_link_id' }, 
            { status: 'failed' }
        );
    });

    it('UTCID03: Should return 400 with "Invalid webhook data" if data or signature is missing (Abnormal)', async () => {
        const req = { body: { success: true } }; // Thiếu data và signature
        const res = createMockRes();

        await handlePayOSWebhook(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ code: '01', desc: 'Invalid webhook data' });
    });

    it('UTCID04: Should return 400 with "Missing orderCode" if orderCode is missing or NaN (Abnormal)', async () => {
        testState.mockOrderCode = 'not_a_number'; // Giả lập orderCode không hợp lệ
        const req = { body: { data: { dummy: 'data' }, signature: 'sig', success: true } };
        const res = createMockRes();

        await handlePayOSWebhook(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ code: '02', desc: 'Missing orderCode' });
    });

    it('UTCID05: Should return 200 OK (Graceful ignore) with "OK" if PaymentLink not found (Abnormal)', async () => {
        testState.paymentLinkExists = false;
        const req = { body: { data: { dummy: 'data' }, signature: 'sig', success: true } };
        const res = createMockRes();

        await handlePayOSWebhook(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ code: '00', desc: 'OK' });
    });

    it('UTCID06: Should return 200 with "Already processed" if PaymentLink is already paid (Abnormal)', async () => {
        testState.paymentLinkStatus = 'paid';
        const req = { body: { data: { dummy: 'data' }, signature: 'sig', success: true } };
        const res = createMockRes();

        await handlePayOSWebhook(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ code: '00', desc: 'Already processed' });
    });

    it('UTCID07: Should return 500 with error message if verification or database throws error (Abnormal)', async () => {
        testState.verifyError = true; // Giả lập lỗi verify từ PayOS helper
        const req = { body: { data: { dummy: 'data' }, signature: 'sig', success: true } };
        const res = createMockRes();

        await handlePayOSWebhook(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ code: '99', desc: 'Webhook verification failed' });
    });
});