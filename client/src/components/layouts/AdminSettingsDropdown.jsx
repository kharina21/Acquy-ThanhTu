import { Link } from 'react-router';
import { Building2, Settings } from 'lucide-react';

export default function AdminSettingsDropdown() {
    return (
        <div className="dropdown dropdown-end">
            <div
                tabIndex={0}
                role="button"
                className="btn btn-sm btn-ghost btn-circle"
                aria-label="Cài đặt"
            >
                <Settings className="size-5 text-primary" />
            </div>
            <ul
                tabIndex={-1}
                className="dropdown-content menu bg-base-100 rounded-box z-[100] w-52 p-2 border border-base-300 shadow-md"
            >
                <li>
                    <Link to="/admin/store-profile" aria-label="Hồ sơ cửa hàng">
                        <Building2 className="size-4" aria-hidden />
                        Hồ sơ cửa hàng
                    </Link>
                </li>
            </ul>
        </div>
    );
}
