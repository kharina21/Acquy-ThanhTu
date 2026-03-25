import axios from 'axios';
import { useAuthStore } from '../stores/useAuthStore';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    withCredentials: true,
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

// Tự động gọi refresh api khi accessToken hết hạn
api.interceptors.response.use(
    (res) => res,
    async (err) => {
        const originalRequest = err.config;

        //những api không cần check
        if (
            originalRequest.url.includes('/auth/login') ||
            originalRequest.url.includes('/auth/register') ||
            originalRequest.url.includes('/auth/refresh')
        ) {
            return Promise.reject(err);
        }

        originalRequest._retryCount = originalRequest._retryCount || 0;

        // Chỉ refresh khi có accessToken trong store (đã đăng nhập) và nhận 401/403
        const hasAccessToken = useAuthStore.getState().accessToken;
        if (
            hasAccessToken &&
            (err.response?.status === 401 || err.response?.status === 403) &&
            originalRequest._retryCount < 4
        ) {
            //thử 4 lần k được => refreshToken hết hạn => đăng nhập lại
            originalRequest._retryCount += 1;
            try {
                // Gọi đúng method GET /auth/refresh và truyền withCredentials ở options
                const res = await api.get('/auth/refresh', {
                    withCredentials: true,
                });
                const newAccessToken = res.data.accessToken;
                useAuthStore.getState().setAccessToken(newAccessToken);

                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

                return api(originalRequest);
            } catch (refreshError) {
                useAuthStore.getState().clearState();
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(err);
    }
);
export default api;
