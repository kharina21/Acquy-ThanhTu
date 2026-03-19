import { useState, useEffect } from 'react';
import { CreditCard, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
    getBankAccountsByLocation,
    createBankAccount,
    updateBankAccount,
    deleteBankAccount,
} from '@/services/bankAccountService';
import ConfirmationModal from '@/components/common/ConfirmationModal';

const BANK_CODES = [
    { code: 'MB', name: 'MB Bank' },
    { code: 'TCB', name: 'Techcombank' },
    { code: 'VCB', name: 'Vietcombank' },
    { code: 'BIDV', name: 'BIDV' },
    { code: 'VPB', name: 'VPBank' },
    { code: 'ACB', name: 'ACB' },
    { code: 'VIB', name: 'VIB' },
    { code: 'TPB', name: 'TPBank' },
    { code: 'MSB', name: 'MSB' },
    { code: 'HDB', name: 'HDBank' },
];

export default function BankAccountSection({ locations, loading }) {
    const [selectedLocationId, setSelectedLocationId] = useState('');
    const [accounts, setAccounts] = useState([]);
    const [loadingAccounts, setLoadingAccounts] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        bankCode: 'MB',
        bankName: '',
        bankAccount: '',
        userBankName: '',
        isDefault: false,
        note: '',
    });
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
        variant: 'warning',
    });

    useEffect(() => {
        if (locations.length > 0 && !selectedLocationId) {
            setSelectedLocationId(locations[0]._id);
        }
    }, [locations]);

    useEffect(() => {
        if (selectedLocationId) {
            fetchAccounts();
        } else {
            setAccounts([]);
        }
    }, [selectedLocationId]);

    const fetchAccounts = async () => {
        if (!selectedLocationId) return;
        setLoadingAccounts(true);
        try {
            const res = await getBankAccountsByLocation(selectedLocationId);
            setAccounts(res?.data?.accounts || []);
        } catch (e) {
            toast.error('Lỗi khi tải tài khoản');
            setAccounts([]);
        } finally {
            setLoadingAccounts(false);
        }
    };

    const handleOpenCreate = () => {
        setEditingAccount(null);
        setForm({
            bankCode: 'MB',
            bankName: '',
            bankAccount: '',
            userBankName: '',
            isDefault: accounts.length === 0,
            note: '',
        });
        setShowModal(true);
    };

    const handleOpenEdit = (acc) => {
        setEditingAccount(acc);
        setForm({
            bankCode: acc.bankCode || 'MB',
            bankName: acc.bankName || '',
            bankAccount: acc.bankAccount || '',
            userBankName: acc.userBankName || '',
            isDefault: acc.isDefault || false,
            note: acc.note || '',
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.bankAccount?.trim() || !form.userBankName?.trim()) {
            toast.error('Vui lòng nhập Số tài khoản và Tên chủ tài khoản');
            return;
        }
        setSubmitting(true);
        try {
            const bank = BANK_CODES.find((b) => b.code === form.bankCode);
            const payload = {
                locationId: selectedLocationId,
                bankCode: form.bankCode,
                bankName: bank?.name || form.bankName,
                bankAccount: form.bankAccount.trim(),
                userBankName: form.userBankName.trim(),
                isDefault: form.isDefault,
                note: form.note.trim(),
            };
            if (editingAccount) {
                await updateBankAccount(editingAccount._id, payload);
                toast.success('Cập nhật tài khoản thành công');
            } else {
                await createBankAccount(payload);
                toast.success('Thêm tài khoản thành công');
            }
            setShowModal(false);
            fetchAccounts();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Lỗi khi lưu');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = (acc) => {
        setConfirmModal({
            isOpen: true,
            title: 'Xóa tài khoản ngân hàng',
            message: `Xóa ${acc.bankCode} - ${acc.bankAccount}?`,
            variant: 'warning',
            onConfirm: async () => {
                try {
                    await deleteBankAccount(acc._id);
                    toast.success('Đã xóa');
                    fetchAccounts();
                } catch (e) {
                    toast.error('Lỗi khi xóa');
                }
            },
        });
    };

    return (
        <section className="bg-base-100 rounded-lg shadow p-6 mt-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    Tài khoản ngân hàng (VietQR)
                </h2>
                <button
                    onClick={handleOpenCreate}
                    disabled={!selectedLocationId || loading}
                    className="btn btn-primary btn-sm gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Thêm tài khoản
                </button>
            </div>
            <p className="text-sm text-base-content/60 mb-4">
                Thêm tài khoản ngân hàng để nhận thanh toán chuyển khoản/VietQR. Tham khảo{' '}
                <a
                    href="https://api.vietqr.vn"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link link-primary"
                >
                    VietQR API
                </a>
                .
            </p>
            {locations.length > 0 && (
                <>
                    <div className="mb-4">
                        <label className="label py-0 text-xs">Chi nhánh</label>
                        <select
                            className="select select-bordered select-sm w-full max-w-xs"
                            value={selectedLocationId}
                            onChange={(e) => setSelectedLocationId(e.target.value)}
                        >
                            {locations.map((loc) => (
                                <option key={loc._id} value={loc._id}>
                                    {loc.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    {loadingAccounts ? (
                        <div className="flex justify-center py-8">
                            <span className="loading loading-spinner" />
                        </div>
                    ) : accounts.length === 0 ? (
                        <div className="text-center py-8 text-base-content/60 bg-base-200/50 rounded-lg">
                            <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-50" />
                            <p>Chưa có tài khoản ngân hàng. Nhấn &quot;Thêm tài khoản&quot; để cấu hình VietQR.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table table-sm">
                                <thead>
                                    <tr>
                                        <th>Ngân hàng</th>
                                        <th>Số tài khoản</th>
                                        <th>Chủ tài khoản</th>
                                        <th>Mặc định</th>
                                        <th className="text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {accounts.map((acc) => (
                                        <tr key={acc._id}>
                                            <td className="font-medium">
                                                {acc.bankCode} {acc.bankName && `- ${acc.bankName}`}
                                            </td>
                                            <td className="font-mono">{acc.bankAccount}</td>
                                            <td>{acc.userBankName}</td>
                                            <td>{acc.isDefault ? <span className="badge badge-sm badge-success">Mặc định</span> : '—'}</td>
                                            <td className="text-right">
                                                <button
                                                    type="button"
                                                    className="btn btn-ghost btn-xs"
                                                    onClick={() => handleOpenEdit(acc)}
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-ghost btn-xs text-error"
                                                    onClick={() => handleDelete(acc)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {showModal && (
                <dialog className="modal modal-open">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg">
                            {editingAccount ? 'Chỉnh sửa tài khoản' : 'Thêm tài khoản ngân hàng'}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-3 mt-4">
                            <div>
                                <label className="label py-0">Ngân hàng</label>
                                <select
                                    className="select select-bordered select-sm w-full"
                                    value={form.bankCode}
                                    onChange={(e) => setForm((f) => ({ ...f, bankCode: e.target.value }))}
                                >
                                    {BANK_CODES.map((b) => (
                                        <option key={b.code} value={b.code}>
                                            {b.code} - {b.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="label py-0">Số tài khoản</label>
                                <input
                                    type="text"
                                    className="input input-bordered input-sm w-full"
                                    placeholder="0852240768"
                                    value={form.bankAccount}
                                    onChange={(e) => setForm((f) => ({ ...f, bankAccount: e.target.value }))}
                                    required
                                />
                            </div>
                            <div>
                                <label className="label py-0">Tên chủ tài khoản</label>
                                <input
                                    type="text"
                                    className="input input-bordered input-sm w-full"
                                    placeholder="NGUYEN VAN A"
                                    value={form.userBankName}
                                    onChange={(e) => setForm((f) => ({ ...f, userBankName: e.target.value }))}
                                    required
                                />
                            </div>
                            <label className="label cursor-pointer gap-2 py-0">
                                <input
                                    type="checkbox"
                                    className="checkbox checkbox-sm"
                                    checked={form.isDefault}
                                    onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                                />
                                <span className="label-text">Đặt làm mặc định</span>
                            </label>
                            <div className="modal-action">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
                                    Hủy
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? 'Đang lưu...' : 'Lưu'}
                                </button>
                            </div>
                        </form>
                    </div>
                    <form method="dialog" className="modal-backdrop">
                        <button type="button" onClick={() => setShowModal(false)}>
                            đóng
                        </button>
                    </form>
                </dialog>
            )}

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                variant={confirmModal.variant}
                onClose={() => setConfirmModal((p) => ({ ...p, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal((p) => ({ ...p, isOpen: false }))}
            />
        </section>
    );
}
