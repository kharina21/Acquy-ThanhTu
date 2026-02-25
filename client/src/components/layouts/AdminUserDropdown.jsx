import { Link, useNavigate } from 'react-router';
import { LogOut, UserRound, UserRoundPen } from 'lucide-react';
import { getInitials, getPrimaryRole } from '@/lib/utils';
import { useAuthStore } from '@/stores/useAuthStore';
import { useBranchStore } from '@/stores/useBranchStore';

export default function AdminUserDropdown() {
    const navigate = useNavigate();
    const { logout, user } = useAuthStore();

    const handleLogout = async () => {
        useBranchStore.getState().reset();
        await logout();
        navigate('/home', { replace: true });
    };

    return (
        <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-sm btn-ghost btn-circle relative">
                {user ? (
                    <div className="avatar relative">
                        <div className="bg-primary text-primary-content rounded-full size-9 flex items-center justify-center text-sm font-semibold">
                            <span>{getInitials(user)}</span>
                        </div>
                        <span className="absolute -bottom-2 -right-2 badge badge-xs badge-secondary h-4 flex items-center justify-center text-[9px] px-1 border-2 border-white">
                            {getPrimaryRole(user)}
                        </span>
                    </div>
                ) : (
                    <UserRound className="size-5 text-primary" />
                )}
            </div>
            <ul
                tabIndex={-1}
                className="dropdown-content menu bg-base-100 rounded-box z-100 w-52 p-2 border border-base-300 shadow-md"
            >
                <li>
                    <Link to="/profile" aria-label="Xem hồ sơ">
                        <UserRoundPen className="size-4" aria-hidden="true" />
                        Hồ sơ
                    </Link>
                </li>
                <li>
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full text-left"
                        aria-label="Đăng xuất"
                    >
                        <LogOut className="size-4" aria-hidden="true" />
                        Đăng xuất
                    </button>
                </li>
            </ul>
        </div>
    );
}
