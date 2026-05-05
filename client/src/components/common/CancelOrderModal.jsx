import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';
import { getVietQrBanks } from '@/services/bankService';
import RefundBankSearchCombobox from '@/components/common/RefundBankSearchCombobox';

/**
 * Hủy đơn — đơn đã thanh toán: chọn NH từ API + tìm kiếm, STK, chủ TK.
 */
const CancelOrderModal = ({ isOpen, onClose, onConfirm, order, isLoading = false }) => {
    const [refundData, setRefundData] = useState({
        refundBankName: '',
        refundBankBin: '',
        refundBankAccount: '',
        refundAccountHolder: '',
    });
    const [banks, setBanks] = useState([]);
    const [banksLoading, setBanksLoading] = useState(false);
    const [banksError, setBanksError] = useState(false);

    const isPaid = order?.paymentStatus === 'paid';
    const needsRefundInfo = isPaid;

    const loadBanks = useCallback(async () => {
        setBanksLoading(true);
        setBanksError(false);
        try {
            const res = await getVietQrBanks();
            const list = res?.data?.banks;
            setBanks(Array.isArray(list) ? list : []);
        } catch {
            setBanks([]);
            setBanksError(true);
            toast.error('Không tải được danh sách ngân hàng');
        } finally {
            setBanksLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isOpen || !needsRefundInfo) return;
        loadBanks();
    }, [isOpen, needsRefundInfo, loadBanks]);

    const handleBankFieldChange = (patch) => {
        setRefundData((d) => ({ ...d, ...patch }));
    };

    const handleConfirm = () => {
        if (!needsRefundInfo) {
            onConfirm?.();
            return;
        }
        const { refundBankName, refundBankBin, refundBankAccount, refundAccountHolder } = refundData;
        if (!refundBankName?.trim() || !refundBankAccount?.trim() || !refundAccountHolder?.trim()) {
            return;
        }
        onConfirm?.({
            refundBankName: refundBankName.trim(),
            refundBankBin: String(refundBankBin || '').replace(/\D/g, '').slice(0, 6),
            refundBankAccount: refundBankAccount.replace(/\s/g, '').trim(),
            refundAccountHolder: refundAccountHolder.trim(),
        });
    };

    const handleCancel = () => {
        setRefundData({
            refundBankName: '',
            refundBankBin: '',
            refundBankAccount: '',
            refundAccountHolder: '',
        });
        onClose();
    };

    const canConfirm =
        !needsRefundInfo ||
        (refundData.refundBankName?.trim() &&
            refundData.refundBankAccount?.trim() &&
            refundData.refundAccountHolder?.trim());

    useEffect(() => {
        if (!isOpen) {
            setRefundData({
                refundBankName: '',
                refundBankBin: '',
                refundBankAccount: '',
                refundAccountHolder: '',
            });
            setBanksError(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <dialog className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="cancel-modal-title">
            <div className="modal-box max-w-md max-h-[90vh] overflow-y-auto">
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
                                <div className="alert alert-warning text-sm py-2 px-3 mb-3">
                                    <span>
                                        Vui lòng <strong>kiểm tra kỹ</strong> tên ngân hàng, số tài khoản và tên chủ tài
                                        khoản (đúng như trên thẻ / ứng dụng ngân hàng) trước khi xác nhận. Sai thông tin
                                        có thể khiến việc hoàn tiền chậm hoặc thất bại.
                                    </span>
                                </div>
                                <p className="text-base-content/70 mb-4 text-sm">
                                    Đơn đã thanh toán. Chọn ngân hàng và nhập tài khoản để cửa hàng chuyển khoản hoàn
                                    tiền.
                                </p>
                                <div className="space-y-3 mb-4">
                                    <RefundBankSearchCombobox
                                        bankName={refundData.refundBankName}
                                        bankBin={refundData.refundBankBin}
                                        onBankChange={handleBankFieldChange}
                                        banks={banks}
                                        loading={banksLoading}
                                        loadError={banksError}
                                        onRetry={loadBanks}
                                        disabled={isLoading}
                                    />
                                    <div>
                                        <label className="label py-0 text-xs">
                                            Mã BIN (6 số — tự điền khi chọn ngân hàng; có thể sửa nếu cần)
                                        </label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            className="input input-bordered input-sm w-full font-mono"
                                            placeholder="VD: 970436"
                                            value={refundData.refundBankBin}
                                            onChange={(e) =>
                                                setRefundData((d) => ({
                                                    ...d,
                                                    refundBankBin: e.target.value.replace(/\D/g, '').slice(0, 6),
                                                }))
                                            }
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <div>
                                        <label className="label py-0 text-xs">Số tài khoản</label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            className="input input-bordered input-sm w-full font-mono"
                                            placeholder="Số tài khoản nhận hoàn tiền"
                                            value={refundData.refundBankAccount}
                                            onChange={(e) =>
                                                setRefundData((d) => ({
                                                    ...d,
                                                    refundBankAccount: e.target.value.replace(/[^\d\s]/g, ''),
                                                }))
                                            }
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <div>
                                        <label className="label py-0 text-xs">Tên chủ tài khoản</label>
                                        <input
                                            type="text"
                                            className="input input-bordered input-sm w-full"
                                            placeholder="Đúng họ tên đăng ký tại ngân hàng"
                                            value={refundData.refundAccountHolder}
                                            onChange={(e) =>
                                                setRefundData((d) => ({ ...d, refundAccountHolder: e.target.value }))
                                            }
                                            disabled={isLoading}
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
                            <button type="button" onClick={handleCancel} className="btn btn-ghost" disabled={isLoading}>
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
                <button type="button" aria-label="Đóng modal">
                    close
                </button>
            </form>
        </dialog>,
        document.body
    );
};

export default CancelOrderModal;
