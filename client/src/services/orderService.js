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

/**
 * Khách hàng chỉnh sửa đơn (địa chỉ, ghi chú) - chỉ khi chưa thanh toán
 */
export const updateOrderByCustomer = async (id, data) => {
    const res = await api.patch(`/orders/${id}`, data);
    return res.data;
};

/**
 * Khách hàng hủy đơn - khi status pending/confirmed.
 * Khi đã thanh toán: cần truyền { refundBankName, refundBankAccount, refundAccountHolder }
 */
export const cancelOrderByCustomer = async (id, data = {}) => {
    const res = await api.post(`/orders/${id}/cancel`, data);
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
export const generateVietQR = async (orderId) => {
    const res = await api.get(`/orders/${orderId}/generate-vietqr`);
    return res.data;
};

/**
 * Đồng bộ trạng thái thanh toán từ PayOS (gọi khi quay về từ returnUrl)
 */
export const syncPaymentStatus = async (orderId) => {
    const res = await api.get(`/orders/${orderId}/sync-payment`);
    return res.data;
};
