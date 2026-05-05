import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getLocations } from '@/services/locationService';
import { useAuthStore } from '@/stores/useAuthStore';

const STORAGE_KEY = 'branch-store';

export const useBranchStore = create(
    persist(
        (set, get) => ({
            locations: [],
            currentLocationId: null,
            loading: false,
            loaded: false,

            /**
             * @param {{ scope?: 'mine'|'all' }} opts
             * - Không truyền scope: admin → tất cả chi nhánh; nhân viên (seller, kho, quản lý chi nhánh…) → chỉ chi nhánh được phân (Employee).
             * - Gọi nhầm fetchLocations() không scope sẽ không còn lộ toàn bộ cơ sở cho NV.
             */
            fetchLocations: async (opts = {}) => {
                set({ loading: true });
                try {
                    const user = useAuthStore.getState().user;
                    const roleNames = user?.roles?.map((r) => r?.name).filter(Boolean) || [];
                    const isAdmin = roleNames.includes('admin');
                    let scope = opts.scope;
                    if (scope === 'all' && !isAdmin) {
                        scope = 'mine';
                    }
                    if (scope === undefined) {
                        scope = isAdmin ? 'all' : 'mine';
                    }
                    const params = scope === 'mine' ? { scope: 'mine' } : {};
                    const res = await getLocations(params);
                    const list = (res.success && res.data?.locations) ? res.data.locations : [];
                    const activeList = list.filter((l) => l.isActive !== false);
                    set({ locations: activeList, loaded: true });

                    const { currentLocationId } = get();
                    const isAll = currentLocationId === 'all';
                    const validId = activeList.some((l) => l._id === currentLocationId);
                    /** Luôn một chi nhánh cụ thể — không còn «Tất cả» trong UI. */
                    if (activeList.length > 0) {
                        if (isAll || !currentLocationId || !validId) {
                            set({ currentLocationId: activeList[0]._id });
                        }
                    } else {
                        set({ currentLocationId: null });
                    }
                } catch (e) {
                    set({ locations: [], loaded: true });
                } finally {
                    set({ loading: false });
                }
            },

            setCurrentLocationId: (id) => {
                set({ currentLocationId: id || null });
            },

            getCurrentLocation: () => {
                const { locations, currentLocationId } = get();
                return locations.find((l) => l._id === currentLocationId) || null;
            },

            reset: () => {
                set({ locations: [], currentLocationId: null, loaded: false });
            },
        }),
        {
            name: STORAGE_KEY,
            partialize: (state) => ({ currentLocationId: state.currentLocationId }),
        }
    )
);
