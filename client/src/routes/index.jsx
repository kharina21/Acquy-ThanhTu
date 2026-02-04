import { Routes, Route, Navigate } from 'react-router';

// Pages
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import HomePage from '../pages/HomePage';
import ProfilePage from '../pages/ProfilePage/ProfilePage';
import UserManagementPage from '../pages/UserManagementPage/UserManagementPage';
import StaffManagementPage from '../pages/StaffManagementPage/StaffManagementPage';
import ProductManagementPage from '../pages/ProductManagementPage/ProductManagementPage';
import CategoryManagementPage from '../pages/CategoryManagementPage/CategoryManagementPage';
import StoreProfilePage from '../pages/StoreProfilePage/StoreProfilePage';
import NotFoundPage from '../pages/error/NotFoundPage';
import ForbiddenPage from '../pages/error/ForbiddenPage';

// Dashboards
import AdminDashboard from '../components/dashboard/AdminDashboard';
import StaffDashboard from '../components/dashboard/StaffDashboard';

// Route Guards
import PublicRoute from '../components/auth/PublicRoute';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import RoleProtectedRoute from '../components/auth/RoleProtectedRoute';
import DefaultRoute from '../components/auth/DefaultRoute';

// Layouts
import RoleBasedLayout from '../components/layouts/RoleBasedLayout';


export const AppRoutes = () => {
    return (
        <Routes>
            {/* DEFAULT ROUTE - Redirect dựa trên role */}
            <Route path="/" element={<DefaultRoute />} />

            {/* PUBLIC ROUTES - Chỉ cho phép truy cập khi CHƯA đăng nhập */}
            {/* Nếu đã đăng nhập, sẽ bị redirect về trang phù hợp với role */}
            <Route element={<PublicRoute />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
            </Route>

            {/* PUBLIC HOME - Cho phép cả authenticated và unauthenticated users */}
            <Route path="/home" element={<HomePage />} />

            {/* PROTECTED ROUTES - Cần đăng nhập, chỉ truy cập được các trang dựa trên role */}
            <Route element={<ProtectedRoute />}>
                <Route element={<RoleBasedLayout />}>
                    {/* Common routes - Tất cả authenticated users đều có thể truy cập */}
                    <Route path="/profile" element={<ProfilePage />} />

                    {/* Admin + Manager: trang quản lý chung */}
                    <Route element={<RoleProtectedRoute allowedRoles={['admin', 'manager']} />}>
                        <Route path="/admin" element={<AdminDashboard />} />
                        <Route path="/admin/dashboard" element={<Navigate to="/admin" replace />} />
                        <Route path="/admin/products" element={<ProductManagementPage />} />
                        <Route path="/admin/categories" element={<CategoryManagementPage />} />
                        <Route path="/users" element={<UserManagementPage />} />
                        <Route path="/admin/staffs" element={<StaffManagementPage />} />
                        <Route path="/admin/store-profile" element={<StoreProfilePage />} />
                    </Route>

                    {/* Warehouse manager: kho hàng (kiểm kho) + có thể xem admin */}
                    <Route element={<RoleProtectedRoute allowedRoles={['admin', 'manager', 'warehouse_manager']} />}>
                        <Route path="/admin/warehouses" element={<ProductManagementPage initialTab="stock-check" />} />
                    </Route>

                    {/* Seller / Staff: dashboard nhân viên */}
                    <Route element={<RoleProtectedRoute allowedRoles={['seller', 'staff']} />}>
                        <Route path="/staff/dashboard" element={<StaffDashboard />} />
                    </Route>

                    {/* User Routes - Nếu cần routes riêng cho user role */}
                    {/* <Route element={<RoleProtectedRoute allowedRoles={['user']} />}>
                        <Route path="/user/dashboard" element={<UserDashboard />} />
                    </Route> */}
                </Route>
            </Route>

            {/* Error Pages */}
            <Route path="/forbidden" element={<ForbiddenPage />} />
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
};

