import api from '@/lib/axios';

// Lấy danh sách users
export const getUsers = async (params = {}) => {
    const response = await api.get('/users', { params });
    return response.data;
};

// Lấy thông tin chi tiết một user
export const getUserById = async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
};

// Tạo user mới
export const createUser = async (userData) => {
    const response = await api.post('/users', userData);
    return response.data;
};

// Cập nhật thông tin user
export const updateUser = async (id, userData) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
};

// Xóa user
export const deleteUser = async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
};

// Gán roles cho user
export const assignRoles = async (id, roles) => {
    const response = await api.post(`/users/${id}/roles`, { roles });
    return response.data;
};

// Xóa roles khỏi user
export const removeRoles = async (id, roles) => {
    const response = await api.delete(`/users/${id}/roles`, { data: { roles } });
    return response.data;
};

// Đặt lại mật khẩu cho user
export const resetUserPassword = async (id, newPassword) => {
    const response = await api.put(`/users/${id}/reset-password`, { newPassword });
    return response.data;
};

// Lấy danh sách tất cả roles
export const getRoles = async () => {
    const response = await api.get('/users/roles');
    return response.data;
};

