import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlert, Eye, EyeOff, Lock, UserRound, Mail, UserPlus, Phone, MapPin, User, UserRoundPlus } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';

const formRegisterSchema = z.object({
    username: z
        .string()
        .min(3, { message: 'Tên đăng nhập phải có ít nhất 3 ký tự' })
        .max(30, { message: 'Tên đăng nhập không được vượt quá 30 ký tự' })
        .regex(/^[a-zA-Z0-9_]+$/, { message: 'Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới' }),
    password: z
        .string()
        .min(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
        .max(100, { message: 'Mật khẩu không được vượt quá 100 ký tự' }),
    confirmPassword: z.string(),
    email: z.string().email({ message: 'Email không hợp lệ' }),
    firstName: z.string().min(1, { message: 'Họ không được để trống' }).max(50, { message: 'Họ không được vượt quá 50 ký tự' }),
    lastName: z.string().min(1, { message: 'Tên không được để trống' }).max(50, { message: 'Tên không được vượt quá 50 ký tự' }),
    phoneNumber: z
        .string()
        .optional()
        .refine(
            (val) => !val || /^(0|\+84)[1-9][0-9]{8,9}$/.test(val),
            { message: 'Số điện thoại phải đúng định dạng Việt Nam (ví dụ: 0912345678 hoặc +84912345678)' }
        ),
    address: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
});

const RegisterPage = () => {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        setError,
    } = useForm({
        resolver: zodResolver(formRegisterSchema),
        defaultValues: {
            username: '',
            password: '',
            confirmPassword: '',
            email: '',
            firstName: '',
            lastName: '',
            phoneNumber: '',
            address: '',
        },
    });

    const onSubmit = async (data) => {
        try {
            const { confirmPassword, ...registerData } = data;
            const response = await api.post('/auth/register-user', registerData);

            if (response.data) {
                toast.success('Đăng ký thành công! Vui lòng đăng nhập.');
                navigate('/login', { replace: true });
            }
        } catch (error) {
            console.error('Error registering:', error);
            const errorResponse = error.response?.data;
            const statusCode = error.response?.status;

            if (errorResponse?.errors && Array.isArray(errorResponse.errors)) {

                errorResponse.errors.forEach((err) => {
                    if (typeof err === 'object' && (err.path || err.param)) {
                        const field = err.path || err.param;
                        setError(field, {
                            type: 'server',
                            message: err.msg || err.message || err,
                        });
                    }
                });
                return;
            }

            const errorMessage = errorResponse?.message || 'Đăng ký thất bại';

            const lowerMessage = errorMessage.toLowerCase();

            if (lowerMessage.includes('username') || lowerMessage.includes('tên đăng nhập')) {
                setError('username', {
                    type: 'server',
                    message: errorMessage,
                });
            } else if (lowerMessage.includes('email')) {
                setError('email', {
                    type: 'server',
                    message: errorMessage,
                });
            } else if (lowerMessage.includes('mật khẩu') || lowerMessage.includes('password')) {
                setError('password', {
                    type: 'server',
                    message: errorMessage,
                });
            } else if (lowerMessage.includes('họ') || lowerMessage.includes('firstname') || lowerMessage.includes('first name')) {
                setError('firstName', {
                    type: 'server',
                    message: errorMessage,
                });
            } else if (lowerMessage.includes('tên') && !lowerMessage.includes('đăng nhập')) {
                setError('lastName', {
                    type: 'server',
                    message: errorMessage,
                });
            } else if (lowerMessage.includes('số điện thoại') || lowerMessage.includes('phone')) {
                setError('phoneNumber', {
                    type: 'server',
                    message: errorMessage,
                });
            } else if (lowerMessage.includes('địa chỉ') || lowerMessage.includes('address')) {
                setError('address', {
                    type: 'server',
                    message: errorMessage,
                });
            } else {
                setError('root', {
                    type: 'server',
                    message: errorMessage,
                });
            }
        }
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-primary/10 via-base-200 to-purple-600/10 flex items-center justify-center p-4 py-8">
            <div className="w-full max-w-6xl grid md:grid-cols-2 gap-6 items-start">
                {/* Left Side - Branding */}
                <div className="hidden md:flex flex-col items-center justify-center text-center space-y-6 p-8">
                    <div className="w-32 h-32 rounded-2xl bg-linear-to-br from-primary to-purple-600 p-6 shadow-2xl flex items-center justify-center">
                        <img src="/submark-logo.png" alt="logo" className="w-full h-full object-contain" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold text-base-content mb-3">Tạo tài khoản mới</h1>
                        <p className="text-lg text-base-content/70">
                            Tham gia cùng chúng tôi ngay hôm nay
                        </p>
                    </div>
                    <div className="mt-8 space-y-4 text-left">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                                <UserPlus className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="font-semibold">Đăng ký miễn phí</p>
                                <p className="text-sm text-base-content/60">Không mất phí, không ràng buộc</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                                <Mail className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="font-semibold">Xác thực email</p>
                                <p className="text-sm text-base-content/60">Bảo vệ tài khoản của bạn</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Register Form */}
                <div className="w-full">
                    <div className="bg-base-100 rounded-2xl shadow-2xl p-6 md:p-8 lg:p-10">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-linear-to-br from-primary to-purple-600 mb-4">
                                <UserRoundPlus className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-3xl font-bold text-base-content mb-2">Đăng ký tài khoản</h2>
                            <p className="text-base-content/60">Điền thông tin để tạo tài khoản mới</p>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 md:space-y-5">
                            {/* Hiển thị lỗi root (lỗi chung không map được vào field) */}
                            {errors.root && (
                                <div className="alert alert-error">
                                    <CircleAlert className="w-5 h-5" />
                                    <span>{errors.root.message}</span>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* First Name */}
                                <div className="space-y-2">
                                    <label className="label">
                                        <span className="label-text font-semibold">Họ</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-50">
                                            <UserRound className="w-5 h-5 text-base-content/40" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Nhập họ"
                                            className={`input input-bordered w-full pl-12 ${errors.firstName ? 'input-error' : 'focus:input-primary'}`}
                                            {...register('firstName')}
                                        />
                                    </div>
                                    {errors.firstName && (
                                        <div className="flex items-center gap-2 text-error text-sm">
                                            <CircleAlert className="w-4 h-4" />
                                            <span>{errors.firstName.message}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Last Name */}
                                <div className="space-y-2">
                                    <label className="label">
                                        <span className="label-text font-semibold">Tên</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-50">
                                            <UserRound className="w-5 h-5 text-base-content/40" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Nhập tên"
                                            className={`input input-bordered w-full pl-12 ${errors.lastName ? 'input-error' : 'focus:input-primary'}`}
                                            {...register('lastName')}
                                        />
                                    </div>
                                    {errors.lastName && (
                                        <div className="flex items-center gap-2 text-error text-sm">
                                            <CircleAlert className="w-4 h-4" />
                                            <span>{errors.lastName.message}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Username */}
                            <div className="space-y-2">
                                <label className="label">
                                    <span className="label-text font-semibold">Tên đăng nhập</span>
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-50">
                                        <UserRound className="w-5 h-5 text-base-content/40" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Nhập tên đăng nhập"
                                        className={`input input-bordered w-full pl-12 ${errors.username ? 'input-error' : 'focus:input-primary'}`}
                                        {...register('username')}
                                    />
                                </div>
                                {errors.username && (
                                    <div className="flex items-center gap-2 text-error text-sm">
                                        <CircleAlert className="w-4 h-4" />
                                        <span>{errors.username.message}</span>
                                    </div>
                                )}
                            </div>

                            {/* Email */}
                            <div className="space-y-2">
                                <label className="label">
                                    <span className="label-text font-semibold">Email</span>
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-50">
                                        <Mail className="w-5 h-5 text-base-content/40" />
                                    </div>
                                    <input
                                        type="email"
                                        placeholder="Nhập email"
                                        className={`input input-bordered w-full pl-12 ${errors.email ? 'input-error' : 'focus:input-primary'}`}
                                        {...register('email')}
                                    />
                                </div>
                                {errors.email && (
                                    <div className="flex items-center gap-2 text-error text-sm">
                                        <CircleAlert className="w-4 h-4" />
                                        <span>{errors.email.message}</span>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Password */}
                                <div className="space-y-2">
                                    <label className="label">
                                        <span className="label-text font-semibold">Mật khẩu</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-50">
                                            <Lock className="w-5 h-5 text-base-content/40" />
                                        </div>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Nhập mật khẩu"
                                            className={`input input-bordered w-full pl-12 pr-12 ${errors.password ? 'input-error' : 'focus:input-primary'}`}
                                            {...register('password')}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            tabIndex={-1}
                                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-base-content/40 hover:text-base-content/60 z-50"
                                        >
                                            {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    {errors.password && (
                                        <div className="flex items-center gap-2 text-error text-sm">
                                            <CircleAlert className="w-4 h-4" />
                                            <span>{errors.password.message}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Confirm Password */}
                                <div className="space-y-2">
                                    <label className="label">
                                        <span className="label-text font-semibold">Xác nhận mật khẩu</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-50">
                                            <Lock className="w-5 h-5 text-base-content/40" />
                                        </div>
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            placeholder="Nhập lại mật khẩu"
                                            className={`input input-bordered w-full pl-12 pr-12 ${errors.confirmPassword ? 'input-error' : 'focus:input-primary'}`}
                                            {...register('confirmPassword')}
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
                                    {errors.confirmPassword && (
                                        <div className="flex items-center gap-2 text-error text-sm">
                                            <CircleAlert className="w-4 h-4" />
                                            <span>{errors.confirmPassword.message}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Phone Number */}
                            <div className="space-y-2">
                                <label className="label">
                                    <span className="label-text font-semibold">Số điện thoại (tùy chọn)</span>
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-50">
                                        <Phone className="w-5 h-5 text-base-content/40" />
                                    </div>
                                    <input
                                        type="tel"
                                        placeholder="0912345678"
                                        className={`input input-bordered w-full pl-12 ${errors.phoneNumber ? 'input-error' : 'focus:input-primary'}`}
                                        {...register('phoneNumber')}
                                    />
                                </div>
                                {errors.phoneNumber && (
                                    <div className="flex items-center gap-2 text-error text-sm">
                                        <CircleAlert className="w-4 h-4" />
                                        <span>{errors.phoneNumber.message}</span>
                                    </div>
                                )}
                            </div>

                            {/* Address */}
                            <div className="space-y-2">
                                <label className="label">
                                    <span className="label-text font-semibold">Địa chỉ (tùy chọn)</span>
                                </label>
                                <div className="relative">
                                    <div className="absolute top-3 left-4 pointer-events-none z-50">
                                        <MapPin className="w-5 h-5 text-base-content/40" />
                                    </div>
                                    <textarea
                                        placeholder="Nhập địa chỉ"
                                        rows="3"
                                        className={`textarea textarea-bordered w-full pl-12 ${errors.address ? 'textarea-error' : 'focus:textarea-primary'}`}
                                        {...register('address')}
                                    />
                                </div>
                                {errors.address && (
                                    <div className="flex items-center gap-2 text-error text-sm">
                                        <CircleAlert className="w-4 h-4" />
                                        <span>{errors.address.message}</span>
                                    </div>
                                )}
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="btn btn-primary w-full gap-2 h-12 text-base"
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="loading loading-spinner loading-sm"></span>
                                        <span>Đang đăng ký...</span>
                                    </>
                                ) : (
                                    <>
                                        <UserRoundPlus className="w-5 h-5" />
                                        <span>Đăng ký</span>
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Login Link */}
                        <div className="mt-6 pt-6 border-t border-base-300 text-center">
                            <p className="text-sm text-base-content/70">
                                <span>Đã có tài khoản? </span>
                                <Link
                                    to="/login"
                                    className="text-primary font-semibold hover:text-primary/80 transition-colors"
                                >
                                    Đăng nhập ngay
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
