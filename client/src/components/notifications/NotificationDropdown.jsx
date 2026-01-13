import React, { useEffect, useState } from 'react';
import { X, Check, Trash2, ExternalLink } from 'lucide-react';
import {
    getMyNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
} from '@/services/notificationService';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';

const NotificationDropdown = ({ onClose, onUpdateCount }) => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        totalPages: 1,
        totalDocs: 0,
    });
    const navigate = useNavigate();

    const fetchNotifications = async (page = 1) => {
        try {
            setLoading(true);
            const data = await getMyNotifications({
                page,
                limit: pagination.limit,
            });
            setNotifications(data.docs || []);
            setPagination({
                page: data.page || 1,
                limit: data.limit || 10,
                totalPages: data.totalPages || 1,
                totalDocs: data.totalDocs || 0,
            });
        } catch (error) {
            toast.error('Lỗi khi tải thông báo');
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const handleMarkAsRead = async (notificationId) => {
        try {
            await markAsRead(notificationId);
            setNotifications((prev) =>
                prev.map((notif) =>
                    notif._id === notificationId ? { ...notif, isRead: true } : notif
                )
            );
            onUpdateCount?.();
        } catch (error) {
            toast.error('Lỗi khi đánh dấu đã đọc');
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await markAllAsRead();
            setNotifications((prev) => prev.map((notif) => ({ ...notif, isRead: true })));
            toast.success('Đã đánh dấu tất cả là đã đọc');
            onUpdateCount?.();
        } catch (error) {
            toast.error('Lỗi khi đánh dấu tất cả đã đọc');
        }
    };

    const handleDelete = async (notificationId) => {
        try {
            await deleteNotification(notificationId);
            setNotifications((prev) => prev.filter((notif) => notif._id !== notificationId));
            toast.success('Đã xóa thông báo');
            onUpdateCount?.();
        } catch (error) {
            toast.error('Lỗi khi xóa thông báo');
        }
    };

    const handleDeleteAllRead = async () => {
        try {
            await deleteAllRead();
            setNotifications((prev) => prev.filter((notif) => !notif.isRead));
            toast.success('Đã xóa tất cả thông báo đã đọc');
            onUpdateCount?.();
        } catch (error) {
            toast.error('Lỗi khi xóa thông báo đã đọc');
        }
    };

    const handleNotificationClick = async (notification) => {
        if (!notification.isRead) {
            await handleMarkAsRead(notification._id);
        }

        if (notification.actionUrl) {
            navigate(notification.actionUrl);
            onClose();
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'product':
                return 'badge-primary';
            case 'order':
                return 'badge-secondary';
            case 'user':
                return 'badge-info';
            case 'warning':
                return 'badge-warning';
            case 'error':
                return 'badge-error';
            default:
                return 'badge-neutral';
        }
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Vừa xong';
        if (minutes < 60) return `${minutes} phút trước`;
        if (hours < 24) return `${hours} giờ trước`;
        if (days < 7) return `${days} ngày trước`;
        return date.toLocaleDateString('vi-VN');
    };

    const unreadCount = notifications.filter((n) => !n.isRead).length;
    const readCount = notifications.filter((n) => n.isRead).length;

    return (
        <div className='absolute right-0 top-12 z-50 w-96 bg-base-100 border border-base-300 rounded-lg shadow-lg'>
            {/* Header */}
            <div className='flex items-center justify-between p-4 border-b border-base-300'>
                <h3 className='font-semibold text-base-content'>Thông báo</h3>
                <div className='flex items-center gap-2'>
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllAsRead}
                            className='btn btn-sm btn-ghost'
                            title='Đánh dấu tất cả đã đọc'
                        >
                            <Check className='w-4 h-4' />
                        </button>
                    )}
                    {readCount > 0 && (
                        <button
                            onClick={handleDeleteAllRead}
                            className='btn btn-sm btn-ghost'
                            title='Xóa tất cả đã đọc'
                        >
                            <Trash2 className='w-4 h-4' />
                        </button>
                    )}
                    <button onClick={onClose} className='btn btn-sm btn-ghost btn-circle'>
                        <X className='w-4 h-4' />
                    </button>
                </div>
            </div>

            {/* Notifications List */}
            <div className='max-h-96 overflow-y-auto'>
                {loading ? (
                    <div className='flex justify-center items-center p-8'>
                        <span className='loading loading-spinner loading-md'></span>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className='p-8 text-center text-base-content/70'>
                        <p>Không có thông báo nào</p>
                    </div>
                ) : (
                    <div className='divide-y divide-base-300'>
                        {notifications.map((notification) => (
                            <div
                                key={notification._id}
                                className={`p-4 hover:bg-base-200 cursor-pointer transition-colors ${
                                    !notification.isRead ? 'bg-base-200/50' : ''
                                }`}
                                onClick={() => handleNotificationClick(notification)}
                            >
                                <div className='flex items-start gap-3'>
                                    <div
                                        className={`badge badge-sm ${getTypeColor(
                                            notification.type
                                        )}`}
                                    >
                                        {notification.type}
                                    </div>
                                    <div className='flex-1 min-w-0'>
                                        <div className='flex items-start justify-between gap-2'>
                                            <h4
                                                className={`font-medium text-sm ${
                                                    !notification.isRead
                                                        ? 'text-base-content font-semibold'
                                                        : 'text-base-content/80'
                                                }`}
                                            >
                                                {notification.title}
                                            </h4>
                                            {!notification.isRead && (
                                                <span className='badge badge-primary badge-xs'></span>
                                            )}
                                        </div>
                                        <p className='text-xs text-base-content/70 mt-1 line-clamp-2'>
                                            {notification.message}
                                        </p>
                                        <div className='flex items-center justify-between mt-2'>
                                            <span className='text-xs text-base-content/50'>
                                                {formatTime(notification.createdAt)}
                                            </span>
                                            {notification.actionUrl && (
                                                <ExternalLink className='w-3 h-3 text-base-content/50' />
                                            )}
                                        </div>
                                    </div>
                                    <div className='flex flex-col gap-1'>
                                        {!notification.isRead && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleMarkAsRead(notification._id);
                                                }}
                                                className='btn btn-xs btn-ghost'
                                                title='Đánh dấu đã đọc'
                                            >
                                                <Check className='w-3 h-3' />
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(notification._id);
                                            }}
                                            className='btn btn-xs btn-ghost text-error'
                                            title='Xóa'
                                        >
                                            <Trash2 className='w-3 h-3' />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            {pagination.totalPages > 1 && (
                <div className='p-4 border-t border-base-300 flex justify-center'>
                    <div className='join'>
                        <button
                            className='join-item btn btn-sm'
                            onClick={() => fetchNotifications(pagination.page - 1)}
                            disabled={pagination.page === 1}
                        >
                            «
                        </button>
                        <button className='join-item btn btn-sm'>
                            Trang {pagination.page} / {pagination.totalPages}
                        </button>
                        <button
                            className='join-item btn btn-sm'
                            onClick={() => fetchNotifications(pagination.page + 1)}
                            disabled={pagination.page === pagination.totalPages}
                        >
                            »
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationDropdown;
