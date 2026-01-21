
import api from '@/lib/axios';
import { create } from 'zustand';




export const useLogStore = create(

    (set, get) => ({
        activityLogs: [],
        loadingLogs: false,
        logPagination: {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
        },
        // Fetch activity logs
        fetchActivityLogs: async (page = 1) => {
            try {
                set({ loadingLogs: true });
                const response = await api.get('/activity-logs/me', {
                    params: {
                        page,
                        limit: get().logPagination.limit,
                    },
                });
                if (response.data.success) {
                    set({ activityLogs: response.data.data.logs });
                    set({ logPagination: response.data.data.pagination });
                }
            } catch (error) {
                console.error('Error fetching activity logs:', error);
            } finally {
                set({ loadingLogs: false });
            }
        },

    }),
);
