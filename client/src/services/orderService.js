import api from '@/lib/axios';

export const createOrder = async (data) => {
    const res = await api.post('/orders', data);
    return res.data;
};

/**
 * Lấy thông tin preview checkout: hạng khách hàng, chiết khấu, tổng tiền.
 */
export const getCheckoutPreview = async () => {
    const res = await api.get('/orders/checkout-preview');
    return res.data;
};

export const createOrderFromItems = async (data) => {
    const res = await api.post('/orders/from-items', data);
    return res.data;
};

/** Bán tại quầy: sau «Hoàn thành» — trừ tồn, tạo phiếu xuất, đơn completed (không áp dụng đặt trước). */
export const completePosCounterSale = async (orderId) => {
    const res = await api.post(`/orders/${orderId}/complete-pos-counter`);
    return res.data;
};

export const getMyOrders = async (params = {}) => {
    const res = await api.get('/orders', { params });
    return res.data;
};

export const getOrderById = async (id) => {
    const res = await api.get(`/orders/${id}`);
    return res.data;
};

/**
 * Cập nhật đơn hàng (xác nhận đơn, xác nhận thanh toán) - Admin/Manager
 */
export const updateOrder = async (id, data) => {
    const res = await api.put(`/orders/${id}`, data);
    return res.data;
};

/** Cập nhật đơn đặt trước (chỉ khi chưa thanh toán). Body: { items, note?, locationId?, discount?, customerId? } */
export const updatePreOrder = async (id, data) => {
    const res = await api.put(`/orders/${id}/pre-order`, data);
    return res.data;
};

/** Xóa đơn đặt trước (khi còn cho phép theo nghiệp vụ) */
export const deletePreOrder = async (id) => {
    const res = await api.delete(`/orders/${id}/pre-order`);
    return res.data;
};

/**
 * Khách hàng chỉnh sửa đơn (địa chỉ, ghi chú) - chỉ khi chưa thanh toán
 */
export const updateOrderByCustomer = async (id, data) => {
    const res = await api.patch(`/orders/${id}`, data);
    return res.data;
};

/**
 * Khách hàng hủy đơn - khi status pending/confirmed.
 * Khi đã thanh toán: refundBankName, refundBankAccount, refundAccountHolder (bắt buộc); refundBankBin (tùy chọn).
 */
export const cancelOrderByCustomer = async (id, data = {}) => {
    const res = await api.post(`/orders/${id}/cancel`, data);
    return res.data;
};

/** QR chuyển khoản hoàn tiền tới TK khách (admin/manager/seller). */
export const getRefundTransferQr = async (id) => {
    const res = await api.get(`/orders/${id}/refund-transfer-qr`);
    return res.data;
};

/** Đánh dấu đã hoàn tiền xong (sau khi chuyển khoản). */
export const confirmRefundTransfer = async (id) => {
    const res = await api.post(`/orders/${id}/confirm-refund-transfer`);
    return res.data;
};

/** Xác nhận xuất kho đơn online — chỉ khi đã quét đủ dòng đóng gói (trang xuất kho nhanh). */
export const confirmWarehouseOutbound = async (id, data = {}) => {
    const res = await api.post(`/orders/${id}/confirm-warehouse-outbound`, data);
    return res.data;
};

/** Kho xác nhận đã gom/kiểm hàng (bước trước khi quét đóng gói). */
export const confirmWarehouseItemsPrepared = async (id) => {
    const res = await api.post(`/orders/${id}/warehouse-confirm-prepared`, {});
    return res.data;
};

/** Tìm đơn online theo mã/ID để đóng gói. Body: { scan } */
export const lookupOnlineOrderForPacking = async (data) => {
    const res = await api.post('/orders/warehouse/lookup-online-order', data);
    return res.data;
};

/** Quét SKU/mã vạch để đánh dấu đã đóng gói một dòng. Body: { scannedSku } */
export const packWarehouseOrderLine = async (orderId, data) => {
    const res = await api.post(`/orders/${orderId}/warehouse-pack-line`, data);
    return res.data;
};

/**
 * Báo cáo đơn hàng đã xác nhận và thanh toán - Admin/Manager
 */
export const getOrderReport = async (params = {}) => {
    const res = await api.get('/orders/report', { params });
    return res.data;
};

/**
 * Tạo mã QR VietQR cho đơn hàng (thanh toán chuyển khoản)
 */
export const generateVietQR = async (orderId, params = {}) => {
    const res = await api.get(`/orders/${orderId}/generate-vietqr`, { params });
    return res.data;
};

/**
 * Đồng bộ trạng thái thanh toán từ PayOS (gọi khi quay về từ returnUrl)
 */
export const syncPaymentStatus = async (orderId) => {
    const res = await api.get(`/orders/${orderId}/sync-payment`);
    return res.data;
};
