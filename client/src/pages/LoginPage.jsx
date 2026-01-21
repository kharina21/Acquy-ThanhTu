import { useAuthStore } from '@/stores/useAuthStore';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlert, Eye, EyeOff, Lock, UserRound, LogIn, Mail } from 'lucide-react';

const formLoginSchema = z.object({
    username: z
        .string()
        .min(3, { message: 'Tên đăng nhập phải có ít nhất 3 ký tự' })
        .max(20, { message: 'Tên đăng nhập không được vượt quá 20 ký tự' }),
    password: z
        .string()
        .min(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
        .max(32, { message: 'Mật khẩu không được vượt quá 32 ký tự' }),
});

const LoginPage = () => {
    const { login } = useAuthStore();
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        setError,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(formLoginSchema),
        defaultValues: {
            username: '',
            password: '',
        },
    });

    const onSubmit = async (data) => {
        try {
            const { username, password } = data;
            const rs = await login(username, password);
            if (rs.success) {
                await new Promise((resolve) => setTimeout(resolve, 300));
                navigate('/', { replace: true });
            } else {
                setValue('password', '');
                setError('password', { message: rs.message });
            }
        } catch (error) {
            console.error(error);
            setError('root.serverError', { message: 'Đăng nhập thất bại' });
        }
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-primary/10 via-base-200 to-purple-600/10 flex items-center justify-center p-4">
            <div className="w-full max-w-5xl grid md:grid-cols-2 gap-6 items-center">
                {/* Left Side - Branding */}
                <div className="hidden md:flex flex-col items-center justify-center text-center space-y-6 p-8">
                    <div className="w-32 h-32 rounded-2xl bg-linear-to-br from-primary to-purple-600 p-6 shadow-2xl flex items-center justify-center">
                        <img src="/submark-logo.png" alt="logo" className="w-full h-full object-contain" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold text-base-content mb-3">Thanh Tú Store</h1>
                        <p className="text-lg text-base-content/70">
                            Hệ thống quản lý kho hàng thông minh
                        </p>
                    </div>
                    <div className="mt-8 space-y-4 text-left">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                                <Lock className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="font-semibold">Bảo mật cao</p>
                                <p className="text-sm text-base-content/60">Dữ liệu được mã hóa an toàn</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                                <Mail className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="font-semibold">Quản lý dễ dàng</p>
                                <p className="text-sm text-base-content/60">Giao diện trực quan, thân thiện</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Login Form */}
                <div className="w-full">
                    <div className="bg-base-100 rounded-2xl shadow-2xl p-8 md:p-10">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-linear-to-br from-primary to-purple-600 mb-4">
                                <LogIn className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-3xl font-bold text-base-content mb-2">Chào mừng trở lại</h2>
                            <p className="text-base-content/60">Đăng nhập để tiếp tục sử dụng hệ thống</p>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            {/* Username Field */}
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
                                        className={`input input-bordered w-full pl-12 ${errors.username ? 'input-error' : 'focus:input-primary'
                                            }`}
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

                            {/* Password Field */}
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
                                        className={`input input-bordered w-full pl-12 pr-12 ${errors.password ? 'input-error' : 'focus:input-primary'
                                            }`}
                                        {...register('password')}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        tabIndex={-1}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-base-content/40 hover:text-base-content/60 transition-colors z-50"
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

                            {/* Forgot Password */}
                            <div className="flex items-center justify-end">
                                <Link
                                    to="/forgot-password"
                                    className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
                                    tabIndex={-1}
                                >
                                    Quên mật khẩu?
                                </Link>
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
                                        <span>Đang đăng nhập...</span>
                                    </>
                                ) : (
                                    <>
                                        <LogIn className="w-5 h-5" />
                                        <span>Đăng nhập</span>
                                    </>
                                )}
                            </button>

                            {/* Error Message */}
                            {errors.root?.serverError && (
                                <div className="alert alert-error">
                                    <CircleAlert className="w-5 h-5" />
                                    <span>{errors.root.serverError.message}</span>
                                </div>
                            )}
                        </form>

                        {/* Sign Up Link */}
                        <div className="mt-8 text-center pt-6 border-t border-base-300">
                            <p className="text-sm text-base-content/70">
                                <span>Chưa có tài khoản? </span>
                                <Link
                                    to="/register"
                                    className="text-primary font-semibold hover:text-primary/80 transition-colors"
                                >
                                    Đăng ký ngay
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
