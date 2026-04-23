import api from '@/lib/axios';

export const getEmployees = async (params = {}) => {
    const res = await api.get('/employees', { params });
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

