import { useState } from 'react';
import { Link } from 'react-router';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlert, Mail, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';

const formForgotPasswordSchema = z.object({
    email: z.string().email({ message: 'Email không hợp lệ' }),
});

const ForgotPasswordPage = () => {
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
        getValues,
    } = useForm({
        resolver: zodResolver(formForgotPasswordSchema),
        defaultValues: {
            email: '',
        },
    });

    const onSubmit = async (data) => {
        try {
            const { email } = data
            setIsSubmitting(true);
            const response = await api.post('/auth/forgot-password', { email });

            setIsSubmitted(true);
            toast.success(response.data?.message || 'Email khôi phục mật khẩu đã được gửi!');
        } catch (error) {
            console.error('Error sending reset email:', error);
            const errorMessage = error.response?.data?.message || 'Gửi email thất bại';
            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/10 via-base-200 to-purple-600/10 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Header Card với Gradient */}
                <div className="bg-base-100 rounded-2xl shadow-2xl p-8 md:p-10">
                    {!isSubmitted ? (
                        <>
                            <div className="text-center mb-8">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-purple-600 mb-4">
                                    <Mail className="w-8 h-8 text-white" />
                                </div>
                                <h2 className="text-3xl font-bold text-base-content mb-2">Quên mật khẩu?</h2>
                                <p className="text-base-content/60">
                                    Nhập email của bạn và chúng tôi sẽ gửi link khôi phục mật khẩu
                                </p>
                            </div>

                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                {/* Email Field */}
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
                                            placeholder="Nhập email của bạn"
                                            className={`input input-bordered w-full pl-12 ${errors.email ? 'input-error' : 'focus:input-primary'
                                                }`}
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

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="btn btn-primary w-full gap-2 h-12 text-base"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <span className="loading loading-spinner loading-sm"></span>
                                            <span>Đang gửi...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-5 h-5" />
                                            <span>Gửi email khôi phục</span>
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
                        </>
                    ) : (
                        <div className="text-center space-y-6">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success/20 mb-4">
                                <CheckCircle2 className="w-10 h-10 text-success" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-base-content mb-2">Email đã được gửi!</h2>
                                <p className="text-base-content/70 mb-4">
                                    Chúng tôi đã gửi link khôi phục mật khẩu đến email{' '}
                                    <strong className="text-base-content">{getValues('email')}</strong>
                                </p>
                                <p className="text-sm text-base-content/60">
                                    Vui lòng kiểm tra hộp thư và làm theo hướng dẫn để đặt lại mật khẩu.
                                </p>
                            </div>
                            <div className="space-y-3 pt-4">
                                <Link to="/login" className="btn btn-primary w-full gap-2">
                                    <ArrowLeft className="w-5 h-5" />
                                    <span>Quay lại đăng nhập</span>
                                </Link>
                                <button
                                    onClick={() => setIsSubmitted(false)}
                                    className="btn btn-ghost w-full"
                                >
                                    Gửi lại email
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Help Text */}
                <div className="mt-6 text-center">
                    <p className="text-sm text-base-content/60">
                        Chưa có tài khoản?{' '}
                        <Link to="/register" className="text-primary font-semibold hover:text-primary/80 transition-colors">
                            Đăng ký ngay
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;

