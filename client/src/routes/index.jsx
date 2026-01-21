import { Routes, Route } from 'react-router';

// Pages
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import HomePage from '../pages/HomePage';
import ProfilePage from '../pages/ProfilePage/ProfilePage';
import NotFoundPage from '../pages/error/NotFoundPage';
import ForbiddenPage from '../pages/error/ForbiddenPage';

// Dashboards
import AdminDashboard from '../components/dashboard/AdminDashboard';
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
            {/*PUBLIC ROUTES - Không cần đăng nhập*/}
            <Route element={<PublicRoute />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/home" element={<HomePage />} />
            </Route>

            {/* DEFAULT ROUTE - Redirect dựa trên role */}
            <Route path="/" element={<DefaultRoute />} />

            {/* PROTECTED ROUTES - Cần đăng nhập */}
            <Route element={<ProtectedRoute />}>
                <Route element={<RoleBasedLayout />}>
                    {/* common routes */}
                    <Route path="/profile" element={<ProfilePage />} />


                    <Route element={<RoleProtectedRoute allowedRoles={['admin']} />}>
                        <Route path="/admin/dashboard" element={<AdminDashboard />} />
                        {/* Thêm các admin routes khác ở đây */}
                    </Route>

                    <Route element={<RoleProtectedRoute allowedRoles={['owner']} />}>
                        <Route path="/owner/dashboard" element={<OwnerDashboard />} />
                        {/* Thêm các owner routes khác ở đây */}
                    </Route>

                    <Route element={<RoleProtectedRoute allowedRoles={['manager']} />}>
                        <Route path="/manager/dashboard" element={<ManagerDashboard />} />

                    </Route>


                    <Route element={<RoleProtectedRoute allowedRoles={['agency']} />}>
                        <Route path="/agency/dashboard" element={<AgencyDashboard />} />

                    </Route>


                    <Route element={<RoleProtectedRoute allowedRoles={['seller']} />}>
                        <Route path="/seller/dashboard" element={<SellerDashboard />} />

                    </Route>


                    <Route element={<RoleProtectedRoute allowedRoles={['staff']} />}>
                        <Route path="/staff/dashboard" element={<StaffDashboard />} />
                        {/* Thêm các staff routes khác ở đây */}
                    </Route>

                    {/* Thêm các user routes ở đây nếu cần */}
                </Route>
            </Route>


            <Route path="/forbidden" element={<ForbiddenPage />} />
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
};

