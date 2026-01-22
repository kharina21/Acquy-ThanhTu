import { Routes, Route } from 'react-router';

// Pages
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import HomePage from '../pages/HomePage';
import ProfilePage from '../pages/ProfilePage/ProfilePage';
import UserManagementPage from '../pages/UserManagementPage/UserManagementPage';
import NotFoundPage from '../pages/error/NotFoundPage';
import ForbiddenPage from '../pages/error/ForbiddenPage';

// Dashboards
import AdminMenu from '../components/dashboard/AdminMenu';
import SellerDashboard from '../components/dashboard/SellerDashboard';
import OwnerDashboard from '../components/dashboard/OwnerDashboard';
import AgencyDashboard from '../components/dashboard/AgencyDashboard';
import ManagerDashboard from '../components/dashboard/ManagerDashboard';
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

                    {/* Admin Routes */}
                    <Route element={<RoleProtectedRoute allowedRoles={['admin']} />}>
                        <Route path="/admin" element={<AdminMenu />} />
                        <Route path="/users" element={<UserManagementPage />} />
                        {/* Thêm các admin routes khác ở đây */}
                    </Route>

                    {/* Owner Routes */}
                    <Route element={<RoleProtectedRoute allowedRoles={['owner']} />}>
                        <Route path="/owner/dashboard" element={<OwnerDashboard />} />
                        <Route path="/users" element={<UserManagementPage />} />
                        {/* Thêm các owner routes khác ở đây */}
                    </Route>

                    {/* Manager Routes */}
                    <Route element={<RoleProtectedRoute allowedRoles={['manager']} />}>
                        <Route path="/manager/dashboard" element={<ManagerDashboard />} />
                        {/* Thêm các manager routes khác ở đây */}
                    </Route>

                    {/* Agency Routes */}
                    <Route element={<RoleProtectedRoute allowedRoles={['agency']} />}>
                        <Route path="/agency/dashboard" element={<AgencyDashboard />} />
                        {/* Thêm các agency routes khác ở đây */}
                    </Route>

                    {/* Seller Routes */}
                    <Route element={<RoleProtectedRoute allowedRoles={['seller']} />}>
                        <Route path="/seller/dashboard" element={<SellerDashboard />} />
                        {/* Thêm các seller routes khác ở đây */}
                    </Route>

                    {/* Staff Routes */}
                    <Route element={<RoleProtectedRoute allowedRoles={['staff']} />}>
                        <Route path="/staff/dashboard" element={<StaffDashboard />} />
                        {/* Thêm các staff routes khác ở đây */}
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

