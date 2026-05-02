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
import StockOutPage from '../pages/WarehousePage/StockOutPage';
import WarehouseOutboundScanPage from '../pages/WarehousePage/WarehouseOutboundScanPage';
import InventoryNxtReportPage from '../pages/WarehousePage/InventoryNxtReportPage';
import WarehouseStockLinesReportPage from '../pages/WarehousePage/WarehouseStockLinesReportPage';
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
import AdminBatteryTradeInCreatePage from '../pages/AdminBatteryTradeInCreatePage';
import CustomerReturnsPage from '../pages/AdminOrderManagementPage/CustomerReturnsPage';
import OrderManagementPage from '../pages/OrderManagementPage/OrderManagementPage';
import OrderReportPage from '../pages/OrderManagementPage/OrderReportPage';
import NotFoundPage from '../pages/error/NotFoundPage';
import ForbiddenPage from '../pages/error/ForbiddenPage';
import ListProduct from '../pages/ListProduct';
import BatteryTradeInPage from '../pages/BatteryTradeInPage';
import BatteryTradeInLookupPage from '../pages/BatteryTradeInLookupPage';
import BatteryTradeInMinePage from '../pages/BatteryTradeInMinePage';
import ProductDetailPage from '../pages/ProductDetailPage';
import ContactPage from '../pages/ContactPage';
import WarrantyLookupPage from '../pages/WarrantyLookupPage';
import AdminWarrantyPage from '../pages/AdminWarrantyPage';
import AdminWarrantyCreatePage from '../pages/AdminWarrantyCreatePage';

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
                path='/contact'
                element={<ContactPage />}
            />
            <Route
                path='/battery-trade-in'
                element={<BatteryTradeInPage />}
            />
            <Route
                path='/battery-trade-in/tra-cuu'
                element={<BatteryTradeInLookupPage />}
            />
            <Route
                path='/battery-trade-in/don-cua-toi'
                element={<BatteryTradeInMinePage />}
            />
            {/* Tra cứu bảo hành – public */}
            <Route
                path='/warranty'
                element={<WarrantyLookupPage />}
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
                <Route
                    element={
                        <RoleProtectedRoute
                            allowedRoles={[
                                'admin',
                                'manager',
                                'Quản lý chi nhánh',
                                'seller',
                                'staff',
                                'Nhân viên bán hàng',
                            ]}
                        />
                    }
                >
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

                    {/* Tổng quan */}
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
                    </Route>

                    {/* Hồ sơ cửa hàng / tạo chi nhánh — không có trong sidebar; cần cho lần đầu thiết lập */}
                    <Route element={<RoleProtectedRoute allowedRoles={['admin', 'manager', 'Quản lý chi nhánh']} />}>
                        <Route
                            path='/admin/store-profile'
                            element={<StoreProfilePage />}
                        />
                    </Route>

                    {/* Sản phẩm & danh mục (gồm quản lý kho) */}
                    <Route
                        element={
                            <RoleProtectedRoute
                                allowedRoles={['admin', 'manager', 'Quản lý chi nhánh', 'warehouse_manager']}
                            />
                        }
                    >
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
                    </Route>

                    <Route element={<RoleProtectedRoute allowedRoles={['admin']} />}>
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
                            path='/admin/member-policies'
                            element={<MemberPolicyPage />}
                        />
                    </Route>

                    <Route element={<RoleProtectedRoute allowedRoles={['admin', 'manager', 'Quản lý chi nhánh']} />}>
                        <Route
                            path='/admin/customers'
                            element={<CustomersPage />}
                        />
                    </Route>

                    <Route element={<RoleProtectedRoute allowedRoles={['admin']} />}>
                        <Route
                            path='/admin/use-cases'
                            element={<UseCasesPage />}
                        />
                    </Route>

                    <Route
                        element={
                            <RoleProtectedRoute
                                allowedRoles={[
                                    'admin',
                                    'manager',
                                    'Quản lý chi nhánh',
                                    'seller',
                                    'staff',
                                    'Nhân viên bán hàng',
                                ]}
                            />
                        }
                    >
                        <Route
                            path='/admin/battery-trade-in'
                            element={<AdminBatteryTradeInPage />}
                        />
                        <Route
                            path='/admin/battery-trade-in/create'
                            element={<AdminBatteryTradeInCreatePage />}
                        />
                        <Route
                            path='/admin/warranties'
                            element={<AdminWarrantyPage />}
                        />
                        <Route
                            path='/admin/warranties/create'
                            element={<AdminWarrantyCreatePage />}
                        />
                    </Route>

                    {/* Đơn hàng cửa hàng — không mở cho NV kho / NV bán hàng */}
                    <Route element={<RoleProtectedRoute allowedRoles={['admin', 'manager', 'Quản lý chi nhánh']} />}>
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

                    {/* Kho hàng */}
                    <Route
                        element={
                            <RoleProtectedRoute
                                allowedRoles={['admin', 'manager', 'warehouse_manager', 'Quản lý chi nhánh']}
                            />
                        }
                    >
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
                            path='/admin/warehouses/stock-out'
                            element={<StockOutPage />}
                        />
                        <Route
                            path='/admin/warehouses/outbound-scan'
                            element={<WarehouseOutboundScanPage />}
                        />
                        <Route
                            path='/admin/warehouses/nxt-report'
                            element={<InventoryNxtReportPage />}
                        />
                        <Route
                            path='/admin/warehouses/report-stock-in'
                            element={<WarehouseStockLinesReportPage variant="in" />}
                        />
                        <Route
                            path='/admin/warehouses/report-stock-out'
                            element={<WarehouseStockLinesReportPage variant="out" />}
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
