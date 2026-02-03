import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getLocations } from '@/services/locationService';

const STORAGE_KEY = 'branch-store';

export const useBranchStore = create(
    persist(
        (set, get) => ({
            locations: [],
            currentLocationId: null,
            loading: false,
            loaded: false,

            fetchLocations: async () => {
                set({ loading: true });
                try {
                    const res = await getLocations();
                    const list = (res.success && res.data?.locations) ? res.data.locations : [];
                    const activeList = list.filter((l) => l.isActive !== false);
                    set({ locations: activeList, loaded: true });

                    const { currentLocationId } = get();
                    const validId = activeList.some((l) => l._id === currentLocationId);
                    if (activeList.length > 0 && (!currentLocationId || !validId)) {
                        set({ currentLocationId: activeList[0]._id });
                    }
                    if (activeList.length === 0) {
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
