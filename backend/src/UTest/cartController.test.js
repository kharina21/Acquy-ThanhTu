// backend/src/UTest/cartController.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ===== 1. KHAI BÁO MOCK VỚI vi.hoisted =====
const {
    testState,
    mongooseMock,
    cartMock,
    productMock,
    stockControllerMock,
    locationControllerMock
} = vi.hoisted(() => {
    // CÔNG TẮC TOÀN CỤC (SHARED STATE)
    const state = {
        dbError: false,
        cartExists: true,
        productExists: true,
        stock: 10,
        cartItems: [],
        productData: { 
            _id: 'valid_id', 
            price: 100, 
            name: 'Test Product', 
            images: ['img.png'] 
        }
    };

    return {
        testState: state,
        mongooseMock: {
            Types: {
                ObjectId: {
                    // Trả về false nếu là 'invalid_id', ngược lại trả về true
                    isValid: vi.fn((id) => id !== 'invalid_id')
                }
            }
        },
        cartMock: {
            findOne: vi.fn(() => ({
                populate: vi.fn().mockReturnThis(),
                lean: vi.fn(() => {
                    if (state.dbError) return Promise.reject(new Error('DB Error'));
                    if (!state.cartExists) return Promise.resolve(null);
                    
                    // Giả lập trả về Cart đã được populate (có thong tin product)
                    return Promise.resolve({
                        userId: 'valid_user_id',
                        items: state.cartItems.map(item => ({
                            ...item,
                            product: { 
                                _id: item.product, 
                                name: state.productData.name, 
                                price: state.productData.price, 
                                images: state.productData.images 
                            }
                        }))
                    });
                }),
                then: vi.fn((resolve, reject) => {
                    if (state.dbError) return reject(new Error('DB Error'));
                    if (!state.cartExists) return resolve(null);
                    
                    // Dùng mảng cartItems trực tiếp để bắt sự thay đổi của .push và .splice
                    const doc = {
                        userId: 'valid_user_id',
                        items: state.cartItems, 
                        save: vi.fn().mockResolvedValue(true)
                    };
                    return resolve(doc);
                })
            })),
            create: vi.fn(async (data) => {
                if (state.dbError) throw new Error('DB Error');
                return {
                    ...data,
                    save: vi.fn().mockResolvedValue(true)
                };
            })
        },
        productMock: {
            findOne: vi.fn(() => ({
                lean: vi.fn(() => {
                    if (state.dbError) return Promise.reject(new Error('DB Error'));
                    return Promise.resolve(state.productExists ? state.productData : null);
                })
            }))
        },
        stockControllerMock: {
            getStockAtLocation: vi.fn(async () => state.stock)
        },
        locationControllerMock: {
            getOnlineLocation: vi.fn(async () => ({ _id: 'online_loc_id' }))
        }
    };
});

// ===== 2. ĐĂNG KÝ MOCK =====
vi.mock('mongoose', () => ({ default: mongooseMock }));
vi.mock('../models/Cart.js', () => ({ default: cartMock }));
vi.mock('../models/Product.js', () => ({ default: productMock }));
vi.mock('../controllers/productStockController.js', () => stockControllerMock);
vi.mock('../controllers/locationController.js', () => locationControllerMock);

import { addItemToCart, updateCartItem } from '../controllers/cartController.js';

const createMockRes = () => ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
});

// ===== 3. TEST SUITES =====
describe('cartController', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => {}); 
        
        // RESET TRẠNG THÁI TRƯỚC MỖI TEST
        testState.dbError = false;
        testState.cartExists = true;
        testState.productExists = true;
        testState.stock = 10;
        testState.cartItems = []; // Làm trống giỏ hàng ảo
    });

    // ==========================================
    // BẢNG: addItemToCart (7 CASE)
    // ==========================================
    describe('addItemToCart', () => {
        it('UTCID01: Trả về 200 thêm mới sản phẩm thành công (Normal)', async () => {
            const req = { user: { _id: 'valid_user_id' }, body: { productId: 'valid_id', quantity: 2 } };
            const res = createMockRes();

            await addItemToCart(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(testState.cartItems).toHaveLength(1); // Mảng đã được push 1 object
            expect(testState.cartItems[0].quantity).toBe(2);
        });

        it('UTCID02: Trả về 401 nếu User chưa xác thực (Abnormal)', async () => {
            const req = { body: { productId: 'valid_id', quantity: 1 } }; // Thiếu req.user
            const res = createMockRes();
            await addItemToCart(req, res);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
        });

        it('UTCID03: Trả về 400 nếu productId không hợp lệ (Abnormal)', async () => {
            const req = { user: { _id: 'valid_user_id' }, body: { productId: 'invalid_id', quantity: 1 } };
            const res = createMockRes();
            await addItemToCart(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "productId không hợp lệ" });
        });

        it('UTCID04: Trả về 400 nếu số lượng <= 0 (Abnormal)', async () => {
            const req = { user: { _id: 'valid_user_id' }, body: { productId: 'valid_id', quantity: -5 } };
            const res = createMockRes();
            await addItemToCart(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "Số lượng phải lớn hơn 0" });
        });

        it('UTCID05: Trả về 404 nếu sản phẩm không tồn tại (Abnormal)', async () => {
            testState.productExists = false; 
            const req = { user: { _id: 'valid_user_id' }, body: { productId: 'valid_id', quantity: 1 } };
            const res = createMockRes();
            await addItemToCart(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: "Sản phẩm không tồn tại hoặc đã ngừng kinh doanh" });
        });

        it('UTCID06: Trả về 400 nếu số lượng mua vượt tồn kho (Abnormal)', async () => {
            testState.stock = 10; 
            const req = { user: { _id: 'valid_user_id' }, body: { productId: 'valid_id', quantity: 15 } };
            const res = createMockRes();
            await addItemToCart(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ 
                message: expect.stringContaining("Số lượng vượt quá tồn kho") 
            });
        });

        it('UTCID07: Trả về 500 nếu Database lỗi (Abnormal)', async () => {
            testState.dbError = true;
            const req = { user: { _id: 'valid_user_id' }, body: { productId: 'valid_id', quantity: 1 } };
            const res = createMockRes();
            await addItemToCart(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
                message: "Lỗi khi thêm sản phẩm vào giỏ hàng" 
            }));
        });
    });

    // ==========================================
    // BẢNG: updateCartItem (8 CASE)
    // ==========================================
    describe('updateCartItem', () => {
        it('UTCID01: Trả về 200 cập nhật số lượng thành công (Normal)', async () => {
            // Giả lập giỏ hàng đang có sẵn 1 sản phẩm với số lượng 1
            testState.cartItems = [{ product: 'valid_id', quantity: 1, selected: true }];
            
            const req = { user: { _id: 'valid_user_id' }, params: { productId: 'valid_id' }, body: { quantity: 5 } };
            const res = createMockRes();

            await updateCartItem(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(testState.cartItems[0].quantity).toBe(5); // Xác nhận đã được update thành 5
        });

        it('UTCID02: Trả về 200 và tự động xóa SP nếu số lượng <= 0 (Normal)', async () => {
            testState.cartItems = [{ product: 'valid_id', quantity: 2, selected: true }];
            
            // Cập nhật số lượng về 0
            const req = { user: { _id: 'valid_user_id' }, params: { productId: 'valid_id' }, body: { quantity: 0 } };
            const res = createMockRes();

            await updateCartItem(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(testState.cartItems).toHaveLength(0); // Lệnh splice() đã hoạt động, mảng rỗng
        });

        it('UTCID03: Trả về 401 nếu User chưa xác thực (Abnormal)', async () => {
            const req = { params: { productId: 'valid_id' }, body: { quantity: 2 } };
            const res = createMockRes();
            await updateCartItem(req, res);
            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('UTCID04: Trả về 400 nếu productId không hợp lệ (Abnormal)', async () => {
            const req = { user: { _id: 'valid_user_id' }, params: { productId: 'invalid_id' }, body: { quantity: 2 } };
            const res = createMockRes();
            await updateCartItem(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "productId không hợp lệ" });
        });

        it('UTCID05: Trả về 400 nếu số lượng là NaN (Abnormal)', async () => {
            const req = { user: { _id: 'valid_user_id' }, params: { productId: 'valid_id' }, body: { quantity: 'abc' } };
            const res = createMockRes();
            await updateCartItem(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "quantity không hợp lệ" });
        });

        it('UTCID06: Trả về 404 nếu sản phẩm không có trong giỏ hàng (Abnormal)', async () => {
            testState.cartItems = [{ product: 'other_id', quantity: 1, selected: true }];
            
            // Sửa sản phẩm not_in_cart_id
            const req = { user: { _id: 'valid_user_id' }, params: { productId: 'not_in_cart_id' }, body: { quantity: 2 } };
            const res = createMockRes();
            await updateCartItem(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: "Sản phẩm không có trong giỏ hàng" });
        });

        it('UTCID07: Trả về 400 nếu số lượng vượt quá tồn kho (Abnormal)', async () => {
            testState.cartItems = [{ product: 'valid_id', quantity: 1, selected: true }];
            testState.stock = 10;
            
            const req = { user: { _id: 'valid_user_id' }, params: { productId: 'valid_id' }, body: { quantity: 15 } };
            const res = createMockRes();
            
            await updateCartItem(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ 
                message: expect.stringContaining("Số lượng vượt quá tồn kho") 
            });
        });

        it('UTCID08: Trả về 500 nếu Database lỗi (Abnormal)', async () => {
            testState.dbError = true;
            const req = { user: { _id: 'valid_user_id' }, params: { productId: 'valid_id' }, body: { quantity: 2 } };
            const res = createMockRes();
            await updateCartItem(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
                message: "Lỗi khi cập nhật sản phẩm trong giỏ hàng" 
            }));
        });
    });
});