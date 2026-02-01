import { useAuthStore } from '@/stores/useAuthStore';
import { useMemo } from 'react';

/**
 * Hook để kiểm tra role và permission của user hiện tại
 */
export const useUserRole = () => {
    const { user } = useAuthStore();

    // Lấy danh sách tên roles
    const userRoles = useMemo(() => {
        if (!user || !user.roles) return [];
        return user.roles.map((role) => role.name);
    }, [user]);

    // Kiểm tra user có role cụ thể không
    const hasRole = (roleName) => {
        return userRoles.includes(roleName);
    };

    // Kiểm tra user có một trong các roles không
    const hasAnyRole = (...roleNames) => {
        return roleNames.some((roleName) => userRoles.includes(roleName));
    };

    // Kiểm tra user có tất cả các roles không
    const hasAllRoles = (...roleNames) => {
        return roleNames.every((roleName) => userRoles.includes(roleName));
    };

    // Memoize các giá trị boolean để tránh re-render không cần thiết
    const isAdmin = useMemo(() => userRoles.includes('admin'), [userRoles]);
    const isUser = useMemo(() => userRoles.includes('user'), [userRoles]);
    const isSeller = useMemo(() => userRoles.includes('seller'), [userRoles]);
    const isOwner = useMemo(() => userRoles.includes('owner'), [userRoles]);
    const isManager = useMemo(() => userRoles.includes('manager'), [userRoles]);
    const isStaff = useMemo(() => userRoles.includes('staff'), [userRoles]);

    //k co role = guest

    return {
        userRoles,
        hasRole,
        hasAnyRole,
        hasAllRoles,
        isAdmin,
        isUser,
        isSeller,
        isOwner,
        isManager,
        isStaff,
    };
};
