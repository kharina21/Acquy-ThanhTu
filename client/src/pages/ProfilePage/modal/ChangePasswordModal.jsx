import api from '@/lib/axios';
import { useLogStore } from '@/stores/useLogStore';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, KeyRound, Lock, X } from 'lucide-react';
import React, { useState } from 'react'
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';


const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, { message: 'Mật khẩu hiện tại không được để trống' }),
    newPassword: z.string().min(6, { message: 'Mật khẩu mới phải có ít nhất 6 ký tự' }).max(100, { message: 'Mật khẩu mới không được vượt quá 100 ký tự' }),
    confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
});


const ChangePasswordModal = ({ setShowChangePasswordModal }) => {
    const { fetchActivityLogs } = useLogStore();
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    // Register form change password
    const {
        register: registerChangePassword,
        handleSubmit: handleSubmitChangePassword,
        formState: { errors: changePasswordErrors },
        reset: resetChangePassword,
    } = useForm({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        },
    });


    const onSubmitChangePassword = async (data) => {
        try {
            setIsChangingPassword(true);
            const response = await api.put('/auth/change-password', {
                currentPassword: data.currentPassword,
                newPassword: data.newPassword,
            });
            toast.success('Đổi mật khẩu thành công');
            setShowChangePasswordModal(false);
            resetChangePassword();
            // Refresh activity logs
            fetchActivityLogs(1);
        } catch (error) {
            console.error('Error changing password:', error);
            const errorMessage = error.response?.data?.message || 'Đổi mật khẩu thất bại';
            toast.error(errorMessage);
        } finally {
            setIsChangingPassword(false);
        }

    };
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-base-100 rounded-lg shadow-xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <KeyRound className="w-6 h-6 text-primary" />
                        Đổi mật khẩu
                    </h3>
                    <button
                        onClick={() => {
                            setShowChangePasswordModal(false);
                            resetChangePassword();
                        }}
                        className="btn btn-sm btn-circle btn-ghost"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <p className="text-base-content/70 mb-6">
                    Vui lòng nhập mật khẩu hiện tại và mật khẩu mới để đổi mật khẩu.
                </p>

                <form onSubmit={handleSubmitChangePassword(onSubmitChangePassword)} className="space-y-4">
                    {/* Current Password */}
                    <div className="space-y-2">
                        <label className="label">
                            <span className="label-text font-semibold">Mật khẩu hiện tại</span>
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-50">
                                <Lock className="w-5 h-5 text-base-content/40" />
                            </div>
                            <input
                                type={showCurrentPassword ? 'text' : 'password'}
                                {...registerChangePassword('currentPassword')}
                                className={`input input-bordered w-full pl-12 pr-12 ${changePasswordErrors.currentPassword ? 'input-error' : ''}`}
                                placeholder="Nhập mật khẩu hiện tại"
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                tabIndex={-1}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-base-content/40 hover:text-base-content/60 z-50"
                            >
                                {showCurrentPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                            </button>
                        </div>
                        {changePasswordErrors.currentPassword && (
                            <p className="text-error text-sm">{changePasswordErrors.currentPassword.message}</p>
                        )}
                    </div>

                    {/* New Password */}
                    <div className="space-y-2">
                        <label className="label">
                            <span className="label-text font-semibold">Mật khẩu mới</span>
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-50">
                                <Lock className="w-5 h-5 text-base-content/40" />
                            </div>
                            <input
                                type={showNewPassword ? 'text' : 'password'}
                                {...registerChangePassword('newPassword')}
                                className={`input input-bordered w-full pl-12 pr-12 ${changePasswordErrors.newPassword ? 'input-error' : ''}`}
                                placeholder="Nhập mật khẩu mới"
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                tabIndex={-1}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-base-content/40 hover:text-base-content/60 z-50"
                            >
                                {showNewPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                            </button>
                        </div>
                        {changePasswordErrors.newPassword && (
                            <p className="text-error text-sm">{changePasswordErrors.newPassword.message}</p>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-2">
                        <label className="label">
                            <span className="label-text font-semibold">Xác nhận mật khẩu mới</span>
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-50">
                                <Lock className="w-5 h-5 text-base-content/40" />
                            </div>
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                {...registerChangePassword('confirmPassword')}
                                className={`input input-bordered w-full pl-12 pr-12 ${changePasswordErrors.confirmPassword ? 'input-error' : ''}`}
                                placeholder="Nhập lại mật khẩu mới"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                tabIndex={-1}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-base-content/40 hover:text-base-content/60 z-50"
                            >
                                {showConfirmPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                            </button>
                        </div>
                        {changePasswordErrors.confirmPassword && (
                            <p className="text-error text-sm">{changePasswordErrors.confirmPassword.message}</p>
                        )}
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => {
                                setShowChangePasswordModal(false);
                                resetChangePassword();
                            }}
                            className="btn btn-ghost flex-1"
                            disabled={isChangingPassword}
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary flex-1"
                            disabled={isChangingPassword}
                        >
                            {isChangingPassword ? (
                                <>
                                    <span className="loading loading-spinner loading-sm"></span>
                                    Đang đổi...
                                </>
                            ) : (
                                <>
                                    <KeyRound className="w-4 h-4" />
                                    Đổi mật khẩu
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default ChangePasswordModal