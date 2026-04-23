/**
 * Một số môi trường lưu role.name tiếng Việt, code thì dùng slug tiếng Anh.
 * Các nhóm dưới đây được coi là tương đương khi kiểm tra quyền.
 */
export const ROLE_EQUIVALENCE_GROUPS = [
    ['seller', 'staff', 'Nhân viên bán hàng'],
    ['manager', 'Quản lý chi nhánh'],
    ['warehouse_manager', 'Quản lý kho'],
];

export function userHasEquivalentRole(userRoleNames, requiredRoleName) {
    if (!requiredRoleName || !Array.isArray(userRoleNames)) return false;
    if (userRoleNames.includes(requiredRoleName)) return true;
    const group = ROLE_EQUIVALENCE_GROUPS.find((g) => g.includes(requiredRoleName));
    if (!group) return false;
    return group.some((alias) => userRoleNames.includes(alias));
}

export function userHasAnyOfRoles(userRoleNames, requiredRoleNames) {
    if (!Array.isArray(requiredRoleNames) || requiredRoleNames.length === 0) return false;
    return requiredRoleNames.some((req) => userHasEquivalentRole(userRoleNames, req));
}

/** true nếu roleName (từ form/API) cùng nhóm với canonical (vd: Quản lý kho ↔ warehouse_manager) */
export function roleNameMatchesCanonical(roleName, canonicalName) {
    if (!roleName || !canonicalName) return false;
    if (roleName === canonicalName) return true;
    const group = ROLE_EQUIVALENCE_GROUPS.find((g) => g.includes(canonicalName));
    if (!group) return false;
    return group.includes(roleName);
}

/** Phần tử đầu mỗi nhóm = slug lưu trong DB (seed). */
export function canonicalRoleName(roleName) {
    if (!roleName) return roleName;
    const group = ROLE_EQUIVALENCE_GROUPS.find((g) => g.includes(roleName));
    return group ? group[0] : roleName;
}
