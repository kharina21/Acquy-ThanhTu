import { useAuthStore } from '@/stores/useAuthStore';
import { useUserRole } from '@/hooks/useUserRole';
import React from 'react';
import { Navigate, Outlet } from 'react-router';

/**
 * Public Route - Chỉ cho phép truy cập khi chưa đăng nhập
 * Nếu đã đăng nhập, redirect đến trang phù hợp với role
 */
const PublicRoute = () => {
    const { user, loading } = useAuthStore();
    const { isAdmin, isUser, isSeller, isOwner, isAgency, isManager, isStaff } = useUserRole();

    // Hiển thị loading khi đang kiểm tra authentication
    if (loading) {
        return (
            <div className='min-h-screen flex items-center text-primary justify-center'>
                <span className='loading loading-spinner loading-lg'></span>
            </div>
        );
    }

    // Nếu đã đăng nhập, redirect đến trang phù hợp với role (ưu tiên theo thứ tự)
    if (user) {
        if (isAdmin) {
            return <Navigate to='/admin' replace />;
        }
        if (isOwner) {
            return <Navigate to='/owner/dashboard' replace />;
        }
        if (isManager) {
            return <Navigate to='/manager/dashboard' replace />;
        }
        if (isAgency) {
            return <Navigate to='/agency/dashboard' replace />;
        }
        if (isSeller) {
            return <Navigate to='/seller/dashboard' replace />;
        }
        if (isStaff) {
            return <Navigate to='/staff/dashboard' replace />;
        }
        if (isUser) {
            return <Navigate to='/home' replace />;
        }
        // Fallback: Nếu có user nhưng không có role nào match, redirect về home
        return <Navigate to='/home' replace />;
    }

    // Chưa đăng nhập, cho phép truy cập public routes
    return <Outlet />;
};

export default PublicRoute;
