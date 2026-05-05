import api from '@/lib/axios';

export const getEmployees = async (params = {}) => {
    const res = await api.get('/employees', { params });
    return res.data;
};

/** User đã có hồ sơ nhân viên (mọi trang) — dùng để ẩn tài khoản khi tạo NV mới. */
export const getEmployeeLinkedUserIds = async () => {
    const res = await api.get('/employees/linked-user-ids');
    return res.data;
};

export const getEmployeeById = async (id) => {
    const res = await api.get(`/employees/${id}`);
    return res.data;
};

export const createEmployee = async (payload) => {
    const res = await api.post('/employees', payload);
    return res.data;
};

export const updateEmployee = async (id, payload) => {
    const res = await api.put(`/employees/${id}`, payload);
    return res.data;
};

export const deleteEmployee = async (id) => {
    const res = await api.delete(`/employees/${id}`);
    return res.data;
};

export const getEmployeeMonthlySalesReport = async (params = {}) => {
    const res = await api.get('/employees/sales-report/monthly', { params });
    return res.data;
};

