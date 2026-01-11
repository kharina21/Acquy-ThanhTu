import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthTheme = create(
    persist(
        (set, get) => ({
            //default theme || more theme: admin-modern-dark
            theme: 'light',
            setTheme: (theme) => set({ theme }),
        }),
        { name: 'theme-store', partialize: (state) => ({ theme: state.theme }) }
    )
);
