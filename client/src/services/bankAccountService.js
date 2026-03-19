import api from '@/lib/axios';

export const getBankAccountsByLocation = async (locationId) => {
    const res = await api.get(`/bank-accounts/location/${locationId}`);
    return res.data;
};

export const getBankAccountsFromOtherLocations = async (excludeLocationId) => {
    const res = await api.get('/bank-accounts/from-other-locations', {
        params: { excludeLocationId: excludeLocationId || undefined },
    });
    return res.data;
};

export const createBankAccount = async (data) => {
    const res = await api.post('/bank-accounts', data);
    return res.data;
};

export const updateBankAccount = async (id, data) => {
    const res = await api.put(`/bank-accounts/${id}`, data);
    return res.data;
};

export const deleteBankAccount = async (id) => {
    const res = await api.delete(`/bank-accounts/${id}`);
    return res.data;
};
