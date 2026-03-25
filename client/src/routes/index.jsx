import { Routes, Route, Navigate } from 'react-router';

// Pages
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import HomePage from '../pages/HomePage';
import CartPage from '../pages/CartPage';
import CheckoutPage from '../pages/CheckoutPage';
import OrderHistoryPage from '../pages/OrderHistoryPage';
import OrderDetailPage from '../pages/OrderDetailPage';
import ProfilePage from '../pages/ProfilePage/ProfilePage';
import UserManagementPage from '../pages/UserManagementPage/UserManagementPage';
import StaffManagementPage from '../pages/StaffManagementPage/StaffManagementPage';
import ProductManagementPage from '../pages/ProductManagementPage/ProductManagementPage';
import StockCheckPage from '../pages/WarehousePage/StockCheckPage';
import ImportGoodsPage from '../pages/WarehousePage/ImportGoodsPage';
import StockReturnsPage from '../pages/WarehousePage/StockReturnsPage';
import SuppliersPage from '../pages/WarehousePage/SuppliersPage';
import CategoryManagementPage from '../pages/CategoryManagementPage/CategoryManagementPage';
import BrandManagementPage from '../pages/BrandManagementPage/BrandManagementPage';
import UsageDeviceManagementPage from '../pages/UsageDeviceManagementPage/UsageDeviceManagementPage';
import StoreProfilePage from '../pages/StoreProfilePage/StoreProfilePage';
import MemberPolicyPage from '../pages/MemberPolicyPage/MemberPolicyPage';
import CustomersPage from '../pages/CustomersPage/CustomersPage';
import UseCasesPage from '../pages/UseCasesPage/UseCasesPage';
import CreateInvoicePage from '../pages/CreateInvoicePage/CreateInvoicePage';
import AdminOrderManagementPage from '../pages/AdminOrderManagementPage/AdminOrderManagementPage';
import AdminOrderDetailPage from '../pages/AdminOrderManagementPage/AdminOrderDetailPage';
import AdminBatteryTradeInPage from '../pages/AdminBatteryTradeInPage';
import CustomerReturnsPage from '../pages/AdminOrderManagementPage/CustomerReturnsPage';
import OrderManagementPage from '../pages/OrderManagementPage/OrderManagementPage';
import OrderReportPage from '../pages/OrderManagementPage/OrderReportPage';
import NotFoundPage from '../pages/error/NotFoundPage';
import ForbiddenPage from '../pages/error/ForbiddenPage';
import ListProduct from '../pages/ListProduct';
import BatteryTradeInPage from '../pages/BatteryTradeInPage';
import BatteryTradeInLookupPage from '../pages/BatteryTradeInLookupPage';
import ProductDetailPage from '../pages/ProductDetailPage';

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
import SalesLayout from '../components/layouts/SalesLayout';

export const AppRoutes = () => {
    return (
        <Routes>
            {/* DEFAULT ROUTE - Redirect dựa trên role */}
            <Route
                path='/'
                element={<DefaultRoute />}
            />

            {/* PUBLIC ROUTES - Chỉ cho phép truy cập khi CHƯA đăng nhập */}
            {/* Nếu đã đăng nhập, sẽ bị redirect về trang phù hợp với role */}
            <Route element={<PublicRoute />}>
                <Route
                    path='/login'
                    element={<LoginPage />}
                />
                <Route
                    path='/register'
                    element={<RegisterPage />}
                />
                <Route
                    path='/forgot-password'
                    element={<ForgotPasswordPage />}
                />
                <Route
                    path='/reset-password'
                    element={<ResetPasswordPage />}
                />
            </Route>

            {/* PUBLIC HOME - Cho phép cả authenticated và unauthenticated users */}
            <Route
                path='/home'
                element={<HomePage />}
            />
            <Route
                path='/listproduct'
                element={<ListProduct />}
            />
            <Route
                path='/product/:id'
                element={<ProductDetailPage />}
            />
            <Route
                path='/battery-trade-in'
                element={<BatteryTradeInPage />}
            />
            <Route
                path='/battery-trade-in/tra-cuu'
                element={<BatteryTradeInLookupPage />}
            />

            {/* PROTECTED ROUTES - Cần đăng nhập */}
            <Route element={<ProtectedRoute />}>
                {/* Mua hàng online - Chỉ user, customer */}
                <Route element={<RoleProtectedRoute allowedRoles={['user', 'customer']} redirectTo='/home' />}>
                    <Route path='/cart' element={<CartPage />} />
                    <Route path='/checkout' element={<CheckoutPage />} />
                    <Route path='/orders' element={<OrderHistoryPage />} />
                    <Route path='/orders/:id' element={<OrderDetailPage />} />
                </Route>

                {/* Trang Bán hàng - layout riêng, full màn hình */}
                <Route element={<RoleProtectedRoute allowedRoles={['admin', 'manager', 'seller']} />}>
                    <Route
                        path='/sales'
                        element={
                            <SalesLayout>
                                <CreateInvoicePage />
                            </SalesLayout>
                        }
                    />
                </Route>

                <Route element={<RoleBasedLayout />}>
                    {/* Common routes - Tất cả authenticated users đều có thể truy cập */}
                    <Route
                        path='/profile'
                        element={<ProfilePage />}
                    />

                    {/* Admin + Manager: trang quản lý chung */}
                    <Route element={<RoleProtectedRoute allowedRoles={['admin', 'manager', 'Quản lý chi nhánh']} />}>
                        <Route
                            path='/admin'
                            element={<AdminDashboard />}
                        />
                        <Route
                            path='/admin/dashboard'
                            element={
                                <Navigate
                                    to='/admin'
                                    replace
                                />
                            }
                        />
                        <Route
                            path='/admin/products'
                            element={<ProductManagementPage />}
                        />
                        <Route
                            path='/admin/categories'
                            element={<CategoryManagementPage />}
                        />
                        <Route
                            path='/admin/brands'
                            element={<BrandManagementPage />}
                        />
                        <Route
                            path='/admin/usage-devices'
                            element={<UsageDeviceManagementPage />}
                        />
                        <Route
                            path='/users'
                            element={<UserManagementPage />}
                        />
                        <Route
                            path='/admin/staffs/schedule'
                            element={<StaffManagementPage />}
                        />
                        <Route
                            path='/admin/staffs'
                            element={<StaffManagementPage />}
                        />
                        <Route
                            path='/admin/customers'
                            element={<CustomersPage />}
                        />
                        <Route
                            path='/admin/member-policies'
                            element={<MemberPolicyPage />}
                        />
                        <Route
                            path='/admin/store-profile'
                            element={<StoreProfilePage />}
                        />
                    </Route>

                    {/* Use Cases: chỉ admin */}
                    <Route element={<RoleProtectedRoute allowedRoles={['admin']} />}>
                        <Route
                            path='/admin/use-cases'
                            element={<UseCasesPage />}
                        />
                        <Route
                            path='/admin/battery-trade-in'
                            element={<AdminBatteryTradeInPage />}
                        />
                    </Route>

                    {/* Quản lý đơn hàng cửa hàng: admin, manager, seller */}
                    <Route element={<RoleProtectedRoute allowedRoles={['admin', 'manager', 'seller']} />}>
                        <Route
                            path='/admin/orders/pre-orders'
                            element={<AdminOrderManagementPage key="pre-orders" type="pre-orders" />}
                        />
                        <Route
                            path='/admin/orders/invoices'
                            element={<AdminOrderManagementPage key="invoices" type="invoices" />}
                        />
                        <Route
                            path='/admin/orders/returns'
                            element={<CustomerReturnsPage />}
                        />
                        <Route
                            path='/admin/orders/report'
                            element={<OrderReportPage />}
                        />
                        <Route
                            path='/admin/orders'
                            element={<AdminOrderManagementPage key="invoices" type="invoices" />}
                        />
                        <Route
                            path='/admin/orders/:id'
                            element={<AdminOrderDetailPage />}
                        />
                    </Route>

                    {/* Warehouse manager: kho hàng (kiểm kho, nhập hàng, nhà cung cấp) */}
                    <Route element={<RoleProtectedRoute allowedRoles={['admin', 'manager', 'warehouse_manager']} />}>
                        <Route
                            path='/admin/warehouses'
                            element={
                                <Navigate
                                    to='/admin/warehouses/stock-check'
                                    replace
                                />
                            }
                        />
                        <Route
                            path='/admin/warehouses/stock-check'
                            element={<StockCheckPage />}
                        />
                        <Route
                            path='/admin/warehouses/import'
                            element={<ImportGoodsPage />}
                        />
                        <Route
                            path='/admin/warehouses/stock-returns'
                            element={<StockReturnsPage />}
                        />
                        <Route
                            path='/admin/warehouses/suppliers'
                            element={<SuppliersPage />}
                        />
                    </Route>

                    {/* Seller / Staff: dashboard nhân viên */}
                    <Route element={<RoleProtectedRoute allowedRoles={['seller', 'staff', 'Nhân viên bán hàng']} />}>
                        <Route
                            path='/staff/dashboard'
                            element={<StaffDashboard />}
                        />
                    </Route>

                    {/* User Routes - Nếu cần routes riêng cho user role */}
                    {/* <Route element={<RoleProtectedRoute allowedRoles={['user']} />}>
                        <Route path="/user/dashboard" element={<UserDashboard />} />
                    </Route> */}
                </Route>
            </Route>

            {/* Error Pages */}
            <Route
                path='/forbidden'
                element={<ForbiddenPage />}
            />
            <Route
                path='*'
                element={<NotFoundPage />}
            />
        </Routes>
    );
};
