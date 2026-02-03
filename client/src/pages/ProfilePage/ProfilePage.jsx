import { useAuthStore } from '@/stores/useAuthStore';
import ProfileInfoCard from './ProfileInfoCard';
import ProfileHeader from './ProfileHeader';
import AccountInfoCard from './AccountInfoCard';
import { useLogStore } from '@/stores/useLogStore';
import ActivityHistoryCard from './ActivityHistoryCard';
import { useEffect } from 'react';

const ProfilePage = () => {
    const { user } = useAuthStore();
    const { fetchActivityLogs } = useLogStore();

    useEffect(() => {
        if (user) {
            fetchActivityLogs(1);
        }
    }, [user, fetchActivityLogs]);

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-base-200 p-4 md:p-8 overflow-y-auto">
            <div className="space-y-6">
                {/* Header Card */}
                <ProfileHeader user={user} />
                <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
                    {/* Account Information Card */}
                    <AccountInfoCard />
                    {/* Profile Information Card */}
                    <ProfileInfoCard />
                </div>
                {/* Activity History Card */}
                <ActivityHistoryCard />
            </div>
        </div>
    );
};

export default ProfilePage;

