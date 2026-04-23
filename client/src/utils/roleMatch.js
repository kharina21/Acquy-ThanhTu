/** Đồng bộ với backend/src/utils/roleEquivalence.js */
export const ROLE_EQUIVALENCE_GROUPS = [
    ['seller', 'staff', 'Nhân viên bán hàng'],
    ['manager', 'Quản lý chi nhánh'],
    ['warehouse_manager', 'Quản lý kho'],
];

export function roleMeets(userRoleNames, requiredRoleName) {
    if (!requiredRoleName || !Array.isArray(userRoleNames)) return false;
    if (userRoleNames.includes(requiredRoleName)) return true;
    const group = ROLE_EQUIVALENCE_GROUPS.find((g) => g.includes(requiredRoleName));
    if (!group) return false;
    return group.some((alias) => userRoleNames.includes(alias));
}

export function rolesMeetsAny(userRoleNames, ...requiredRoleNames) {
    if (!requiredRoleNames.length) return false;
    return requiredRoleNames.some((req) => roleMeets(userRoleNames, req));
}
