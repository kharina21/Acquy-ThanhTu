import { Toaster } from 'sonner';
import { BrowserRouter, Routes, Route } from 'react-router';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './components/dashboard/AdminDashboard';
import SellerDashboard from './components/dashboard/SellerDashboard';
import OwnerDashboard from './components/dashboard/OwnerDashboard';
import AgencyDashboard from './components/dashboard/AgencyDashboard';
import ManagerDashboard from './components/dashboard/ManagerDashboard';
import StaffDashboard from './components/dashboard/StaffDashboard';
import HomePage from './pages/HomePage';
import PublicRoute from './components/auth/PublicRoute';
import ProtectedRoute from './components/auth/ProtectedRoute';
import RoleProtectedRoute from './components/auth/RoleProtectedRoute';
import RegisterPage from './pages/RegisterPage';
import { useAuthTheme } from './stores/useAuthTheme';
import ThemeSwitcherButton from './components/ThemeSwitcherButton';
import NotFoundPage from './pages/error/NotFoundPage';
import ForbiddenPage from './pages/error/ForbiddenPage';
import RoleBasedLayout from './components/layouts/RoleBasedLayout';

function App() {
    const { theme } = useAuthTheme();
    return (
        <div className='h-screen w-full relative' data-theme={theme}>
            <div className='relative'>
                {/* <ThemeSwitcherButton /> */}
                <Toaster richColors />

                <BrowserRouter>
                    <Routes>
                        {/* Public Routes */}
                        <Route element={<PublicRoute />}>
                            <Route path='/login' element={<LoginPage />} />
                            <Route path='/register' element={<RegisterPage />} />
                            <Route path='/home' element={<HomePage />} />
                        </Route>

                        {/* Protected Routes - Redirect based on role */}
                        <Route path='/' element={<ProtectedRoute />} />

                        {/* Role-based Routes with Layout */}
                        <Route element={<RoleBasedLayout />}>
                            {/* Admin Routes */}
                            <Route element={<RoleProtectedRoute allowedRoles={['admin']} />}>
                                <Route path='/admin/dashboard' element={<AdminDashboard />} />
                            </Route>

                            {/* Owner Routes */}
                            <Route element={<RoleProtectedRoute allowedRoles={['owner']} />}>
                                <Route path='/owner/dashboard' element={<OwnerDashboard />} />
                            </Route>

                            {/* Manager Routes */}
                            <Route element={<RoleProtectedRoute allowedRoles={['manager']} />}>
                                <Route path='/manager/dashboard' element={<ManagerDashboard />} />
                            </Route>

                            {/* Agency Routes */}
                            <Route element={<RoleProtectedRoute allowedRoles={['agency']} />}>
                                <Route path='/agency/dashboard' element={<AgencyDashboard />} />
                            </Route>

                            {/* Seller Routes */}
                            <Route element={<RoleProtectedRoute allowedRoles={['seller']} />}>
                                <Route path='/seller/dashboard' element={<SellerDashboard />} />
                            </Route>

                            {/* Staff Routes */}
                            <Route element={<RoleProtectedRoute allowedRoles={['staff']} />}>
                                <Route path='/staff/dashboard' element={<StaffDashboard />} />
                            </Route>

                            {/* User Routes */}
                        </Route>

                        {/* Error Pages */}
                        <Route path='/forbidden' element={<ForbiddenPage />} />
                        <Route path='*' element={<NotFoundPage />} />
                    </Routes>
                </BrowserRouter>
            </div>
        </div>
    );
}

export default App;
