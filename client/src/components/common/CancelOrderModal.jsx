import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

/**
 * CancelOrderModal - Modal hủy đơn hàng.
 * Khi đơn đã thanh toán: hiển thị form nhập thông tin chuyển khoản để hoàn tiền.
 */
const CancelOrderModal = ({
    isOpen,
    onClose,
    onConfirm,
    order,
    isLoading = false,
}) => {
    const [refundData, setRefundData] = useState({
        refundBankName: '',
        refundBankAccount: '',
        refundAccountHolder: '',
    });

    const isPaid = order?.paymentStatus === 'paid';
    const needsRefundInfo = isPaid;

    const handleConfirm = () => {
        if (needsRefundInfo) {
            const { refundBankName, refundBankAccount, refundAccountHolder } = refundData;
            if (!refundBankName?.trim() || !refundBankAccount?.trim() || !refundAccountHolder?.trim()) {
                return;
            }
            onConfirm?.({ refundBankName: refundBankName.trim(), refundBankAccount: refundBankAccount.trim(), refundAccountHolder: refundAccountHolder.trim() });
        } else {
            onConfirm?.();
        }
    };

    const handleCancel = () => {
        setRefundData({ refundBankName: '', refundBankAccount: '', refundAccountHolder: '' });
        onClose();
    };

    const canConfirm = !needsRefundInfo || (
        refundData.refundBankName?.trim() &&
        refundData.refundBankAccount?.trim() &&
        refundData.refundAccountHolder?.trim()
    );

    React.useEffect(() => {
        if (!isOpen) {
            setRefundData({ refundBankName: '', refundBankAccount: '', refundAccountHolder: '' });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <dialog className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="cancel-modal-title">
            <div className="modal-box max-w-md">
                <div className="flex items-start gap-4">
                    <div className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-error text-error-content">
                        <AlertTriangle className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 id="cancel-modal-title" className="font-bold text-lg mb-2">
                            Hủy đơn hàng
                        </h3>
                        {needsRefundInfo ? (
                            <>
                                <p className="text-base-content/70 mb-4">
                                    Đơn hàng đã thanh toán. Vui lòng nhập thông tin tài khoản ngân hàng để cửa hàng hoàn tiền cho bạn.
                                </p>
                                <div className="space-y-3 mb-4">
                                    <div>
                                        <label className="label py-0 text-xs">Tên ngân hàng</label>
                                        <input
                                            type="text"
                                            className="input input-bordered input-sm w-full"
                                            placeholder="Ngân hàng Vietcombank, Techcombank..."
                                            value={refundData.refundBankName}
                                            onChange={(e) => setRefundData((d) => ({ ...d, refundBankName: e.target.value }))}
                                        />
                                    </div>
                                    <div>
                                        <label className="label py-0 text-xs">Số tài khoản</label>
                                        <input
                                            type="text"
                                            className="input input-bordered input-sm w-full"
                                            placeholder="Số tài khoản nhận hoàn tiền"
                                            value={refundData.refundBankAccount}
                                            onChange={(e) => setRefundData((d) => ({ ...d, refundBankAccount: e.target.value }))}
                                        />
                                    </div>
                                    <div>
                                        <label className="label py-0 text-xs">Chủ tài khoản</label>
                                        <input
                                            type="text"
                                            className="input input-bordered input-sm w-full"
                                            placeholder="Tên chủ tài khoản"
                                            value={refundData.refundAccountHolder}
                                            onChange={(e) => setRefundData((d) => ({ ...d, refundAccountHolder: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <p className="text-base-content/70 mb-4">
                                Bạn có chắc muốn hủy đơn hàng này? Hàng sẽ được hoàn lại tồn kho.
                            </p>
                        )}
                        <div className="modal-action justify-end gap-2">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="btn btn-ghost"
                                disabled={isLoading}
                            >
                                Không
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirm}
                                className="btn btn-error"
                                disabled={isLoading || !canConfirm}
                            >
                                {isLoading ? 'Đang xử lý...' : 'Hủy đơn'}
                            </button>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                        aria-label="Đóng"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
            <form method="dialog" className="modal-backdrop" onClick={handleCancel}>
                <button type="button" aria-label="Đóng modal">close</button>
            </form>
        </dialog>
    );
};

export default CancelOrderModal;
