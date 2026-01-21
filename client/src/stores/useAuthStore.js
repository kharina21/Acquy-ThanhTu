import api from '@/lib/axios';
import { toast } from 'sonner';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useLogStore } from './useLogStore';

const initState = {
    user: null,
    accessToken: null,
    loading: false,
};

export const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            accessToken: null,
            loading: false,
            updatingProfile: false, // Loading state riêng cho update profile

            setAccessToken: (newAccessToken) => {
                set({ accessToken: newAccessToken });
            },

            clearState: () => {
                set({ user: null, accessToken: null });
                localStorage.clear();
            },

            login: async (username, password) => {
                try {
                    set({ loading: true });
                    localStorage.clear();
                    const res = await api.post(
                        '/auth/login',
                        { username, password },
                        { withCredentials: true }
                    );
                    if (res?.data?.accessToken) {
                        set({ accessToken: res.data.accessToken });
                        await get().fetchUser();
                        toast.success('Đăng nhập thành công');
                        return { success: true };
                    } else {
                        return { success: false, message: res.data.message };
                    }
                } catch (error) {
                    get().clearState();
                    return { success: false, message: error.response.data.message };
                } finally {
                    set({ loading: false });
                }
            },

            fetchUser: async () => {
                try {
                    set({ loading: true });
                    const res = await api.get('/auth/me', { withCredentials: true });
                    const { user } = res.data;
                    set({ user });
                } catch (error) {
                    get().clearState();
                    toast.error('Lỗi xảy ra khi lấy thông tin người dùng');
                } finally {
                    set({ loading: false });
                }
            },

            updateUser: async (data) => {
                try {
                    const { user } = get();
                    set({ updatingProfile: true }); // Sử dụng updatingProfile thay vì loading
                    const oldEmail = user?.email;
                    const response = await api.put('/auth/profile', data);
                    // Không set loading khi fetchUser để tránh loading toàn trang
                    const res = await api.get('/auth/me', { withCredentials: true });
                    set({ user: res.data.user });
                    // Kiểm tra xem email có thay đổi không
                    const emailChanged = oldEmail && data.email && oldEmail !== data.email;

                    if (emailChanged) {
                        toast.success('Cập nhật thông tin thành công.', {
                            duration: 5000,
                        });

                    } else {
                        toast.success(response.data?.message || 'Cập nhật thông tin thành công');
                    }
                    // Refresh activity logs
                    await useLogStore.getState().fetchActivityLogs(1);
                } catch (error) {
                    console.error('Error updating profile:', error);
                    const errorMessage = error.response?.data?.message || 'Cập nhật thông tin thất bại';
                    toast.error(errorMessage);
                    throw error; // Re-throw để component có thể handle
                } finally {
                    set({ updatingProfile: false });
                }
            },

            refresh: async () => {
                try {
                    set({ loading: true });
                    const res = await api.get('/auth/refresh', { withCredentials: true });
                    if (res?.data?.accessToken) {
                        set({ accessToken: res.data.accessToken });
                    }
                } catch (error) {
                    get().clearState();
                    toast.error('Lỗi xảy ra khi lấy access token mới');
                } finally {
                    set({ loading: false });
                }
            },

            logout: async () => {
                try {
                    localStorage.clear();
                    set(initState);
                    await api.post('/auth/logout', { withCredentials: true });
                    toast.success('Đăng xuất thành công');
                    navigate('/', { replace: true });
                } catch (error) {
                    get().clearState();
                    toast.error('Lỗi xảy ra khi đăng xuất');
                } finally {
                    set({ loading: false });
                }

            }
        }),
        {
            name: 'auth-store',
            partialize: (state) => ({ user: state.user, accessToken: state.accessToken }),
        }
    )
);
