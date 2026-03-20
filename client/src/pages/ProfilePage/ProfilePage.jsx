import { useAuthStore } from '@/stores/useAuthStore';
import ProfileInfoCard from './ProfileInfoCard';
import ProfileHeader from './ProfileHeader';
import AccountInfoCard from './AccountInfoCard';
import { useLogStore } from '@/stores/useLogStore';
import ActivityHistoryCard from './ActivityHistoryCard';
import { useEffect } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { toast } from 'sonner';

const ProfilePage = () => {
    const { user, logout } = useAuthStore();
    const { fetchActivityLogs } = useLogStore();
    const { isAdmin, isManager, isSeller, isStaff, isWarehouseManager } = useUserRole();
    const isInternalUser = isAdmin || isManager || isSeller || isStaff || isWarehouseManager;

    useEffect(() => {
        if (user && isInternalUser) {
            fetchActivityLogs(1);
        }
    }, [user, isInternalUser, fetchActivityLogs]);

    const handleLogout = async () => {
        try {
            await logout();
            toast.success('Đã đăng xuất thành công !');
        } catch (error) {
            toast.error('Lỗi khi đăng xuất !');
        }
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    // Layout cho khách hàng (web) - Header, Footer, nội dung Hồ sơ cá nhân
    if (!isInternalUser) {
        return (
            <div className="min-h-screen bg-white flex flex-col">
                <Header user={user} onLogout={handleLogout} />

                <main className="flex-1 container mx-auto px-4 py-8 min-w-0">
                    <div className="max-w-4xl mx-auto w-full min-w-0">
                        <h1 className="text-2xl font-bold text-gray-800 mb-6">Hồ sơ cá nhân</h1>

                        <div className="space-y-6">
                            <ProfileHeader user={user} isCustomer />
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <AccountInfoCard isCustomer />
                                <div className="lg:col-span-2">
                                    <ProfileInfoCard isCustomer />
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                <Footer />
            </div>
        );
    }

    // Layout cho nội bộ (admin/staff) - dùng AdminLayout
    return (
        <div className="flex-1 bg-base-200 p-4 md:p-8 overflow-y-auto">
            <div className="space-y-6">
                <ProfileHeader user={user} />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <AccountInfoCard />
                    <ProfileInfoCard />
                </div>
                <ActivityHistoryCard />
            </div>
        </div>
    );
};

export default ProfilePage;
