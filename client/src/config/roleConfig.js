/**
 * 4 vai trò được phép gán khi tạo/sửa người dùng.
 * Tên khớp với seed RBAC: admin, manager, warehouse_manager, customer, seller
 */
export const ASSIGNABLE_ROLES = [
    { name: 'user', label: 'Người dùng thường', aliases: [] },
    { name: 'customer', label: 'Khách hàng', aliases: [] },
    { name: 'seller', label: 'Nhân viên bán hàng', aliases: [] },
    { name: 'warehouse_manager', label: 'Quản lý kho', aliases: [] },
    { name: 'manager', label: 'Quản lý', aliases: [] },
];

/** Lấy options cho dropdown: dùng role từ API nếu khớp, không thì dùng name tĩnh */
export const getAssignableRoleOptions = (apiRoles = []) => {
    return ASSIGNABLE_ROLES.map((r) => {
        const matched = apiRoles.find(
            (api) => api.name === r.name || (r.aliases && r.aliases.includes(api.name))
        );
        return { name: matched ? matched.name : r.name, label: r.label };
    });
};

/**
 * Lấy options cho modal Đổi vai trò, theo điều kiện:
 * - user (chỉ khi chưa mua hàng), customer (chỉ khi đã mua hàng), manager, warehouse_manager, seller
 * @param {Array} apiRoles - roles từ API
 * @param {Object} user - user đang đổi vai trò (có hasPurchases). Nếu null/undefined = chưa mua hàng (create user)
 */
export const getAssignableRoleOptionsForUser = (apiRoles = [], user = null) => {
    const hasPurchases = user?.hasPurchases === true;
    const allowedNames = hasPurchases
        ? ['customer', 'manager', 'warehouse_manager', 'seller']
        : ['user', 'manager', 'warehouse_manager', 'seller'];

    return ASSIGNABLE_ROLES.filter((r) => allowedNames.includes(r.name)).map((r) => {
        const matched = apiRoles.find(
            (api) => api.name === r.name || (r.aliases && r.aliases.includes(api.name))
        );
        return { name: matched ? matched.name : r.name, label: r.label };
    });
};

export const ROLE_LABELS = {
    user: 'Người dùng thường',
    customer: 'Khách hàng',
    seller: 'Nhân viên bán hàng',
    warehouse_manager: 'Quản lý kho',
    manager: 'Quản lý',
    admin: 'Quản trị viên',
};
