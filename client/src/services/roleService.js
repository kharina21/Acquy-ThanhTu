import api from '@/lib/axios';

export const getRolesWithPermissions = async () => {
    const res = await api.get('/roles');
    return res.data;
};

export const getAllPermissions = async () => {
    const res = await api.get('/roles/permissions');
    return res.data;
};

export const createRole = async (payload) => {
    const res = await api.post('/roles', payload);
    return res.data;
};

export const updateRole = async (id, payload) => {
    const res = await api.put(`/roles/${id}`, payload);
    return res.data;
};

export const deleteRole = async (id) => {
    const res = await api.delete(`/roles/${id}`);
    return res.data;
};

