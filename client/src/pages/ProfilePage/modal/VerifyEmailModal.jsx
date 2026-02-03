import { useAuthStore } from '@/stores/useAuthStore';
import { useMailStore } from '@/stores/useMailStore';
import { zodResolver } from '@hookform/resolvers/zod';
import { MailCheck, X } from 'lucide-react';
import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form';
import { z } from 'zod';


const verifyCodeSchema = z.object({
    code: z.string().min(6, { message: 'Mã xác thực phải có 6 chữ số' }).max(6, { message: 'Mã xác thực phải có 6 chữ số' }).regex(/^\d{6}$/, { message: 'Mã xác thực chỉ được chứa số' }),
});

const VerifyEmailModal = ({ setShowVerifyModal, countdown, setCountdown }) => {
    const { user } = useAuthStore();
    const { sendVerificationCode, isLoading, verifyEmail } = useMailStore();


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
    const onSubmitVerify = async (data) => {
        try {
            await verifyEmail(data.code);
            setShowVerifyModal(false);
            resetVerify();
        } catch {
            // Error đã được handle trong useMailStore
            // Chỉ cần đóng modal nếu thành công
        }
    };

    // Countdown timer
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);
    return (
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
                            className={`input primary w-full text-center text-2xl tracking-widest font-mono ${verifyErrors.code ? 'input-error' : ''
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
                            disabled={isLoading}
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary flex-1"
                            disabled={isLoading}
                        >
                            {isLoading ? (
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
                            onClick={sendVerificationCode}
                            disabled={isLoading || countdown > 0}
                            className="btn btn-link btn-sm"
                        >
                            {isLoading ? (
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
    )
}

export default VerifyEmailModal