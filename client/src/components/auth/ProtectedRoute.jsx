import { useAuthStore } from '@/stores/useAuthStore';
import React, { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router';
/**
 * Protected Route - Chỉ kiểm tra authentication và redirect dựa trên role
 * Redirect user đến trang phù hợp dựa trên role khi truy cập "/"
 */
const ProtectedRoute = () => {
    const { user, loading } = useAuthStore();
    if (!user) return <Navigate to='/login' replace />;
    if (loading) {
        return (
            <div className='min-h-screen flex items-center text-primary justify-center'>
                <span className='loading loading-spinner loading-lg'></span>
            </div>
        );
    }

    return <Outlet />;
};

export default ProtectedRoute;
