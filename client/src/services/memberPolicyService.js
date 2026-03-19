import api from '@/lib/axios';

/**
 * Service quản lý chính sách hạng thành viên (MemberPolicy).
 */

export const getMemberPolicies = async (params = {}) => {
    const query = {};
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            query[key] = value;
        }
    });
    const { data } = await api.get('/member-policies', { params: query });
    return data;
};

export const createMemberPolicy = async (payload) => {
    const { data } = await api.post('/member-policies', payload);
    return data;
};

export const updateMemberPolicy = async (id, payload) => {
    const { data } = await api.put(`/member-policies/${id}`, payload);
    return data;
};

export const deleteMemberPolicy = async (id) => {
    const { data } = await api.delete(`/member-policies/${id}`);
    return data;
};

