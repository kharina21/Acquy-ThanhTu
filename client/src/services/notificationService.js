import api from '@/lib/axios';

/**
 * Lấy danh sách notifications của user hiện tại
 */
export const getMyNotifications = async (params = {}) => {
    const { page = 1, limit = 20, isRead, type } = params;
    const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(isRead !== undefined && { isRead: isRead.toString() }),
        ...(type && { type }),
    }).toString();

    const response = await api.get(`/notifications/me?${queryParams}`);
    return response.data;
};

/**
 * Lấy số lượng notifications chưa đọc
 */
export const getUnreadCount = async () => {
    const response = await api.get('/notifications/unread-count');
    return response.data;
};

/**
 * Đánh dấu notification là đã đọc
 */
export const markAsRead = async (notificationId) => {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
};

/**
 * Đánh dấu tất cả notifications là đã đọc
 */
export const markAllAsRead = async () => {
    const response = await api.put('/notifications/read-all');
    return response.data;
};

/**
 * Xóa notification
 */
export const deleteNotification = async (notificationId) => {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
};

/**
 * Xóa tất cả notifications đã đọc
 */
export const deleteAllRead = async () => {
    const response = await api.delete('/notifications/read/all');
    return response.data;
};

/**
 * Tạo notification (chỉ admin/owner/manager)
 */
export const createNotification = async (data) => {
    const response = await api.post('/notifications', data);
    return response.data;
};

/**
 * Tạo notification cho các roles (chỉ admin/owner/manager)
 */
export const createNotificationForRoles = async (data) => {
    const response = await api.post('/notifications/roles', data);
    return response.data;
};
