import { Navigate } from 'react-router';
import { useUserRole } from '@/hooks/useUserRole';
import AdminDashboard from './AdminDashboard';
import StaffDashboard from './StaffDashboard';

/**
 * /admin — admin/manager: bảng điều khiển đầy đủ; seller / quản lý kho: trang chào mừng (Tổng quan).
 */
export default function AdminDashboardGate() {
    const { isAdmin, isManager, isBranchManager, isSeller, isWarehouseManager } = useUserRole();

    if (isAdmin || isManager || isBranchManager) {
        return <AdminDashboard />;
    }
    if (isWarehouseManager || isSeller) {
        return <StaffDashboard />;
    }

    return <Navigate to='/forbidden' replace />;
}
