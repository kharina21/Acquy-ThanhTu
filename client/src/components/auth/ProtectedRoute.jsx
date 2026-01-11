import { useAuthStore } from '@/stores/useAuthStore';
import React from 'react';
import { Navigate, Outlet } from 'react-router';

const ProtectedRoute = () => {
    const { user } = useAuthStore();
    if (!user) {
        return <Navigate to='/login' />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
