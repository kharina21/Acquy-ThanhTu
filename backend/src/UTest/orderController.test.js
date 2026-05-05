// backend/src/UTest/orderController.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ===== 1. HOISTED MOCKS & SHARED STATE =====
const {
    testState,
    mongooseMock,
    generalModelMock,
    orderMock,
    cartMock,
    payosHelperMock,
    vietqrHelperMock,
    locationHelperMock,
    warrantyMock
} = vi.hoisted(() => {
    // SHARED STATE (The "Iron Hand")
    const state = {
        dbError: false,
        userRoles: ['user'], 
        allowedLocIds: ['loc1'],
        cartItems: [],
        cartExists: true,
        orderExists: true,
        orderStatus: 'pending',
        orderPaymentStatus: 'pending',
        orderOwnerId: 'valid_user_id',
        orderChannel: 'online',
        isPreOrder: false,
        isLegacyImport: false,
        stock: 10,
        payosError: false,
        productExists: true,
    };

    // Helper for chainable Mongoose queries
    const createQueryMock = (data) => {
        const chain = {
            populate: vi.fn(() => chain),
            session: vi.fn(() => chain),
            sort: vi.fn(() => chain),
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

    const baseModelMock = {
        findById: vi.fn((id) => {
            if (id === 'valid_user_id' || id === 'admin_id' || id === 'seller_id') {
                return createQueryMock({
                    _id: id,
                    roles: state.userRoles.map(r => ({ name: r }))
                });
            }
            if (id === 'prod1' && state.productExists) {
                return createQueryMock({ _id: 'prod1', name: 'Battery', price: 100000, isDeleted: false });
            }
            if (id === 'pos_customer_1') {
                return createQueryMock({
                    _id: 'pos_customer_1',
                    name: 'KH Test',
                    phone: '0900000001',
                    type: 'retail',
                    userId: null,
                });
            }
            return createQueryMock(null);
        }),
        findOne: vi.fn(() => {
            if (!state.productExists) return createQueryMock(null);
            // Thêm save() để không bị crash trong restoreInventoryOnOrderCancel
            return createQueryMock({ _id: 'prod1', name: 'Battery', price: 100000, isDeleted: false, quantity: 1, save: vi.fn().mockResolvedValue(true) });
        }),
        find: vi.fn(() => createQueryMock([])),
        exists: vi.fn(async () => false),
        create: vi.fn(async (data) => Array.isArray(data) ? data : [data]),
        findByIdAndUpdate: vi.fn(() => createQueryMock({})),
        findOneAndUpdate: vi.fn(() => createQueryMock({})),
        // Fix lỗi 500 khi cancelOrder (thiếu deleteMany)
        deleteMany: vi.fn(async () => true) 
    };

    return {
        testState: state,
        mongooseMock: {
            Types: {
                ObjectId: {
                    isValid: vi.fn((id) => id && id !== 'invalid_id' && id !== 'not-found')
                }
            },
            startSession: vi.fn(() => ({
                withTransaction: vi.fn(async (cb) => {
                    if (state.dbError) throw new Error('DB Error');
                    await cb();
                }),
                endSession: vi.fn()
            }))
        },
        generalModelMock: baseModelMock,
        orderMock: {
            findById: vi.fn((id) => {
                if (!state.orderExists) return createQueryMock(null);
                
                const orderData = {
                    _id: id,
                    code: 'ORD-TEST-001',
                    customer: state.orderOwnerId,
                    location: 'loc1',
                    status: state.orderStatus,
                    paymentStatus: state.orderPaymentStatus,
                    isPreOrder: state.isPreOrder,
                    isLegacyImport: state.isLegacyImport,
                    channel: state.orderChannel,
                    totalAmount: 100000,
                    items: [{ product: { _id: 'prod1', name: 'Battery' }, quantity: 1, price: 100000 }],
                    save: vi.fn().mockResolvedValue(true)
                };
                return createQueryMock(orderData);
            }),
            findOne: vi.fn(() => createQueryMock(null)),
            exists: vi.fn(async () => false),
            create: vi.fn(async (data) => Array.isArray(data) ? data.map(d => ({ ...d, _id: 'new_order_id' })) : [{ ...data, _id: 'new_order_id' }]),
            updateOne: vi.fn(async () => true),
            findByIdAndUpdate: vi.fn(async () => true),
        },
        cartMock: {
            findOne: vi.fn(() => {
                if (!state.cartExists) return createQueryMock(null);
                return createQueryMock({
                    userId: 'valid_user_id',
                    items: state.cartItems,
                    save: vi.fn()
                });
            })
        },
        payosHelperMock: {
            createPayOSPaymentLink: vi.fn(async () => {
                if (state.payosError) throw new Error('PayOS API Failed');
                return { qrDataURL: 'mock_payos_qr_url', bankAccount: {}, checkoutUrl: 'mock_checkout' };
            }),
            getPayOSPaymentStatus: vi.fn(async () => ({ status: 'PENDING' }))
        },
        vietqrHelperMock: {
            getVietQRQuickLink: vi.fn(() => 'mock_vietqr_fallback_url')
        },
        locationHelperMock: {
            getManagerAllowedLocationIds: vi.fn(async () => state.allowedLocIds),
            validateLocationForUser: vi.fn(async (userId, locId) => {
                if (state.userRoles.includes('admin')) return { valid: true };
                return { valid: state.allowedLocIds.includes(String(locId)) };
            })
        },
        warrantyMock: {
            createWarrantiesForOrder: vi.fn(async () => true)
        }
    };
});

// ===== 2. MOCK REGISTRATION =====
vi.mock('mongoose', () => ({ default: mongooseMock }));
vi.mock('../models/User.js', () => ({ default: generalModelMock }));
vi.mock('../models/Customer.js', () => ({ default: generalModelMock }));
vi.mock('../models/StoreSettings.js', () => ({ default: generalModelMock }));
vi.mock('../models/Product.js', () => ({ default: generalModelMock }));

// FIX: Bổ sung isActive: true cho Location.findById để qua được bước Validation của Controller
vi.mock('../models/Location.js', () => ({ 
    default: { 
        ...generalModelMock, 
        findById: vi.fn(() => {
            const chain = {
                populate: vi.fn(() => chain),
                lean: vi.fn(async () => {
                    if (testState.dbError) throw new Error('DB Error');
                    return { _id: 'loc1', isActive: true };
                }),
                then: vi.fn((resolve, reject) => {
                    if (testState.dbError) return reject(new Error('DB Error'));
                    return resolve({ _id: 'loc1', isActive: true });
                })
            };
            return chain;
        })
    } 
}));

vi.mock('../models/ProductStock.js', () => ({ default: generalModelMock }));
vi.mock('../models/BankAccount.js', () => ({ default: generalModelMock }));
vi.mock('../models/PaymentLink.js', () => ({ default: generalModelMock }));
vi.mock('../models/BatteryTradeIn.js', () => ({ default: generalModelMock }));
vi.mock('../models/MemberPolicy.js', () => ({ default: generalModelMock }));
vi.mock('../models/StockOut.js', () => ({ default: generalModelMock }));
vi.mock('../models/Warranty.js', () => ({ default: generalModelMock }));

vi.mock('../models/Order.js', () => ({ default: orderMock }));
vi.mock('../models/Cart.js', () => ({ default: cartMock }));

vi.mock('../controllers/productStockController.js', () => ({
    getStockAtLocation: vi.fn(async () => testState.stock)
}));
vi.mock('../controllers/locationController.js', () => ({
    getOnlineLocation: vi.fn(async () => ({ _id: 'online_loc_id', isActive: true }))
}));
vi.mock('../libs/payosHelper.js', () => payosHelperMock);
vi.mock('../libs/vietqrHelper.js', () => vietqrHelperMock);
vi.mock('../libs/managerLocationHelper.js', () => locationHelperMock);
vi.mock('../utils/roleEquivalence.js', () => ({ userHasEquivalentRole: vi.fn(() => true) }));
vi.mock('../libs/rbacHelpers.js', () => ({ assignDefaultRole: vi.fn() }));
vi.mock('../utils/stockOutCode.js', () => ({ generateStockOutCode: vi.fn(() => 'SO-123') }));
vi.mock('../controllers/warrantyController.js', () => warrantyMock);
vi.mock('bcryptjs', () => ({ default: { hash: vi.fn(() => 'hashed_pw') } }));
vi.mock('../libs/orderNotificationHelper.js', () => ({
    notifyOrderCustomerStatusChange: vi.fn().mockResolvedValue(undefined),
    resolveOrderNotificationRecipient: vi.fn(),
}));

// Import controllers
import {
    checkoutPreview,
    createOrder,
    createOrderFromItems,
    generateVietQRForOrder,
    cancelOrderByCustomer,
    updateOrder
} from '../controllers/orderController.js';

const createMockRes = () => ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
});

// ===== 3. TEST SUITES =====
describe('orderController', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(console, 'log').mockImplementation(() => {});

        testState.dbError = false;
        testState.userRoles = ['user'];
        testState.allowedLocIds = ['loc1', 'online_loc_id'];
        testState.cartItems = [];
        testState.cartExists = true;
        testState.orderExists = true;
        testState.orderStatus = 'pending';
        testState.orderPaymentStatus = 'pending';
        testState.orderOwnerId = 'valid_user_id';
        testState.orderChannel = 'online';
        testState.isPreOrder = false;
        testState.isLegacyImport = false;
        testState.stock = 10;
        testState.payosError = false;
        testState.productExists = true;
    });

    // ==========================================
    // 1. checkoutPreview
    // ==========================================
    describe('checkoutPreview', () => {
        it('UTCID01: Should return 200 and calculate preview data successfully (Normal)', async () => {
            testState.cartItems = [{ product: { price: 100000, vatPercent: 10 }, quantity: 1, selected: true }];
            const req = { user: { _id: 'valid_user_id' } };
            const res = createMockRes();

            await checkoutPreview(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('UTCID02: Should return 401 if user is not authenticated (Abnormal)', async () => {
            const req = { user: null };
            const res = createMockRes();
            await checkoutPreview(req, res);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
        });

        it('UTCID03: Should return 200 even if cart is empty or no items selected (Normal)', async () => {
            testState.cartItems = [];
            const req = { user: { _id: 'valid_user_id' } };
            const res = createMockRes();
            await checkoutPreview(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('UTCID04: Should return 500 on database execution failure (Abnormal)', async () => {
            testState.dbError = true;
            const req = { user: { _id: 'valid_user_id' } };
            const res = createMockRes();
            await checkoutPreview(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Lỗi khi lấy thông tin checkout" }));
        });
    });

    // ==========================================
    // 2. createOrder (Online)
    // ==========================================
    describe('createOrder', () => {
        const validPayload = {
            recipientName: 'John Doe',
            shippingPhone: '0901234567',
            shippingAddress: '123 Valid Street, Hanoi',
            paymentMethod: 'transfer'
        };

        it('UTCID01: Should return 201 and create order successfully (Normal)', async () => {
            testState.cartItems = [{ product: { _id: 'prod1', price: 100 }, quantity: 1, selected: true }];
            const req = { user: { _id: 'valid_user_id' }, body: validPayload };
            const res = createMockRes();

            await createOrder(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Đặt hàng thành công" }));
        });

        it('UTCID02: Should return 401 if user is not authenticated (Abnormal)', async () => {
            const req = { user: null, body: validPayload };
            const res = createMockRes();
            await createOrder(req, res);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
        });

        it('UTCID03: Should return 400 if recipient name is missing or invalid (Abnormal)', async () => {
            const req = { user: { _id: 'valid_user_id' }, body: { ...validPayload, recipientName: 'A' } };
            const res = createMockRes();
            await createOrder(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "Tên người nhận phải từ 2–100 ký tự" });
        });

        it('UTCID04: Should return 400 if phone format is incorrect (Abnormal)', async () => {
            const req = { user: { _id: 'valid_user_id' }, body: { ...validPayload, shippingPhone: '0123' } };
            const res = createMockRes();
            await createOrder(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "Số điện thoại không hợp lệ (ví dụ: 0901234567)" });
        });

        it('UTCID05: Should return 400 if shipping address is too short (Abnormal)', async () => {
            const req = { user: { _id: 'valid_user_id' }, body: { ...validPayload, shippingAddress: 'Short' } };
            const res = createMockRes();
            await createOrder(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "Địa chỉ giao hàng phải có ít nhất 10 ký tự" });
        });

        it('UTCID06: Should return 400 if cart is empty or no items selected (Abnormal)', async () => {
            testState.cartItems = []; 
            const req = { user: { _id: 'valid_user_id' }, body: validPayload };
            const res = createMockRes();
            await createOrder(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "Giỏ hàng trống" });
        });

        it('UTCID07: Should return 400 if requested quantity exceeds stock (Abnormal)', async () => {
            testState.stock = 0; 
            testState.cartItems = [{ product: { _id: 'prod1', name: 'Battery' }, quantity: 5, selected: true }];
            const req = { user: { _id: 'valid_user_id' }, body: validPayload };
            const res = createMockRes();
            
            await createOrder(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
                message: expect.stringContaining("không đủ tồn") 
            }));
        });

        it('UTCID08: Should return 500 on database execution failure (Abnormal)', async () => {
            testState.dbError = true;
            testState.cartItems = [{ product: { _id: 'prod1', price: 100 }, quantity: 1, selected: true }];
            const req = { user: { _id: 'valid_user_id' }, body: validPayload };
            const res = createMockRes();
            await createOrder(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Lỗi khi tạo đơn hàng" }));
        });
    });

    // ==========================================
    // 3. createOrderFromItems (POS)
    // ==========================================
    describe('createOrderFromItems', () => {
        const validPosPayload = {
            locationId: 'loc1',
            isPreOrder: false,
            customerId: 'pos_customer_1',
            items: [{ productId: 'prod1', quantity: 1, price: 50000 }],
        };

        it('UTCID01: Should return 201 for valid direct sale items (Normal)', async () => {
            testState.userRoles = ['seller'];
            const req = { user: { _id: 'seller_id' }, body: validPosPayload };
            const res = createMockRes();

            await createOrderFromItems(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Tạo hóa đơn thành công" }));
        });

        it('UTCID02: Should return 201 for valid pre-order items (Normal)', async () => {
            testState.userRoles = ['seller'];
            const req = { user: { _id: 'seller_id' }, body: { ...validPosPayload, isPreOrder: true } };
            const res = createMockRes();

            await createOrderFromItems(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Tạo hóa đơn thành công" }));
        });

        it('UTCID03: Should return 400 if locationId is missing (Abnormal)', async () => {
            const req = { user: { _id: 'seller_id' }, body: { items: validPosPayload.items } };
            const res = createMockRes();
            await createOrderFromItems(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "Vui lòng chọn chi nhánh/kho" });
        });

        it('UTCID03b: Should return 400 if customer is missing for pre-order (Abnormal)', async () => {
            testState.userRoles = ['seller'];
            const { customerId: _c, ...rest } = validPosPayload;
            const req = { user: { _id: 'seller_id' }, body: { ...rest, isPreOrder: true } };
            const res = createMockRes();
            await createOrderFromItems(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('chọn khách hàng'),
                }),
            );
        });

        it('UTCID04: Should return 400 if target product is deleted or not found (Abnormal)', async () => {
            testState.productExists = false;
            const req = { user: { _id: 'seller_id' }, body: validPosPayload };
            const res = createMockRes();
            await createOrderFromItems(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "Sản phẩm không tồn tại hoặc đã ngừng kinh doanh" });
        });

        it('UTCID05: Should return 400 on inventory shortfall / insufficient stock (Abnormal)', async () => {
            testState.stock = 0; // Shortfall
            const req = { user: { _id: 'seller_id' }, body: validPosPayload };
            const res = createMockRes();
            await createOrderFromItems(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
                message: expect.stringContaining("không đủ tồn") 
            }));
        });

        it('UTCID06: Should return 500 on database execution error (Abnormal)', async () => {
            testState.dbError = true;
            const req = { user: { _id: 'seller_id' }, body: validPosPayload };
            const res = createMockRes();
            await createOrderFromItems(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Lỗi khi tạo hóa đơn" }));
        });
    });

    // ==========================================
    // 4. cancelOrderByCustomer
    // ==========================================
    describe('cancelOrderByCustomer', () => {
        it('UTCID01: Should return 200 when cancelling a pending order successfully (Normal)', async () => {
            const req = { user: { _id: 'valid_user_id' }, params: { id: 'valid_order_id' } };
            const res = createMockRes();

            await cancelOrderByCustomer(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Đã hủy đơn hàng" }));
        });

        it('UTCID02: Should return 403 on unauthorized access attempt from different user (Abnormal)', async () => {
            testState.orderOwnerId = 'other_user_id';
            const req = { user: { _id: 'valid_user_id' }, params: { id: 'valid_order_id' } };
            const res = createMockRes();

            await cancelOrderByCustomer(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: "Bạn không có quyền hủy đơn này" });
        });

        it('UTCID03: Should return 400 if order is not in pending state (completed) (Abnormal)', async () => {
            testState.orderStatus = 'completed';
            const req = { user: { _id: 'valid_user_id' }, params: { id: 'valid_order_id' } };
            const res = createMockRes();

            await cancelOrderByCustomer(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "Đơn hàng không thể hủy ở trạng thái hiện tại" });
        });

        it('UTCID04: Should return 400 if missing mandatory refund info for paid order (Abnormal)', async () => {
            testState.orderStatus = 'pending';
            testState.orderPaymentStatus = 'paid';
            const req = { user: { _id: 'valid_user_id' }, params: { id: 'valid_order_id' }, body: {} }; 
            const res = createMockRes();

            await cancelOrderByCustomer(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ 
                message: "Đơn đã thanh toán. Vui lòng nhập đầy đủ tên ngân hàng, số tài khoản và tên chủ tài khoản nhận hoàn tiền." 
            });
        });

        it('UTCID05: Should return 500 on database execution error (Abnormal)', async () => {
            testState.dbError = true;
            const req = { user: { _id: 'valid_user_id' }, params: { id: 'valid_order_id' } };
            const res = createMockRes();
            await cancelOrderByCustomer(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Lỗi khi hủy đơn hàng" }));
        });
    });

    // ==========================================
    // 5. updateOrder
    // ==========================================
    describe('updateOrder', () => {
        it('UTCID01: Should return 200 and update order payment status successfully (Normal)', async () => {
            const req = { user: { _id: 'admin_id' }, params: { id: 'valid_order_id' }, body: { paymentStatus: 'paid' } };
            const res = createMockRes();

            await updateOrder(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
                message: expect.stringContaining("Cập nhật đơn hàng thành công") 
            }));
        });

        it('UTCID02: Should automatically confirm an in-store paid order (Abnormal/Edge)', async () => {
            testState.orderChannel = 'in_store';
            testState.orderPaymentStatus = 'paid';
            const req = { user: { _id: 'admin_id' }, params: { id: 'valid_order_id' }, body: {} };
            const res = createMockRes();

            await updateOrder(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('UTCID03: Should return 400 for invalid status transition on unpaid online order (Abnormal)', async () => {
            testState.orderChannel = 'online';
            testState.orderPaymentStatus = 'pending';
            const req = { user: { _id: 'admin_id' }, params: { id: 'valid_order_id' }, body: { status: 'confirmed' } };
            const res = createMockRes();

            await updateOrder(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ 
                message: 'Chỉ chuyển sang "Đã xác nhận (chờ xuất kho)" sau khi đã thanh toán.' 
            });
        });

        it('UTCID04: Should return 404 if order is not found in DB (Abnormal)', async () => {
            testState.orderExists = false;
            const req = { user: { _id: 'admin_id' }, params: { id: 'valid_order_id' }, body: { status: 'cancelled' } };
            const res = createMockRes();

            await updateOrder(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: "Không tìm thấy đơn hàng" });
        });

        it('UTCID05: Should return 500 on database execution error (Abnormal)', async () => {
            testState.dbError = true;
            const req = { user: { _id: 'admin_id' }, params: { id: 'valid_order_id' }, body: { status: 'cancelled' } };
            const res = createMockRes();
            await updateOrder(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Lỗi khi cập nhật đơn hàng" }));
        });

        it('UTCID06: Should return 400 when setting completed without warehouse flow (Abnormal)', async () => {
            testState.orderChannel = 'online';
            testState.orderStatus = 'confirmed';
            testState.orderPaymentStatus = 'paid';
            testState.isLegacyImport = false;
            const req = { user: { _id: 'admin_id' }, params: { id: 'valid_order_id' }, body: { status: 'completed' } };
            const res = createMockRes();
            await updateOrder(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('Đã xuất kho / hoàn thành'),
                }),
            );
        });

        it('UTCID07: Should allow completed for legacy import (Normal)', async () => {
            testState.orderChannel = 'online';
            testState.orderStatus = 'confirmed';
            testState.orderPaymentStatus = 'paid';
            testState.isLegacyImport = true;
            const req = { user: { _id: 'admin_id' }, params: { id: 'valid_order_id' }, body: { status: 'completed' } };
            const res = createMockRes();
            await updateOrder(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    // ==========================================
    // 6. generateVietQRForOrder
    // ==========================================
    describe('generateVietQRForOrder', () => {
        it('UTCID01: Should return 200 with qrDataURL from PayOS successfully (Normal)', async () => {
            const req = { user: { _id: 'valid_user_id' }, params: { id: 'valid_order_id' } };
            const res = createMockRes();

            await generateVietQRForOrder(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
                data: expect.objectContaining({ qrDataURL: 'mock_payos_qr_url' }) 
            }));
        });

        it('UTCID02: Should return 200 with static VietQR fallback when PayOS fails (Normal)', async () => {
            testState.payosError = true; // Trigger fallback
            const req = { user: { _id: 'valid_user_id' }, params: { id: 'valid_order_id' }, query: {} };
            const res = createMockRes();

            await generateVietQRForOrder(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
                data: expect.objectContaining({ qrDataURL: 'mock_vietqr_fallback_url' }) 
            }));
        });

        it('UTCID03: Should return 403 on unauthorized access violation (Abnormal)', async () => {
            testState.orderOwnerId = 'other_user_id';
            const req = { user: { _id: 'valid_user_id' }, params: { id: 'valid_order_id' } };
            const res = createMockRes();

            await generateVietQRForOrder(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: "Bạn không có quyền tạo mã QR cho đơn này" });
        });

        it('UTCID04: Should return 404 if order is not found or invalid format (Abnormal)', async () => {
            testState.orderExists = false;
            const req = { user: { _id: 'valid_user_id' }, params: { id: 'not_found_id' } };
            const res = createMockRes();
            
            await generateVietQRForOrder(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: "Không tìm thấy đơn hàng" });
        });

        it('UTCID05: Should return 500 on database execution error (Abnormal)', async () => {
            testState.dbError = true;
            const req = { user: { _id: 'valid_user_id' }, params: { id: 'valid_order_id' } };
            const res = createMockRes();
            await generateVietQRForOrder(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "DB Error" }));
        });
    });
});