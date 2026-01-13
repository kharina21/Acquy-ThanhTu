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

    const isAdmin = hasRole('admin');

    const isUser = hasRole('user');

    const isSeller = hasRole('seller');

    const isOwner = hasRole('owner');

    const isAgency = hasRole('agency');

    const isManager = hasRole('manager');

    const isStaff = hasRole('staff');

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
        isAgency,
        isManager,
        isStaff,
    };
};
