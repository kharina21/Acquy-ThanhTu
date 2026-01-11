import { useAuthStore } from '@/stores/useAuthStore';
import React from 'react';
import { Navigate, Outlet } from 'react-router';

const PublicRoute = () => {
    const { user } = useAuthStore();
    if (user) {
        return <Navigate to='/' />;
    }
    return <Outlet />;
};

export default PublicRoute;
