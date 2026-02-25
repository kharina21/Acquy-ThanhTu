import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { useBranchStore } from '@/stores/useBranchStore';
import { useUserRole } from '@/hooks/useUserRole';
import CreateBranchFirstPage from '@/pages/CreateBranchFirstPage';
import AdminNavbar from './AdminNavbar';
import AdminSidebar, { DRAWER_ID } from './AdminSidebar';

export default function AdminLayout({ children }) {
    const pathname = useLocation().pathname;
    const { hasAnyRole } = useUserRole();
    const { locations, fetchLocations } = useBranchStore();
    const user = useAuthStore((s) => s.user);

    const needsBranch = hasAnyRole('admin', 'manager', 'warehouse_manager');
    const showCreateBranchFirst =
        needsBranch && locations.length === 0 && pathname !== '/admin/store-profile';

    useEffect(() => {
        if (user && needsBranch) {
            fetchLocations();
        }
    }, [user, needsBranch, fetchLocations]);

    return (
        <div className="drawer lg:drawer-open h-screen overflow-hidden">
            <input id={DRAWER_ID} type="checkbox" className="drawer-toggle" defaultChecked />
            <div className="drawer-content h-screen overflow-hidden flex flex-col">
                <AdminNavbar />
                {showCreateBranchFirst ? <CreateBranchFirstPage /> : children}
            </div>
            <AdminSidebar />
        </div>
    );
}
