import { BadgePercent, Boxes, FileText, LayoutDashboard, Package, Receipt, RotateCw, UserRound, UserRoundPen, UsersRound } from 'lucide-react';

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
        allowedRoles: ['admin', 'manager'],
    },
    {
        id: 'products',
        icon: Package,
        label: 'Sản phẩm',
        ariaLabel: 'Quản lý sản phẩm',
        allowedRoles: ['admin', 'manager'],
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
        allowedRoles: ['admin', 'manager'],
    },
    {
        id: 'staffs',
        to: '/admin/staffs',
        icon: UserRoundPen,
        label: 'Nhân viên',
        ariaLabel: 'Quản lý nhân viên',
        allowedRoles: ['admin', 'manager'],
    },
    {
        id: 'battery-trade-in',
        to: '/admin/battery-trade-in',
        icon: RotateCw,
        label: 'Thu cũ acquy',
        ariaLabel: 'Quản lý yêu cầu thu cũ acquy',
        activePaths: ['/admin/battery-trade-in'],
        permission: { resource: 'product', action: 'read' },
    },
    {
        id: 'orders',
        icon: Receipt,
        label: 'Đơn hàng',
        ariaLabel: 'Quản lý đơn hàng cửa hàng',
        allowedRoles: ['admin', 'manager', 'seller'],
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
        allowedRoles: ['admin', 'manager', 'seller'],
    },
    {
        id: 'member-policies',
        to: '/admin/member-policies',
        icon: BadgePercent,
        label: 'Chính sách khách hàng',
        ariaLabel: 'Chính sách hạng / ưu đãi khách hàng',
        allowedRoles: ['admin', 'manager'],
    },
    {
        id: 'warehouses',
        icon: Boxes,
        label: 'Kho hàng',
        ariaLabel: 'Quản lý kho hàng',
        allowedRoles: ['admin', 'manager', 'warehouse_manager'],
        subItems: [
            { id: 'stock-check', to: '/admin/warehouses/stock-check', label: 'Kiểm kho' },
            { id: 'import', to: '/admin/warehouses/import', label: 'Nhập hàng' },
            { id: 'stock-returns', to: '/admin/warehouses/stock-returns', label: 'Trả hàng nhập' },
            { id: 'suppliers', to: '/admin/warehouses/suppliers', label: 'Nhà cung cấp' },
        ],
    },
    {
        id: 'use-cases',
        to: '/admin/use-cases',
        icon: FileText,
        label: 'Use Cases',
        ariaLabel: 'Danh sách use cases',
        allowedRoles: ['admin'],
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
