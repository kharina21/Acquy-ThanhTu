import { useMemo } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';

/**
 * Hook kiểm tra quyền RBAC của user hiện tại.
 * Admin có toàn quyền (bypass).
 * Các role khác kiểm tra qua permissions từ roles.
 */
export const usePermissions = () => {
    const user = useAuthStore((s) => s.user);

    const { permissions, isAdmin } = useMemo(() => {
        if (!user?.roles) return { permissions: [], isAdmin: false };

        const roleNames = user.roles.map((r) => r?.name).filter(Boolean);
        const admin = roleNames.includes('admin');

        const perms = new Map();
        for (const role of user.roles) {
            if (!role?.permissions) continue;
            for (const p of role.permissions) {
                if (p?.resource && p?.action) {
                    const key = `${p.resource}:${p.action}`;
                    perms.set(key, true);
                    if (p.action === 'manage') {
                        ['create', 'read', 'update', 'delete'].forEach((a) => {
                            perms.set(`${p.resource}:${a}`, true);
                        });
                    }
                }
            }
        }

        return { permissions: perms, isAdmin: admin };
    }, [user]);

    const hasPermission = useMemo(
        () =>
            (resource, action) => {
                if (isAdmin) return true;
                if (!resource || !action) return false;
                return (
                    permissions.has(`${resource}:${action}`) ||
                    permissions.has(`${resource}:manage`)
                );
            },
        [isAdmin, permissions]
    );

    return { hasPermission, isAdmin, permissions };
};
