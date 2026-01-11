import axios from 'axios';
import { useAuthStore } from '../stores/useAuthStore';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
});

//tự động thêm access token vào header
api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    } else {
        delete config.headers.Authorization;
    }
    return config;
});

//todo: implement refresh token
//Tự động gọi refresh token nếu token hết hạn
export default api;
