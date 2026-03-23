import { useUserRole } from '@/hooks/useUserRole';
import { SIDEBAR_MENU_ITEMS } from '@/config/sidebarMenuConfig';
import AdminSidebarNavItem from './AdminSidebarNavItem';
import AdminSidebarNavDropdown from './AdminSidebarNavDropdown';

const DRAWER_ID = 'my-drawer-4';

export default function AdminSidebar() {
    const { hasAnyRole } = useUserRole();

    const visibleItems = SIDEBAR_MENU_ITEMS.filter((item) => {
        if (item.allowedRoles === null) return true; // null = luôn hiển thị (vd: Tài khoản)
        if (!Array.isArray(item.allowedRoles)) return false; // undefined = ẩn
        return hasAnyRole(...item.allowedRoles);
    });

    return (
        <div className="drawer-side is-drawer-close:overflow-visible">
            <label htmlFor={DRAWER_ID} aria-label="close sidebar" className="drawer-overlay" />
            <div className="flex min-h-full flex-col items-start bg-gradient-to-b from-primary to-secondary is-drawer-close:w-14 is-drawer-open:w-64 transition-all duration-300">
                <ul className="w-full grow text-white space-y-1 px-2 py-4">
                    {visibleItems.map((item) =>
                        item.subItems ? (
                            <AdminSidebarNavDropdown
                                key={item.id}
                                icon={item.icon}
                                label={item.label}
                                ariaLabel={item.ariaLabel}
                                subItems={item.subItems}
                                activePaths={item.activePaths}
                            />
                        ) : (
                            <AdminSidebarNavItem
                                key={item.id}
                                to={item.to}
                                icon={item.icon}
                                label={item.label}
                                ariaLabel={item.ariaLabel}
                                activePaths={item.activePaths}
                            />
                        )
                    )}
                </ul>
            </div>
        </div>
    );
}

export { DRAWER_ID };
