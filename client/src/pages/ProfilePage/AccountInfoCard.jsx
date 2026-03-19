import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores/useAuthStore';
import { Calendar, CheckCircle2, Info, KeyRound, MailCheck, Send, Shield, UserRound } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import ChangePasswordModal from './modal/ChangePasswordModal';
import VerifyEmailModal from './modal/VerifyEmailModal';
import { useMailStore } from '@/stores/useMailStore';





const AccountInfoCard = ({ isCustomer }) => {
    const { user } = useAuthStore();
    const { sendVerificationCode, isLoading: isSendingCode } = useMailStore();
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [countdown, setCountdown] = useState(0);



    const handleSendVerificationCode = async () => {
        await sendVerificationCode();
        setShowVerifyModal(true);
        setCountdown(60); // 60 giây countdown
    }

    // Countdown timer
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);
    const cardClass = isCustomer
        ? 'bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8'
        : 'bg-base-100 rounded-lg shadow-lg p-6 md:p-8';

    return (
        <div className={cardClass}>
            <h2 className={`text-lg sm:text-xl font-bold mb-6 flex items-center gap-2 ${isCustomer ? 'text-gray-800' : 'text-primary'}`}>
                <Shield className="w-6 h-6" />
                Thông tin tài khoản
            </h2>
            <div className="space-y-4">
                <div className={`flex items-center justify-between p-4 rounded-xl ${isCustomer ? 'bg-gray-50' : 'bg-base-200 rounded-lg'}`}>
                    <div className="flex items-center gap-3">
                        <UserRound className="w-5 h-5 text-base-content/60" />
                        <div>
                            <p className="text-sm text-base-content/60">Tên đăng nhập</p>
                            <p className="font-semibold break-all">{user.username}</p>
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

                <div className={`flex items-center justify-between p-4 rounded-xl ${isCustomer ? 'bg-gray-50' : 'bg-base-200 rounded-lg'}`}>
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

                {/* Change Password Button */}
                <div className={`pt-4 border-t ${isCustomer ? 'border-gray-100' : 'border-base-300'}`}>
                    <button
                        onClick={() => setShowChangePasswordModal(true)}
                        className="btn btn-primary btn-sm w-full gap-2"
                    >
                        <KeyRound className="w-4 h-4" />
                        Đổi mật khẩu
                    </button>
                </div>
            </div>

            {/* Verify Email Modal */}
            {showVerifyModal && (
                <VerifyEmailModal setShowVerifyModal={setShowVerifyModal} countdown={countdown} setCountdown={setCountdown} />
            )}

            {/* Change Password Modal */}
            {showChangePasswordModal && (
                <ChangePasswordModal setShowChangePasswordModal={setShowChangePasswordModal} />
            )}
        </div>
    )
}

export default AccountInfoCard