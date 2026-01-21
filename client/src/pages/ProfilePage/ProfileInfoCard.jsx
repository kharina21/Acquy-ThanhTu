import { useAuthStore } from '@/stores/useAuthStore';
import { zodResolver } from '@hookform/resolvers/zod';
import { Edit2, Mail, MapPin, Phone, Save, UserRound, X } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { z } from 'zod';



const profileSchema = z.object({
    firstName: z.string().min(1, { message: 'Họ không được để trống' }),
    lastName: z.string().min(1, { message: 'Tên không được để trống' }),
    email: z.string().email({ message: 'Email không hợp lệ' }),
    phoneNumber: z.string().optional(),
    address: z.string().optional(),
});

const ProfileInfoCard = () => {
    const { user, updateUser, updatingProfile: isSaving } = useAuthStore();
    const [isEditing, setIsEditing] = useState(false);

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

        await updateUser(data);
        setIsEditing(false);

    };

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
    return (
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
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-base-content/40 z-50" />
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
                                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-base-content/40 z-50" />
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
                                <MapPin className="absolute left-3 top-3 w-5 h-5 text-base-content/40 z-50" />
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
    )
}

export default ProfileInfoCard
