import { UserRoundPlus, Eye, EyeOff } from 'lucide-react';
import { createUser } from '@/services/userService';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Schema validation
const createUserSchema = z.object({
    username: z
        .string()
        .min(1, 'Username không được để trống')
        .min(3, 'Username phải từ 3 đến 30 ký tự')
        .max(30, 'Username phải từ 3 đến 30 ký tự')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username chỉ được chứa chữ cái, số và dấu gạch dưới'),
    password: z
        .string()
        .min(1, 'Mật khẩu không được để trống')
        .min(6, 'Mật khẩu phải từ 6 đến 100 ký tự')
        .max(100, 'Mật khẩu phải từ 6 đến 100 ký tự'),
    email: z
        .string()
        .min(1, 'Email không được để trống')
        .email('Email không hợp lệ'),
    firstName: z
        .string()
        .min(1, 'Họ không được để trống')
        .min(1, 'Họ phải từ 1 đến 50 ký tự')
        .max(50, 'Họ phải từ 1 đến 50 ký tự'),
    lastName: z
        .string()
        .min(1, 'Tên không được để trống')
        .min(1, 'Tên phải từ 1 đến 50 ký tự')
        .max(50, 'Tên phải từ 1 đến 50 ký tự'),
    phoneNumber: z
        .string()
        .optional()
        .refine(
            (val) => !val || val === '' || /^(0|\+84)[1-9][0-9]{8,9}$/.test(val),
            'Số điện thoại phải đúng định dạng Việt Nam (ví dụ: 0912345678 hoặc +84912345678)'
        ),
    address: z
        .string()
        .optional()
        .refine(
            (val) => !val || val === '' || (val.length >= 5 && val.length <= 200),
            'Địa chỉ phải từ 5 đến 200 ký tự'
        ),
    isVerified: z.boolean().default(false),
    status: z.enum(['active', 'inactive', 'banned', 'suspended']).default('active'),
});

const Header = ({ roles, triggerRefresh, title = 'Quản lý người dùng', subtitle = 'Quản lý tài khoản và phân quyền người dùng', showCreateButton = true }) => {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [roleSelected, setRoleSelected] = useState(''); // Mỗi user chỉ 1 vai trò
    const [serverError, setServerError] = useState('');

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
        setError,
    } = useForm({
        resolver: zodResolver(createUserSchema),
        defaultValues: {
            username: '',
            password: '',
            email: '',
            firstName: '',
            lastName: '',
            phoneNumber: '',
            address: '',
            isVerified: true,
            status: 'active',
        },
    });

    // Handle create user
    const onSubmit = async (data) => {
        setServerError('');

        // Bắt buộc admin phải chọn vai trò cho user, không cho để trống
        if (!roleSelected) {
            setServerError('Vui lòng chọn vai trò cho người dùng');
            return;
        }

        try {
            const formData = {
                ...data,
                roles: [roleSelected],
            };

            const res = await createUser(formData);
            if (res.success) {
                setShowCreateModal(false);
                reset();
                setRoleSelected('');
                triggerRefresh();
            }
        } catch (error) {
            // Xử lý lỗi từ server
            if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
                error.response.data.errors.forEach((err) => {
                    // Map field name từ error message
                    let field = '';
                    const lowerErr = err.toLowerCase();

                    if (lowerErr.includes('username')) {
                        field = 'username';
                    } else if (lowerErr.includes('email')) {
                        field = 'email';
                    } else if (lowerErr.includes('mật khẩu') || lowerErr.includes('password')) {
                        field = 'password';
                    } else if (lowerErr.includes('họ') || lowerErr.includes('firstname') || lowerErr.includes('first name')) {
                        field = 'firstName';
                    } else if (lowerErr.includes('tên') || lowerErr.includes('lastname') || lowerErr.includes('last name')) {
                        field = 'lastName';
                    } else if (lowerErr.includes('số điện thoại') || lowerErr.includes('phone')) {
                        field = 'phoneNumber';
                    } else if (lowerErr.includes('địa chỉ') || lowerErr.includes('address')) {
                        field = 'address';
                    }

                    if (field) {
                        setError(field, { type: 'server', message: err });
                    }
                });
            }

            // Xử lý lỗi từ business logic (chỉ có message)
            if (error.response?.data?.message) {
                const message = error.response.data.message;
                const lowerMessage = message.toLowerCase();

                // Map field từ message
                if (lowerMessage.includes('username') || lowerMessage.includes('tài khoản')) {
                    setError('username', { type: 'server', message: message });
                } else if (lowerMessage.includes('email')) {
                    setError('email', { type: 'server', message: message });
                } else if (lowerMessage.includes('mật khẩu') || lowerMessage.includes('password')) {
                    setError('password', { type: 'server', message: message });
                } else {
                    // Nếu không map được field cụ thể, hiển thị ở root
                    setServerError(message);
                }
            } else {
                setServerError(error.response?.data?.message || 'Có lỗi xảy ra khi tạo người dùng');
            }
        }
    };
    return (
        <div className="flex justify-between items-center mb-6">
            <div>
                <h1 className="text-3xl font-bold text-base-content mb-2">{title}</h1>
                <p className="text-base-content/60">{subtitle}</p>
            </div>
            {showCreateButton && (
                <button
                    className="btn btn-primary btn-sm gap-2"
                    onClick={() => {
                        reset();
                        setRoleSelected('');
                        setServerError('');
                        setShowCreateModal(true);
                    }}
                >
                    <UserRoundPlus className="w-5 h-5" />
                    Tạo người dùng
                </button>
            )}

            {/* Create User Modal */}
            {showCreateModal && (
                <dialog className="modal modal-open">
                    <div className="modal-box max-w-2xl">
                        <h3 className="font-bold text-lg mb-4 text-primary">Tạo người dùng mới</h3>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">
                                        <span className="label-text font-semibold">Tên tài khoản <span className='text-error'>*</span></span>
                                    </label>
                                    <input
                                        type="text"
                                        className={`input input-bordered w-full outline-none ${errors.username ? 'input-error' : ''}`}
                                        {...register('username')}
                                    />
                                    {errors.username && (
                                        <label className="label">
                                            <span className="label-text-alt text-error">{errors.username.message}</span>
                                        </label>
                                    )}
                                </div>
                                <div>
                                    <label className="label">
                                        <span className="label-text font-semibold">Mật khẩu<span className='text-error'>*</span></span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            className={`input input-bordered w-full pr-10 outline-none${errors.password ? 'input-error' : ''}`}
                                            {...register('password')}
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-base-content/60 cursor-pointer"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? (
                                                <EyeOff className="w-5 h-5" />
                                            ) : (
                                                <Eye className="w-5 h-5" />
                                            )}
                                        </button>
                                    </div>
                                    {errors.password && (
                                        <label className="label">
                                            <span className="label-text-alt text-error">{errors.password.message}</span>
                                        </label>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">
                                        <span className="label-text font-semibold">Họ <span className='text-error'>*</span></span>
                                    </label>
                                    <input
                                        type="text"
                                        className={`input input-bordered w-full outline-none${errors.firstName ? 'input-error' : ''}`}
                                        {...register('firstName')}
                                    />
                                    {errors.firstName && (
                                        <label className="label">
                                            <span className="label-text-alt text-error">{errors.firstName.message}</span>
                                        </label>
                                    )}
                                </div>
                                <div>
                                    <label className="label">
                                        <span className="label-text font-semibold">Tên <span className='text-error'>*</span></span>
                                    </label>
                                    <input
                                        type="text"
                                        className={`input input-bordered w-full outline-none${errors.lastName ? 'input-error' : ''}`}
                                        {...register('lastName')}
                                    />
                                    {errors.lastName && (
                                        <label className="label">
                                            <span className="label-text-alt text-error">{errors.lastName.message}</span>
                                        </label>
                                    )}
                                </div>
                            </div>
                            <div className='grid grid-cols-2 gap-4'>
                                <div>
                                    <label className="label">
                                        <span className="label-text font-semibold">Email <span className='text-error'>*</span></span>
                                    </label>
                                    <input
                                        type="email"
                                        className={`input input-bordered w-full outline-none${errors.email ? 'input-error' : ''}`}
                                        {...register('email')}
                                    />
                                    {errors.email && (
                                        <label className="label">
                                            <span className="label-text-alt text-error">{errors.email.message}</span>
                                        </label>
                                    )}
                                </div>
                                <div>
                                    <label className="label">
                                        <span className="label-text font-semibold">Số điện thoại</span>
                                    </label>
                                    <input
                                        type="text"
                                        className={`input input-bordered w-full outline-none${errors.phoneNumber ? 'input-error' : ''}`}
                                        {...register('phoneNumber')}
                                    />
                                    {errors.phoneNumber && (
                                        <label className="label">
                                            <span className="label-text-alt text-error">{errors.phoneNumber.message}</span>
                                        </label>
                                    )}
                                </div>

                            </div>
                            <div>
                                <label className="label">
                                    <span className="label-text font-semibold">Địa chỉ</span>
                                </label>
                                <textarea
                                    className={`textarea w-full outline-none ${errors.address ? 'textarea-error' : ''}`}
                                    {...register('address')}
                                />
                                {errors.address && (
                                    <label className="label">
                                        <span className="label-text-alt text-error">{errors.address.message}</span>
                                    </label>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label mb-2">
                                        <span className="label-text font-semibold">Vai trò</span>
                                    </label>
                                    <select
                                        className="select select-bordered w-full"
                                        value={roleSelected}
                                        onChange={(e) => setRoleSelected(e.target.value)}
                                    >
                                        <option value="">-- Chọn vai trò --</option>
                                        {roles.filter((r) => !['admin'].includes(r.name)).map((role) => (
                                            <option key={role._id} value={role.name}>{role.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="label">
                                        <span className="label-text font-semibold">Trạng thái <span className='text-error'>*</span></span>
                                    </label>
                                    <select
                                        className={`select w-full outline-none ${errors.status ? 'select-error' : ''}`}
                                        {...register('status')}
                                    >
                                        <option value="active">Hoạt động</option>
                                        <option value="inactive">Không hoạt động</option>
                                        <option value="banned">Bị cấm</option>
                                        <option value="suspended">Tạm ngưng</option>
                                    </select>
                                    {errors.status && (
                                        <label className="label">
                                            <span className="label-text-alt text-error">{errors.status.message}</span>
                                        </label>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label cursor-pointer">
                                        <span className="label-text font-semibold">Xác thực email</span>
                                        <input
                                            type="checkbox"
                                            className="checkbox checkbox-xs checkbox-success"
                                            {...register('isVerified')}
                                        />
                                    </label>
                                </div>

                            </div>
                            {serverError && (
                                <div className="alert alert-error">
                                    <span>{serverError}</span>
                                </div>
                            )}
                            <div className="modal-action">
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        reset();
                                        setRoleSelected('');
                                        setServerError('');
                                    }}
                                >
                                    Hủy
                                </button>
                                <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <>
                                            <span className="loading loading-spinner loading-sm"></span>
                                            Đang tạo...
                                        </>
                                    ) : (
                                        'Tạo người dùng'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                    <form method="dialog" className="modal-backdrop">
                        <button onClick={() => {
                            reset();
                            setRoleSelected('');
                            setServerError('');
                        }}>close</button>
                    </form>
                </dialog>
            )}
        </div>
    )
}

export default Header
