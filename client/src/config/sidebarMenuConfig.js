import { BadgePercent, Boxes, LayoutDashboard, Package, Receipt, RotateCw, UserRound, UserRoundPen, UsersRound } from 'lucide-react';

/**
 * Cấu hình menu sidebar - gắn với permission RBAC.
 * permission: { resource, action } - null = luôn hiển thị (vd: Tài khoản).
 * Admin bypass tất cả, các role khác cần có permission tương ứng.
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
        permission: { resource: 'product', action: 'read' },
    },
    {
        id: 'products',
        icon: Package,
        label: 'Sản phẩm',
        ariaLabel: 'Quản lý sản phẩm',
        permission: { resource: 'product', action: 'read' },
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
        permission: { resource: 'user', action: 'read' },
    },
    {
        id: 'staffs',
        to: '/admin/staffs',
        icon: UserRoundPen,
        label: 'Nhân viên',
        ariaLabel: 'Quản lý nhân viên',
        permission: { resource: 'user', action: 'read' },
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
        permission: { resource: 'product', action: 'read' },
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
        permission: { resource: 'user', action: 'read' },
    },
    {
        id: 'member-policies',
        to: '/admin/member-policies',
        icon: BadgePercent,
        label: 'Chính sách khách hàng',
        ariaLabel: 'Chính sách hạng / ưu đãi khách hàng',
        permission: { resource: 'user', action: 'read' },
    },
    {
        id: 'warehouses',
        icon: Boxes,
        label: 'Kho hàng',
        ariaLabel: 'Quản lý kho hàng',
        permission: { resource: 'stock_check', action: 'read' },
        subItems: [
            { id: 'stock-check', to: '/admin/warehouses/stock-check', label: 'Kiểm kho' },
            { id: 'import', to: '/admin/warehouses/import', label: 'Nhập hàng' },
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
        permission: null,
    },
];
