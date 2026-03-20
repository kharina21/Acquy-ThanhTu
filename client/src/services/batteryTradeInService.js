import api from '@/lib/axios';

export const uploadBatteryImage = async (files) => {
    const list = Array.isArray(files) ? files : [files];
    const formData = new FormData();
    list.forEach((file) => formData.append('image', file));
    const { data } = await api.post('/battery-trade-in/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
};

export const submitBatteryTradeIn = async (payload) => {
    const { data } = await api.post('/battery-trade-in', payload);
    return data;
};

export const getBatteryTradeInList = async (params = {}) => {
    const { data } = await api.get('/battery-trade-in', { params });
    return data;
};

export const updateBatteryTradeInStatus = async (id, status) => {
    const { data } = await api.patch(`/battery-trade-in/${id}`, { status });
    return data;
};
