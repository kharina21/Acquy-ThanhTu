import api from '@/lib/axios';
import { toast } from 'sonner';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
        }),
        {
            name: 'auth-store',
            partialize: (state) => ({ user: state.user, accessToken: state.accessToken }),
        }
    )
);
