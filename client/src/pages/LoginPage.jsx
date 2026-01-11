import { useAuthStore } from '@/stores/useAuthStore';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';

//
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlert, Eye, EyeOff, Lock, UserRound } from 'lucide-react';

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
        <div className='min-h-screen flex  justify-center  px-4 py-8 bg-base-300'>
            <div className='w-full max-w-md mt-[100px]'>
                {/* Logo và Title */}
                <div className='text-center mb-8'>
                    <div className='inline-flex items-center justify-center w-16 h-16 rounded-lg bg-base-content/10 mb-4'>
                        <img src='/submark-logo.png' alt='logo' className='w-10' />
                    </div>
                    <h1 className='text-3xl font-bold text-base-content mb-2'>Chào mừng trở lại</h1>
                    <p className='opacity-60'>Đăng nhập vào tài khoản của bạn</p>
                </div>

                {/* Form Card */}
                <div className='bg-base-100 rounded-sm shadow-xl border border-base-300/50 p-8 backdrop-blur-sm'>
                    <form onSubmit={handleSubmit(onSubmit)} className='space-y-5'>
                        {/* Username Field */}
                        <div className='space-y-2'>
                            <div className='relative'>
                                <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                                    <UserRound className='w-5 h-5 text-base-content/40' />
                                </div>
                                <input
                                    id='username'
                                    type='text'
                                    placeholder='Nhập tên đăng nhập'
                                    className={`w-full pl-12 pr-4 py-3 border border-base-content/20 rounded-sm bg-base-200/50 focus:bg-base-100 transition-all duration-200 outline-none focus:ring-2 focus:ring-base-content/50 ${
                                        errors.username
                                            ? 'border-error focus:border-error '
                                            : 'border-base-300 focus:border-primary'
                                    }`}
                                    {...register('username')}
                                />
                            </div>
                            {errors.username && (
                                <p className='text-error text-sm flex items-center gap-1'>
                                    <CircleAlert className='w-4 h-4' />
                                    {errors.username.message}
                                </p>
                            )}
                        </div>

                        {/* Password Field */}
                        <div className='space-y-2'>
                            <div className='relative'>
                                <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                                    <Lock className='w-5 h-5 text-base-content/40' />
                                </div>
                                <input
                                    id='password'
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder='Nhập mật khẩu'
                                    className={`w-full pl-12 pr-12 py-3 border border-base-content/20 rounded-sm bg-base-200/50 focus:bg-base-100 transition-all duration-200 outline-none focus:ring-2 focus:ring-base-content/50 ${
                                        errors.password
                                            ? 'border-error focus:border-error'
                                            : 'border-base-300 focus:border-primary'
                                    }`}
                                    {...register('password')}
                                />
                                <button
                                    type='button'
                                    onClick={() => setShowPassword(!showPassword)}
                                    className='absolute inset-y-0 right-0 pr-4 flex items-center text-base-content/40 hover:text-base-content/60 transition-colors cursor-pointer'
                                >
                                    {showPassword ? (
                                        <Eye className='w-5 h-5 text-base-content/40' />
                                    ) : (
                                        <EyeOff className='w-5 h-5 text-base-content/40' />
                                    )}
                                </button>
                            </div>
                            {errors.password && (
                                <p className='text-error text-sm flex items-center gap-1'>
                                    <CircleAlert className='w-4 h-4' />
                                    {errors.password.message}
                                </p>
                            )}
                        </div>

                        {/* Forgot Password */}
                        <div className='flex items-center justify-end'>
                            <Link
                                to='/forgot-password'
                                className='text-sm text-base-content hover:text-base-content/70 transition-all duration-200 font-medium'
                            >
                                Quên mật khẩu?
                            </Link>
                        </div>

                        {/* Submit Button */}
                        <button
                            type='submit'
                            disabled={isSubmitting}
                            className='btn btn-neutral w-full'
                        >
                            {isSubmitting ? (
                                <>
                                    <span className='loading loading-spinner loading-sm'></span>
                                    <span>Đang đăng nhập...</span>
                                </>
                            ) : (
                                'Đăng nhập'
                            )}
                        </button>

                        {/* Error Message */}
                        {errors.root?.serverError && (
                            <div className='p-3 rounded-xl bg-error/10 border border-error/20 text-error text-sm flex items-center gap-2'>
                                <CircleAlert className='w-4 h-4' />
                                {errors.root.serverError.message}
                            </div>
                        )}
                    </form>

                    {/* Sign Up Link */}
                    <div className='mt-6 text-center pt-6 border-t border-base-300'>
                        <p className='text-sm '>
                            <span className='opacity-60'>Chưa có tài khoản? </span>
                            <Link
                                to='/register'
                                className='text-base-content font-semibold hover:text-base-content/70 transition-all duration-200'
                            >
                                Đăng ký ngay
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
