import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlert, Eye, EyeOff, Lock, KeyRound, CheckCircle2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';

const formResetPasswordSchema = z
    .object({
        password: z
            .string()
            .min(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
            .max(100, { message: 'Mật khẩu không được vượt quá 100 ký tự' }),
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: 'Mật khẩu xác nhận không khớp',
        path: ['confirmPassword'], // path để hiển thị lỗi
    });

const ResetPasswordPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(formResetPasswordSchema),
        defaultValues: {
            password: '',
            confirmPassword: '',
        },
    });

    useEffect(() => {
        if (!token) {
            toast.error('Token không hợp lệ');
            navigate('/forgot-password', { replace: true });
        }
    }, [token, navigate]);

    const onSubmit = async (data) => {
        try {
            const response = await api.post('/auth/reset-password', {
                token,
                password: data.password,
            });

            setIsSuccess(true);
            toast.success(response.data?.message || 'Đặt lại mật khẩu thành công!');

            // Redirect to login after 3 seconds
            setTimeout(() => {
                navigate('/login', { replace: true });
            }, 3000);
        } catch (error) {
            console.error('Error resetting password:', error);
            const errorMessage = error.response?.data?.message || 'Đặt lại mật khẩu thất bại';
            toast.error(errorMessage);
        }
    };

    if (!token) {
        return null;
    }

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-linear-to-br from-primary/10 via-base-200 to-purple-600/10 flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <div className="bg-base-100 rounded-2xl shadow-2xl p-8 md:p-10 text-center">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success/20 mb-4">
                            <CheckCircle2 className="w-10 h-10 text-success" />
                        </div>
                        <h2 className="text-2xl font-bold text-base-content mb-2">Đặt lại mật khẩu thành công!</h2>
                        <p className="text-base-content/70 mb-6">
                            Mật khẩu của bạn đã được đặt lại thành công. Bạn sẽ được chuyển đến trang đăng nhập...
                        </p>
                        <Link to="/login" className="btn btn-primary w-full gap-2">
                            <ArrowLeft className="w-5 h-5" />
                            <span>Đến trang đăng nhập</span>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-linear-to-br from-primary/10 via-base-200 to-purple-600/10 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-base-100 rounded-2xl shadow-2xl p-8 md:p-10">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-linear-to-br from-primary to-purple-600 mb-4">
                            <KeyRound className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-3xl font-bold text-base-content mb-2">Đặt lại mật khẩu</h2>
                        <p className="text-base-content/60">Nhập mật khẩu mới cho tài khoản của bạn</p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* Password Field */}
                        <div className="space-y-2">
                            <label className="label">
                                <span className="label-text font-semibold">Mật khẩu mới</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-50">
                                    <Lock className="w-5 h-5 text-base-content/40" />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Nhập mật khẩu mới"
                                    className={`input input-bordered w-full pl-12 pr-12 ${errors.password ? 'input-error' : 'focus:input-primary'
                                        }`}
                                    {...register('password')}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
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

                        {/* Confirm Password Field */}
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
                                    placeholder="Nhập lại mật khẩu mới"
                                    className={`input input-bordered w-full pl-12 pr-12 ${errors.confirmPassword ? 'input-error' : 'focus:input-primary'
                                        }`}
                                    {...register('confirmPassword')}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-base-content/40 hover:text-base-content/60 transition-colors z-50"
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

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn btn-primary w-full gap-2 h-12 text-base"
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="loading loading-spinner loading-sm"></span>
                                    <span>Đang xử lý...</span>
                                </>
                            ) : (
                                <>
                                    <KeyRound className="w-5 h-5" />
                                    <span>Đặt lại mật khẩu</span>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Back to Login */}
                    <div className="mt-6 text-center">
                        <Link
                            to="/login"
                            className="text-sm text-primary hover:text-primary/80 transition-colors font-medium flex items-center justify-center gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Quay lại đăng nhập</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;

