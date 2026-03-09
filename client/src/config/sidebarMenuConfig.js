import { BadgePercent, Boxes, LayoutDashboard, Package, UserRound, UserRoundPen, UsersRound } from 'lucide-react';

/**
 * Cấu hình menu sidebar - gắn với permission RBAC.
 * permission: { resource, action } - null = luôn hiển thị (vd: Tài khoản).
 * Admin bypass tất cả, các role khác cần có permission tương ứng.
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
        to: '/admin/products',
        icon: Package,
        label: 'Sản phẩm',
        ariaLabel: 'Quản lý sản phẩm',
        permission: { resource: 'product', action: 'read' },
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
        to: '/admin/warehouses',
        icon: Boxes,
        label: 'Kho hàng',
        ariaLabel: 'Quản lý kho hàng',
        permission: { resource: 'stock_check', action: 'read' },
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
