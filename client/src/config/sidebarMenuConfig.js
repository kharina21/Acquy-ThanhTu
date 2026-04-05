import { BadgePercent, Boxes, LayoutDashboard, Package, Receipt, RotateCw, UserRound, UserRoundPen, UsersRound } from 'lucide-react';

/**
 * Cấu hình menu sidebar - RBAC theo vai trò.
 * allowedRoles: mảng tên role được phép xem. null = luôn hiển thị (vd: Tài khoản).
 * subItems: dropdown con (dùng khi có children)
 */
export const SIDEBAR_MENU_ITEMS = [
    {
        id: 'dashboard',
        to: '/admin',
        icon: LayoutDashboard,
        label: 'Tổng quan',
        ariaLabel: 'Tổng quan',
        activePaths: ['/admin', '/admin/dashboard'],
        allowedRoles: ['admin', 'manager', 'Quản lý chi nhánh'],
    },
    {
        id: 'products',
        icon: Package,
        label: 'Sản phẩm',
        ariaLabel: 'Quản lý sản phẩm',
        allowedRoles: ['admin', 'manager', 'Quản lý chi nhánh'],
        subItems: [
            { id: 'products-list', to: '/admin/products', label: 'Danh sách sản phẩm' },
            { id: 'categories', to: '/admin/categories', label: 'Loại hàng' },
            { id: 'usage-devices', to: '/admin/usage-devices', label: 'Thiết bị sử dụng' },
            { id: 'brands', to: '/admin/brands', label: 'Thương hiệu' },
        ],
    },
    {
        id: 'users',
        to: '/users',
        icon: UsersRound,
        label: 'Người dùng',
        ariaLabel: 'Quản lý người dùng',
        allowedRoles: ['admin', 'manager', 'Quản lý chi nhánh'],
    },
    {
        id: 'staffs',
        to: '/admin/staffs',
        icon: UserRoundPen,
        label: 'Nhân viên',
        ariaLabel: 'Quản lý nhân viên',
        allowedRoles: ['admin', 'manager', 'Quản lý chi nhánh'],
        activePaths: ['/admin/staffs'],
    },
    {
        id: 'battery-trade-in',
        to: '/admin/battery-trade-in',
        icon: RotateCw,
        label: 'Thu cũ acquy',
        ariaLabel: 'Quản lý yêu cầu thu cũ acquy',
        activePaths: ['/admin/battery-trade-in'],
        allowedRoles: ['admin'],
    },
    {
        id: 'orders',
        icon: Receipt,
        label: 'Đơn hàng',
        ariaLabel: 'Quản lý đơn hàng cửa hàng',
        allowedRoles: ['admin', 'manager', 'seller', 'warehouse_manager', 'Quản lý chi nhánh'],
        activePaths: ['/admin/orders'],
        subItems: [
            { id: 'pre-orders', to: '/admin/orders/pre-orders', label: 'Đặt hàng' },
            { id: 'invoices', to: '/admin/orders/invoices', label: 'Hóa đơn' },
            { id: 'returns', to: '/admin/orders/returns', label: 'Trả hàng' },
            { id: 'orders-report', to: '/admin/orders/report', label: 'Báo cáo đơn hàng' },
        ],
    },
    {
        id: 'customers',
        to: '/admin/customers',
        icon: UsersRound,
        label: 'Khách hàng',
        ariaLabel: 'Quản lý khách hàng',
        allowedRoles: ['admin', 'manager', 'seller', 'Quản lý chi nhánh'],
    },
    {
        id: 'member-policies',
        to: '/admin/member-policies',
        icon: BadgePercent,
        label: 'Chính sách khách hàng',
        ariaLabel: 'Chính sách hạng / ưu đãi khách hàng',
        allowedRoles: ['admin', 'manager', 'Quản lý chi nhánh'],
    },
    {
        id: 'warehouses',
        icon: Boxes,
        label: 'Kho hàng',
        ariaLabel: 'Quản lý kho hàng',
        allowedRoles: ['admin', 'manager', 'warehouse_manager', 'Quản lý chi nhánh'],
        subItems: [
            { id: 'stock-check', to: '/admin/warehouses/stock-check', label: 'Kiểm kho' },
            { id: 'import', to: '/admin/warehouses/import', label: 'Nhập hàng' },
            { id: 'stock-out', to: '/admin/warehouses/stock-out', label: 'Xuất kho' },
            { id: 'outbound-scan', to: '/admin/warehouses/outbound-scan', label: 'Quét xuất đơn online' },
            { id: 'nxt-report', to: '/admin/warehouses/nxt-report', label: 'Báo cáo NXT' },
            { id: 'report-stock-in', to: '/admin/warehouses/report-stock-in', label: 'Báo cáo nhập hàng' },
            { id: 'report-stock-out', to: '/admin/warehouses/report-stock-out', label: 'Báo cáo xuất kho' },
            { id: 'stock-returns', to: '/admin/warehouses/stock-returns', label: 'Trả hàng nhập' },
            { id: 'suppliers', to: '/admin/warehouses/suppliers', label: 'Nhà cung cấp' },
        ],
    },
    {
        id: 'profile',
        to: '/profile',
        icon: UserRound,
        label: 'Tài khoản',
        ariaLabel: 'Xem tài khoản',
        allowedRoles: null,
    },
];
