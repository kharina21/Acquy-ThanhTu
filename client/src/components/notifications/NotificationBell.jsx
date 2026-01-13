import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { getUnreadCount } from '@/services/notificationService';
import { useAuthStore } from '@/stores/useAuthStore';
import NotificationDropdown from './NotificationDropdown';

const NotificationBell = () => {
    const { user } = useAuthStore();
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const fetchUnreadCount = async () => {
        if (!user) return;

        try {
            setLoading(true);
            const data = await getUnreadCount();
            setUnreadCount(data.count || 0);
        } catch (error) {
            console.error('Error fetching unread count:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchUnreadCount();
            // Polling mỗi 30 giây để cập nhật số lượng
            const interval = setInterval(fetchUnreadCount, 30000);
            return () => clearInterval(interval);
        }
    }, [user]);

    if (!user) return null;

    return (
        <div className='relative'>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className='btn btn-ghost btn-circle relative'
                aria-label='Notifications'
            >
                <Bell className='w-5 h-5' />
                {unreadCount > 0 && (
                    <span className='absolute top-0 right-0 badge badge-error badge-sm min-w-5 h-5 flex items-center justify-center'>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <NotificationDropdown
                    onClose={() => setIsOpen(false)}
                    onUpdateCount={fetchUnreadCount}
                />
            )}
        </div>
    );
};

export default NotificationBell;
