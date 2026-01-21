import api from '@/lib/axios';
import { toast } from 'sonner';
import { create } from 'zustand';
import { useLogStore } from './useLogStore';
import { useAuthStore } from './useAuthStore';

export const useMailStore = create(
    (set, get) => ({
        isLoading: false,
        sendVerificationCode: async () => {
            try {
                set({ isLoading: true });
                const response = await api.post('/auth/send-verification-email');
                toast.success('Mã xác thực đã được gửi đến email của bạn');

            } catch (error) {
                console.error('Error sending verification code:', error);
                const errorMessage = error.response?.data?.message || 'Gửi mã xác thực thất bại';
                toast.error(errorMessage);
            } finally {
                set({ isLoading: false });
            }
        },

        verifyEmail: async (code) => {
            try {
                set({ isLoading: true });
                const response = await api.post('/auth/verify-email', { code });
                await useAuthStore.getState().fetchUser();
                toast.success('Xác thực email thành công');
                // Refresh activity logs
                await useLogStore.getState().fetchActivityLogs(1);
            } catch (error) {
                console.error('Error verifying email:', error);
                const errorMessage = error.response?.data?.message || 'Xác thực email thất bại';
                toast.error(errorMessage);
                throw error;
            } finally {
                set({ isLoading: false });
            }
        }

    }),
);
