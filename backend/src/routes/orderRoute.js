import express from 'express';
import { authenticate } from '../middlewares/authenticate.js';
import { hasRole } from '../middlewares/rbac.js';
import {
    createOrder,
    createOrderFromItems,
    getOrders,
    getOrderById,
    updateOrder,
    updatePreOrder,
    deletePreOrder,
    updateOrderByCustomer,
    cancelOrderByCustomer,
    confirmWarehouseOutbound,
    lookupOnlineOrderForPacking,
    packWarehouseOrderLine,
    confirmWarehouseItemsPrepared,
    syncPaymentFromPayOS,
    getOrderReport,
    generateVietQRForOrder,
    getRefundTransferQrForOrder,
    confirmOrderRefundTransfer,
    checkoutPreview,
    completePosCounterSale,
} from '../controllers/orderController.js';

const router = express.Router();

router.use(authenticate);

// Mua hàng online (chỉ user, customer)
router.post('/', hasRole('user', 'customer'), createOrder);
router.get('/checkout-preview', hasRole('user', 'customer'), checkoutPreview);
router.get(
    '/:id/generate-vietqr',
    hasRole('user', 'customer', 'admin', 'manager', 'seller', 'Quản lý chi nhánh', 'staff', 'Nhân viên bán hàng'),
    generateVietQRForOrder,
);
router.get(
    '/:id/refund-transfer-qr',
    hasRole('admin', 'manager', 'seller', 'Quản lý chi nhánh', 'staff', 'Nhân viên bán hàng'),
    getRefundTransferQrForOrder,
);
router.post(
    '/:id/confirm-refund-transfer',
    hasRole('admin', 'manager', 'seller', 'Quản lý chi nhánh', 'staff', 'Nhân viên bán hàng'),
    confirmOrderRefundTransfer,
);
router.get(
    '/:id/sync-payment',
    hasRole('user', 'customer', 'admin', 'manager', 'seller', 'Quản lý chi nhánh', 'staff', 'Nhân viên bán hàng'),
    syncPaymentFromPayOS,
);
router.post('/:id/cancel', hasRole('user', 'customer'), cancelOrderByCustomer);
router.post(
    '/:id/confirm-warehouse-outbound',
    hasRole('admin', 'manager', 'warehouse_manager', 'Quản lý chi nhánh'),
    confirmWarehouseOutbound,
);
router.post(
    '/:id/warehouse-pack-line',
    hasRole('admin', 'manager', 'warehouse_manager', 'Quản lý chi nhánh'),
    packWarehouseOrderLine,
);
router.post(
    '/:id/warehouse-confirm-prepared',
    hasRole('admin', 'manager', 'warehouse_manager', 'Quản lý chi nhánh'),
    confirmWarehouseItemsPrepared,
);
router.patch('/:id', hasRole('user', 'customer'), updateOrderByCustomer);

// Bán tại quầy
router.post(
    '/from-items',
    hasRole('admin', 'manager', 'seller', 'Quản lý chi nhánh', 'staff', 'Nhân viên bán hàng'),
    createOrderFromItems,
);
router.post(
    '/:id/complete-pos-counter',
    hasRole('admin', 'manager', 'seller', 'Quản lý chi nhánh', 'staff', 'Nhân viên bán hàng'),
    completePosCounterSale,
);

// Báo cáo đơn hàng
router.get(
    '/report',
    hasRole('admin', 'manager', 'Quản lý chi nhánh', 'seller', 'staff', 'Nhân viên bán hàng'),
    getOrderReport,
);

router.post(
    '/warehouse/lookup-online-order',
    hasRole('admin', 'manager', 'warehouse_manager', 'Quản lý chi nhánh'),
    lookupOnlineOrderForPacking,
);

// Xem đơn: user/customer xem đơn của mình; admin/manager/seller xem đơn cửa hàng
router.get('/', getOrders);
router.get('/:id', getOrderById);

// Cập nhật đơn (xác nhận, thanh toán)
router.put(
    '/:id',
    hasRole('admin', 'manager', 'seller', 'Quản lý chi nhánh', 'staff', 'Nhân viên bán hàng'),
    updateOrder,
);

// Đơn đặt trước: chỉnh sửa / xóa (cùng quyền cập nhật đơn tại quầy)
router.put(
    '/:id/pre-order',
    hasRole('admin', 'manager', 'seller', 'Quản lý chi nhánh', 'staff', 'Nhân viên bán hàng'),
    updatePreOrder,
);
router.delete(
    '/:id/pre-order',
    hasRole('admin', 'manager', 'seller', 'Quản lý chi nhánh', 'staff', 'Nhân viên bán hàng'),
    deletePreOrder,
);

export default router;
