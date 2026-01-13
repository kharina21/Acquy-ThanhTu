import { useAuthStore } from '@/stores/useAuthStore';
import { useUserRole } from '@/hooks/useUserRole';
import React from 'react';
import { Navigate, Outlet } from 'react-router';

/**
 * Protected route dành cho role cụ thể
 *  - Danh sách roles được phép truy cập
 *  redirectTo - Route để redirect nếu không có quyền (mặc định: /forbidden)
 */
const RoleProtectedRoute = ({ allowedRoles = [], redirectTo = '/forbidden' }) => {
    const { user, loading } = useAuthStore();
    const { hasAnyRole } = useUserRole();

    if (loading) {
        return (
            <div className='min-h-screen flex items-center justify-center'>
                <span className='loading loading-spinner loading-lg'></span>
            </div>
        );
    }

    if (!user) {
        return <Navigate to='/' replace />;
    }

    if (allowedRoles.length > 0 && !hasAnyRole(...allowedRoles)) {
        return <Navigate to={redirectTo} replace />;
    }

    return <Outlet />;
};

export default RoleProtectedRoute;
