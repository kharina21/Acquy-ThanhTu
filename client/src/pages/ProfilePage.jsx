import { useAuthStore } from '@/stores/useAuthStore';
import { formatDate, formatDateTime, getInitials, getPrimaryRole } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Mail,
    Phone,
    MapPin,
    User,
    Edit2,
    Save,
    X,
    Shield,
    Calendar,
    CheckCircle2,
    MailCheck,
    Send,
    UserRound,
    Info,
    History,
    Clock,
    Activity,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';

const profileSchema = z.object({
    firstName: z.string().min(1, { message: 'Họ không được để trống' }),
    lastName: z.string().min(1, { message: 'Tên không được để trống' }),
    email: z.string().email({ message: 'Email không hợp lệ' }),
    phoneNumber: z.string().optional(),
    address: z.string().optional(),
});

const verifyCodeSchema = z.object({
    code: z.string().min(6, { message: 'Mã xác thực phải có 6 chữ số' }).max(6, { message: 'Mã xác thực phải có 6 chữ số' }).regex(/^\d{6}$/, { message: 'Mã xác thực chỉ được chứa số' }),
});

const ProfilePage = () => {
    const { user, fetchUser } = useAuthStore();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [isSendingCode, setIsSendingCode] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [activityLogs, setActivityLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [logPagination, setLogPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
    });


    // Register form profile
    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            email: user?.email || '',
            phoneNumber: user?.phoneNumber || '',
            address: user?.address || '',
        },
    });


    // Register form verify email
    const {
        register: registerVerify,
        handleSubmit: handleSubmitVerify,
        formState: { errors: verifyErrors },
        reset: resetVerify,
    } = useForm({
        resolver: zodResolver(verifyCodeSchema),
        defaultValues: {
            code: '',
        },
    });

    // Reset form khi user thay đổi
    useEffect(() => {
        if (user) {
            reset({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                email: user.email || '',
                phoneNumber: user.phoneNumber || '',
                address: user.address || '',
            });
        }
    }, [user, reset]);

    // Countdown timer
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    // Fetch activity logs
    const fetchActivityLogs = async (page = 1) => {
        try {
            setLoadingLogs(true);
            const response = await api.get('/activity-logs/me', {
                params: {
                    page,
                    limit: logPagination.limit,
                },
            });
            if (response.data.success) {
                setActivityLogs(response.data.data.logs);
                setLogPagination(response.data.data.pagination);
            }
        } catch (error) {
            console.error('Error fetching activity logs:', error);
        } finally {
            setLoadingLogs(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchActivityLogs(1);
        }
    }, [user]);

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleCancel = () => {
        setIsEditing(false);
        reset({
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            email: user?.email || '',
            phoneNumber: user?.phoneNumber || '',
            address: user?.address || '',
        });
    };

    const onSubmit = async (data) => {
        try {
            setIsSaving(true);
            const oldEmail = user?.email;
            const response = await api.put('/auth/profile', data);
            await fetchUser();

            // Kiểm tra xem email có thay đổi không
            const emailChanged = oldEmail && data.email && oldEmail !== data.email;

            if (emailChanged) {
                toast.success('Cập nhật thông tin thành công. Email đã thay đổi, vui lòng xác thực email mới.', {
                    duration: 5000,
                });
                // Tự động mở modal verify nếu email thay đổi
                setShowVerifyModal(true);
            } else {
                toast.success(response.data?.message || 'Cập nhật thông tin thành công');
            }

            setIsEditing(false);
            // Refresh activity logs
            fetchActivityLogs(1);
        } catch (error) {
            console.error('Error updating profile:', error);
            const errorMessage = error.response?.data?.message || 'Cập nhật thông tin thất bại';
            toast.error(errorMessage);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSendVerificationCode = async () => {
        try {
            setIsSendingCode(true);
            const response = await api.post('/auth/send-verification-email');
            toast.success('Mã xác thực đã được gửi đến email của bạn');
            setShowVerifyModal(true);
            setCountdown(60); // 60 giây countdown
        } catch (error) {
            console.error('Error sending verification code:', error);
            const errorMessage = error.response?.data?.message || 'Gửi mã xác thực thất bại';
            toast.error(errorMessage);
        } finally {
            setIsSendingCode(false);
        }
    };

    const onSubmitVerify = async (data) => {
        try {
            setIsVerifying(true);
            const response = await api.post('/auth/verify-email', { code: data.code });
            await fetchUser();
            toast.success('Xác thực email thành công');
            setShowVerifyModal(false);
            resetVerify();
            // Refresh activity logs
            fetchActivityLogs(1);
        } catch (error) {
            console.error('Error verifying email:', error);
            const errorMessage = error.response?.data?.message || 'Xác thực email thất bại';
            toast.error(errorMessage);
        } finally {
            setIsVerifying(false);
        }
    };

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
                <div className="bg-base-100 rounded-lg shadow-lg overflow-hidden">
                    <div className="bg-linear-to-r from-primary to-purple-600 p-8">
                        <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
                            {/* Avatar */}
                            <div className="relative">
                                <div className="avatar placeholder">
                                    <div className="bg-white text-primary rounded-full w-24 h-24 md:w-32 md:h-32 flex items-center justify-center text-3xl md:text-4xl font-bold shadow-xl border-4 border-white">
                                        <span>{getInitials(user)}</span>
                                    </div>
                                </div>
                                {getPrimaryRole(user) && (
                                    <div className="absolute -bottom-2 -right-2 badge badge-lg badge-secondary border-4 border-white">
                                        {getPrimaryRole(user)}
                                    </div>
                                )}
                            </div>

                            {/* User Info */}
                            <div className="flex-1 text-center md:text-left text-white">
                                <h1 className="text-2xl md:text-4xl font-bold mb-2">
                                    {user.firstName} {user.lastName}
                                </h1>
                                <p className="text-white/80 text-lg mb-1">@{user.username}</p>
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-4">
                                    {user.roles?.map((role, index) => (
                                        <span
                                            key={index}
                                            className="badge badge-outline badge-lg bg-white/20 text-white border-white/50"
                                        >
                                            <Shield className="w-4 h-4 mr-1" />
                                            {role.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
                    {/* Account Information Card */}
                    <div className="bg-base-100 rounded-lg shadow-lg p-6 md:p-8">
                        <h2 className="text-xl md:text-2xl font-bold mb-6 flex items-center gap-2 text-primary">
                            <Shield className="w-6 h-6" />
                            Thông tin tài khoản
                        </h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-base-200 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <UserRound className="w-5 h-5 text-base-content/60" />
                                    <div>
                                        <p className="text-sm text-base-content/60">Tên đăng nhập</p>
                                        <p className="font-semibold">{user.username}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-base-200 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Calendar className="w-5 h-5 text-base-content/60" />
                                    <div>
                                        <p className="text-sm text-base-content/60">Ngày tham gia</p>
                                        <p className="font-semibold">{formatDate(user.createdAt)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-base-200 rounded-lg">
                                <div className="flex items-center gap-3 flex-1">
                                    {user.isVerified ? (<CheckCircle2 className="w-5 h-5 text-success" />) : (<Info className="w-5 h-5 text-warning" />)}

                                    <div className="flex-1">
                                        <p className="text-sm text-base-content/60">Trạng thái xác thực</p>
                                        <p className="font-semibold">
                                            {user.isVerified ? (
                                                <span className="text-success flex items-center gap-2">
                                                    <MailCheck className="w-4 h-4" />
                                                    Đã xác thực
                                                </span>
                                            ) : (
                                                <span className="text-warning">Chưa xác thực</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                {!user.isVerified && (
                                    <button
                                        onClick={handleSendVerificationCode}
                                        disabled={isSendingCode || countdown > 0}
                                        className="btn btn-warning btn-sm gap-2"
                                    >
                                        {isSendingCode ? (
                                            <>
                                                <span className="loading loading-spinner loading-sm"></span>
                                                Đang gửi...
                                            </>
                                        ) : countdown > 0 ? (
                                            `Gửi lại (${countdown}s)`
                                        ) : (
                                            <>
                                                <Send className="w-4 h-4" />
                                                Xác thực email
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    {/* Profile Information Card */}
                    <div className="bg-base-100 rounded-lg shadow-lg p-6 md:p-8 lg:col-span-2">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2 text-primary">
                                <UserRound className="w-6 h-6 text-primary" />
                                Thông tin cá nhân
                            </h2>
                            {!isEditing ? (
                                <button
                                    onClick={handleEdit}
                                    className="btn btn-primary btn-sm gap-2"
                                >
                                    <Edit2 className="w-4 h-4" />
                                    Chỉnh sửa
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleCancel}
                                        className="btn btn-ghost btn-sm gap-2"
                                        disabled={isSaving}
                                    >
                                        <X className="w-4 h-4" />
                                        Hủy
                                    </button>
                                    <button
                                        onClick={handleSubmit(onSubmit)}
                                        className="btn btn-primary btn-sm gap-2"
                                        disabled={isSaving}
                                    >
                                        {isSaving ? (
                                            <>
                                                <span className="loading loading-spinner loading-sm"></span>
                                                Đang lưu...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4" />
                                                Lưu thay đổi
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* First Name */}
                                <div className="space-y-2">
                                    <label className="label">
                                        <span className="label-text font-semibold">Họ</span>
                                    </label>
                                    {isEditing ? (
                                        <>
                                            <input
                                                type="text"
                                                {...register('firstName')}
                                                className={`input input-primary w-full ${errors.firstName ? 'input-error' : ''
                                                    }`}
                                                placeholder="Nhập họ"
                                            />
                                            {errors.firstName && (
                                                <p className="text-error text-sm">{errors.firstName.message}</p>
                                            )}
                                        </>
                                    ) : (
                                        <div className="flex items-center gap-3 p-3 bg-base-200 rounded-lg">
                                            <UserRound className="w-5 h-5 text-base-content/60" />
                                            <span className="text-base-content">
                                                {user.firstName || 'Chưa có thông tin'}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Last Name */}
                                <div className="space-y-2">
                                    <label className="label">
                                        <span className="label-text font-semibold">Tên</span>
                                    </label>
                                    {isEditing ? (
                                        <>
                                            <input
                                                type="text"
                                                {...register('lastName')}
                                                className={`input input-primary w-full ${errors.lastName ? 'input-error' : ''
                                                    }`}
                                                placeholder="Nhập tên"
                                            />
                                            {errors.lastName && (
                                                <p className="text-error text-sm">{errors.lastName.message}</p>
                                            )}
                                        </>
                                    ) : (
                                        <div className="flex items-center gap-3 p-3 bg-base-200 rounded-lg">
                                            <UserRound className="w-5 h-5 text-base-content/60" />
                                            <span className="text-base-content">
                                                {user.lastName || 'Chưa có thông tin'}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Email */}
                                <div className="space-y-2">
                                    <label className="label">
                                        <span className="label-text font-semibold">Email</span>
                                    </label>
                                    {isEditing ? (
                                        <>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-base-content/40 z-40" />
                                                <input
                                                    type="email"
                                                    {...register('email')}
                                                    className={`input input-primary w-full pl-10 ${errors.email ? 'input-error' : ''
                                                        }`}
                                                    placeholder="Nhập email"
                                                />
                                            </div>
                                            {errors.email && (
                                                <p className="text-error text-sm">{errors.email.message}</p>
                                            )}
                                        </>
                                    ) : (
                                        <div className="flex items-center gap-3 p-3 bg-base-200 rounded-lg">
                                            <Mail className="w-5 h-5 text-base-content/60" />
                                            <span className="text-base-content">{user.email}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Phone Number */}
                                <div className="space-y-2">
                                    <label className="label">
                                        <span className="label-text font-semibold">Số điện thoại</span>
                                    </label>
                                    {isEditing ? (
                                        <>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-base-content/40 z-40" />
                                                <input
                                                    type="tel"
                                                    {...register('phoneNumber')}
                                                    className="input input-primary w-full pl-10"
                                                    placeholder="Nhập số điện thoại"
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex items-center gap-3 p-3 bg-base-200 rounded-lg">
                                            <Phone className="w-5 h-5 text-base-content/60" />
                                            <span className="text-base-content">
                                                {user.phoneNumber || 'Chưa có thông tin'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Address */}
                            <div className="space-y-2">
                                <label className="label">
                                    <span className="label-text font-semibold">Địa chỉ</span>
                                </label>
                                {isEditing ? (
                                    <>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-3 w-5 h-5 text-base-content/40 z-40" />
                                            <textarea
                                                {...register('address')}
                                                className="textarea textarea-primary w-full pl-10"
                                                rows="3"
                                                placeholder="Nhập địa chỉ"
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex items-start gap-3 p-3 bg-base-200 rounded-lg">
                                        <MapPin className="w-5 h-5 text-base-content/60 mt-0.5" />
                                        <span className="text-base-content">
                                            {user.address || 'Chưa có thông tin'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </form>
                    </div>


                </div>

                {/* Activity History Card */}
                <div className="bg-base-100 rounded-lg shadow-lg p-6 md:p-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2 text-primary">
                            <History className="w-6 h-6" />
                            Lịch sử hoạt động
                        </h2>
                    </div>

                    {loadingLogs ? (
                        <div className="flex items-center justify-center py-8">
                            <span className="loading loading-spinner loading-lg"></span>
                        </div>
                    ) : activityLogs.length === 0 ? (
                        <div className="text-center py-8 text-base-content/60">
                            <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>Chưa có hoạt động nào</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="table table-zebra w-full">
                                    <thead>
                                        <tr>
                                            <th className="w-[180px]">Thời gian</th>
                                            <th className="w-[120px]">Hành động</th>
                                            <th>Mô tả</th>
                                            <th className="w-[100px]">Resource</th>
                                            <th className="w-[140px]">IP Address</th>
                                            <th className="w-[100px]">Trạng thái</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activityLogs.map((log) => {
                                            const getStatusColor = (status) => {
                                                switch (status) {
                                                    case 'success':
                                                        return 'badge-success';
                                                    case 'failed':
                                                        return 'badge-error';
                                                    case 'error':
                                                        return 'badge-warning';
                                                    default:
                                                        return 'badge-ghost';
                                                }
                                            };



                                            return (
                                                <tr key={log._id} className="hover">
                                                    <td>
                                                        <div className="flex items-center gap-2">
                                                            <Clock className="w-4 h-4 text-base-content/60" />
                                                            <span className="text-sm whitespace-nowrap">
                                                                {formatDateTime(log.createdAt)}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className="badge badge-info badge-sm">
                                                            {log.action}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="max-w-md">
                                                            <p className="text-sm font-medium line-clamp-2">
                                                                {log.description || `${log.action} ${log.resource}`}
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        {log.resource ? (
                                                            <span className="badge badge-primary badge-sm">
                                                                {log.resource}
                                                            </span>
                                                        ) : (
                                                            <span className="text-base-content/40 text-sm">-</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {log.ipAddress ? (
                                                            <div className="flex items-center gap-1">
                                                                <MapPin className="w-3 h-3 text-base-content/60" />
                                                                <span className="text-xs font-mono">
                                                                    {log.ipAddress}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-base-content/40 text-sm">-</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <span className={`badge badge-sm ${getStatusColor(log.status)}`}>
                                                            {log.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {logPagination.totalPages > 1 && (
                                <div className="flex items-center justify-between mt-6 pt-4 border-t border-base-300">
                                    <div className="text-sm text-base-content/60">
                                        Hiển thị {((logPagination.page - 1) * logPagination.limit) + 1} -{' '}
                                        {Math.min(logPagination.page * logPagination.limit, logPagination.total)} trong tổng số{' '}
                                        {logPagination.total} hoạt động
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => fetchActivityLogs(logPagination.page - 1)}
                                            disabled={logPagination.page === 1}
                                            className="btn btn-sm btn-ghost"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                            Trước
                                        </button>
                                        <span className="flex items-center px-4 text-sm">
                                            Trang {logPagination.page} / {logPagination.totalPages}
                                        </span>
                                        <button
                                            onClick={() => fetchActivityLogs(logPagination.page + 1)}
                                            disabled={logPagination.page >= logPagination.totalPages}
                                            className="btn btn-sm btn-ghost"
                                        >
                                            Sau
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Verify Email Modal */}
            {showVerifyModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-base-100 rounded-lg shadow-xl max-w-md w-full p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <MailCheck className="w-6 h-6 text-primary" />
                                Xác thực email
                            </h3>
                            <button
                                onClick={() => {
                                    setShowVerifyModal(false);
                                    resetVerify();
                                }}
                                className="btn btn-sm btn-circle btn-ghost"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <p className="text-base-content/70 mb-6">
                            Chúng tôi đã gửi mã xác thực 6 chữ số đến email <strong>{user.email}</strong>.
                            Vui lòng kiểm tra hộp thư và nhập mã bên dưới.
                        </p>

                        <form onSubmit={handleSubmitVerify(onSubmitVerify)} className="space-y-4">
                            <div className="space-y-2">
                                <label className="label">
                                    <span className="label-text font-semibold">Mã xác thực</span>
                                </label>
                                <input
                                    type="text"
                                    {...registerVerify('code')}
                                    className={`input input-bordered w-full text-center text-2xl tracking-widest font-mono ${verifyErrors.code ? 'input-error' : ''
                                        }`}
                                    placeholder="000000"
                                    maxLength={6}
                                    autoFocus
                                />
                                {verifyErrors.code && (
                                    <p className="text-error text-sm">{verifyErrors.code.message}</p>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowVerifyModal(false);
                                        resetVerify();
                                    }}
                                    className="btn btn-ghost flex-1"
                                    disabled={isVerifying}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary flex-1"
                                    disabled={isVerifying}
                                >
                                    {isVerifying ? (
                                        <>
                                            <span className="loading loading-spinner loading-sm"></span>
                                            Đang xác thực...
                                        </>
                                    ) : (
                                        'Xác thực'
                                    )}
                                </button>
                            </div>

                            <div className="text-center">
                                <button
                                    type="button"
                                    onClick={handleSendVerificationCode}
                                    disabled={isSendingCode || countdown > 0}
                                    className="btn btn-link btn-sm"
                                >
                                    {isSendingCode ? (
                                        'Đang gửi...'
                                    ) : countdown > 0 ? (
                                        `Gửi lại mã sau ${countdown}s`
                                    ) : (
                                        'Gửi lại mã xác thực'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfilePage;

