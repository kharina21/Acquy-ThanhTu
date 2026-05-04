import { useState, useEffect } from 'react';
import {
    getAllClaims,
    updateWarrantyClaim,
    deleteWarranty,
    getWarrantyStats,
    getClaimStats,
    createWarrantyClaim,
    lookupWarrantyByOrderCode,
} from '@/services/warrantyService';
import { getProvinces, getDistricts, getWards } from '@/services/addressService';
import { toast } from 'sonner';
import {
    Shield,
    Search,
    ChevronLeft,
    ChevronRight,
    Package,
    Calendar,
    Clock,
    AlertCircle,
    RefreshCw,
    Eye,
    Plus,
    X,
    User,
    Phone,
    Mail,
    MapPin,
    FileText,
    ChevronDown,
    Edit,
    Trash2,
    CheckCircle,
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────────
const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatVND = (n) => {
    if (n == null || Number.isNaN(Number(n))) return '—';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n));
};

// 4 trạng thái
const CLAIM_STATUS = {
    pending:   { label: 'Chờ xử lý', badge: 'badge-warning', icon: Clock },
    approved:  { label: 'Duyệt đơn',  badge: 'badge-info',    icon: CheckCircle },
    rejected:  { label: 'Từ chối',   badge: 'badge-error',   icon: X },
    completed: { label: 'Hoàn thành', badge: 'badge-success', icon: CheckCircle },
};

const REASON_LABELS = {
    product_damage: 'Sản phẩm bị hư hỏng',
    product_defect: 'Lỗi từ nhà sản xuất',
    battery_leak: 'Ắc quy bị chảy nước',
    charging_issue: 'Không sạc được / sạc yếu',
    other: 'Lý do khác',
};

// ── Stat Card ─────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, colorClass }) {
    return (
        <div className="stat bg-base-100 border border-base-200 rounded-xl shadow-sm py-3 px-4">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass} bg-opacity-10`}>
                    <Icon className={`w-5 h-5 ${colorClass}`} />
                </div>
                <div>
                    <div className="text-xs text-base-content/60">{label}</div>
                    <div className="text-xl font-bold">{value ?? 0}</div>
                </div>
            </div>
        </div>
    );
}

// ── Chi tiết / Xử lý phiếu Modal ───────────────────────────────────
function ClaimDetailModal({ claim, warrantyId, onClose, onUpdate, product, customer, orderCode, warrantyEndDate, purchaseDate }) {
    const [selectedClaim, setSelectedClaim] = useState(claim);
    const [claimNotes, setClaimNotes] = useState('');
    const [updating, setUpdating] = useState(false);

    // Sync khi claim prop thay đổi
    useEffect(() => {
        setSelectedClaim(claim);
    }, [claim]);

    const handleUpdateClaim = async (newStatus) => {
        setUpdating(true);
        try {
            const res = await updateWarrantyClaim(warrantyId, selectedClaim.claimCode, {
                status: newStatus,
                resolutionNotes: claimNotes,
            });
            if (res?.success) {
                toast.success('Cập nhật thành công!');
                onUpdate();
                onClose();
            } else {
                toast.error(res?.message || 'Cập nhật thất bại.');
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Lỗi khi cập nhật.');
        } finally {
            setUpdating(false);
        }
    };

    const s = CLAIM_STATUS[selectedClaim?.status] || {};
    const IconCmp = s.icon || Clock;

    return (
        <div className="modal modal-open">
            <div className="modal-box max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-700" />
                    Chi tiết phiếu bảo hành
                </h3>
                <p className="text-sm text-base-content/60 mb-4">
                    Mã phiếu: <span className="font-mono font-semibold text-base-content">{selectedClaim?.claimCode}</span>
                    <span className="mx-2">|</span>
                    Mã BH: <span className="font-mono font-semibold text-base-content">{selectedClaim?.warrantyCode}</span>
                </p>

                <div className="space-y-4">
                    {/* Trạng thái */}
                    <div className="flex items-center gap-3">
                        <span className={`badge ${s.badge} gap-1 border-0 text-sm px-3 py-2`}>
                            <IconCmp className="w-4 h-4" /> {s.label}
                        </span>
                        {selectedClaim?.createdAt && (
                            <span className="text-xs text-base-content/50">Ngày tạo: {formatDate(selectedClaim.createdAt)}</span>
                        )}
                    </div>

                    {/* Sản phẩm */}
                    <div className="rounded-xl bg-base-100 border border-base-200 p-4 space-y-2 text-sm">
                        <h4 className="font-semibold text-base-content/70 text-xs uppercase tracking-wide">Sản phẩm</h4>
                        <div className="flex items-center gap-3">
                            <div className="w-14 h-14 rounded-lg border border-base-200 overflow-hidden shrink-0 bg-base-200 flex items-center justify-center">
                                {product?.image ? (
                                    <img src={product.image} alt="" className="w-full h-full object-contain p-0.5" />
                                ) : (
                                    <Package className="w-6 h-6 text-base-content/30" />
                                )}
                            </div>
                            <div>
                                <p className="font-semibold">{product?.name || selectedClaim?.product?.name || '—'}</p>
                                <p className="text-base-content/60 text-xs font-mono">SKU: {product?.sku || selectedClaim?.product?.sku || '—'}</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-base-content/60">
                            <span>Thời gian BH: <strong>{formatDate(warrantyEndDate || selectedClaim?.warrantyEndDate)}</strong></span>
                            <span>Ngày mua: <strong>{formatDate(purchaseDate || selectedClaim?.purchaseDate)}</strong></span>
                            {orderCode && <span>Mã đơn: <strong className="font-mono">{orderCode}</strong></span>}
                        </div>
                    </div>

                    {/* Khách hàng */}
                    <div className="rounded-xl bg-base-100 border border-base-200 p-4 text-sm">
                        <h4 className="font-semibold text-base-content/70 text-xs uppercase tracking-wide mb-2">Khách hàng</h4>
                        <div className="space-y-1">
                            <p className="font-medium">
                                {customer?.name || selectedClaim?.customerName || '—'}
                            </p>
                            <p className="text-base-content/60 text-xs">
                                Điện thoại: {customer?.phone || selectedClaim?.customerPhone || '—'}
                            </p>
                            <p className="text-base-content/60 text-xs">
                                Hóa đơn: <span className="font-mono">{orderCode || selectedClaim?.orderCode || '—'}</span>
                            </p>
                        </div>
                    </div>

                    {/* Thông tin phiếu */}
                    <div className="rounded-xl bg-base-100 border border-base-200 p-4 text-sm space-y-2">
                        <h4 className="font-semibold text-base-content/70 text-xs uppercase tracking-wide">Thông tin phiếu</h4>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                                <span className="text-base-content/50">Lý do: </span>
                                <span className="font-medium">{REASON_LABELS[selectedClaim?.reason] || selectedClaim?.reason || '—'}</span>
                            </div>
                            <div>
                                <span className="text-base-content/50">Ngày gửi: </span>
                                <span className="font-medium">{formatDate(selectedClaim?.createdAt)}</span>
                            </div>
                        </div>
                        {selectedClaim?.description && (
                            <div className="text-xs">
                                <span className="text-base-content/50">Mô tả: </span>
                                <span>{selectedClaim.description}</span>
                            </div>
                        )}
                        {selectedClaim?.customerAddress && (
                            <div className="text-xs">
                                <span className="text-base-content/50">Địa chỉ: </span>
                                <span>{selectedClaim.customerAddress}</span>
                            </div>
                        )}
                        {selectedClaim?.resolutionNotes && (
                            <div className="text-xs bg-blue-50 border border-blue-100 rounded p-2 text-blue-800">
                                <span className="font-medium">Ghi chú xử lý: </span>{selectedClaim.resolutionNotes}
                            </div>
                        )}
                        {selectedClaim?.resolvedAt && (
                            <div className="text-xs text-base-content/50">
                                Đã xử lý: {formatDate(selectedClaim.resolvedAt)}
                            </div>
                        )}
                    </div>
                </div>

                {/* Xử lý phiếu */}
                {(selectedClaim?.status === 'pending' || selectedClaim?.status === 'approved') && (
                    <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Xử lý phiếu
                        </h4>
                        <div>
                            <label className="text-xs text-base-content/60 mb-1 block">Ghi chú xử lý</label>
                            <textarea
                                className="textarea textarea-bordered w-full text-sm"
                                rows={2}
                                value={claimNotes}
                                onChange={(e) => setClaimNotes(e.target.value)}
                                placeholder="Nhập ghi chú..."
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {selectedClaim?.status === 'pending' && (
                                <>
                                    <button className="btn btn-sm btn-success gap-1" disabled={updating} onClick={() => handleUpdateClaim('approved')}>
                                        <CheckCircle className="w-3 h-3" /> Duyệt đơn
                                    </button>
                                    <button className="btn btn-sm btn-error btn-outline gap-1" disabled={updating} onClick={() => handleUpdateClaim('rejected')}>
                                        <X className="w-3 h-3" /> Từ chối
                                    </button>
                                </>
                            )}
                            <button className="btn btn-sm btn-primary gap-1" disabled={updating} onClick={() => handleUpdateClaim('completed')}>
                                <CheckCircle className="w-3 h-3" /> Hoàn thành
                            </button>
                        </div>
                    </div>
                )}

                <div className="modal-action">
                    <button className="btn" onClick={onClose}>Đóng</button>
                </div>
            </div>
            <div className="modal-backdrop" onClick={onClose} />
        </div>
    );
}

// ── Sửa phiếu BH Modal ──────────────────────────────────────────────
function EditClaimModal({ claim, warrantyId, onClose, onSuccess, product, customer, orderCode }) {
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        customerName: customer?.name || claim?.customerName || '',
        customerPhone: customer?.phone || claim?.customerPhone || '',
        customerEmail: claim?.customerEmail || '',
        reason: claim?.reason || '',
        description: claim?.description || '',
        notes: claim?.notes || '',
    });

    const [customerAddress, setCustomerAddress] = useState(claim?.customerAddress || '');

    // Sync khi props thay đổi
    useEffect(() => {
        setForm({
            customerName: customer?.name || claim?.customerName || '',
            customerPhone: customer?.phone || claim?.customerPhone || '',
            customerEmail: claim?.customerEmail || '',
            reason: claim?.reason || '',
            description: claim?.description || '',
            notes: claim?.notes || '',
        });
        setCustomerAddress(claim?.customerAddress || '');
    }, [claim, customer]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.customerName.trim()) { toast.error('Vui lòng nhập họ tên.'); return; }
        if (!form.customerPhone.trim() || !/^[\d\s\-\+]{8,15}$/.test(form.customerPhone.trim())) {
            toast.error('Vui lòng nhập số điện thoại hợp lệ.'); return;
        }
        if (!form.reason) { toast.error('Vui lòng chọn lý do bảo hành.'); return; }

        setSaving(true);
        try {
            const res = await updateWarrantyClaim(warrantyId, claim.claimCode, {
                reason: form.reason,
                description: form.description,
                customerName: form.customerName.trim(),
                customerPhone: form.customerPhone.trim(),
                customerEmail: form.customerEmail.trim(),
                customerAddress,
                notes: form.notes.trim(),
            });
            if (res?.success) {
                toast.success('Cập nhật phiếu bảo hành thành công!');
                onSuccess();
                onClose();
            } else {
                toast.error(res?.message || 'Cập nhật thất bại.');
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Lỗi khi cập nhật.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal modal-open">
            <div className="modal-box max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Edit className="w-5 h-5 text-blue-700" />
                    Sửa phiếu bảo hành
                </h3>
                <p className="text-xs text-base-content/60 mb-4 font-mono">
                    {claim?.warrantyCode} — {claim?.claimCode}
                    {orderCode && <span className="ml-2">| Mã đơn: {orderCode}</span>}
                </p>

                <div className="flex items-center gap-3 p-3 bg-base-200/50 rounded-xl border border-base-200 mb-4">
                    <div className="w-12 h-12 rounded-lg border border-base-200 bg-white flex items-center justify-center shrink-0">
                        {product?.image || claim?.product?.image ? (
                            <img src={product?.image || claim?.product?.image} alt="" className="w-full h-full object-contain p-0.5" />
                        ) : (
                            <Package className="w-6 h-6 text-gray-300" />
                        )}
                    </div>
                    <div>
                        <p className="font-bold text-sm">{product?.name || claim?.product?.name || '—'}</p>
                        <p className="text-xs text-base-content/50 font-mono">SKU: {product?.sku || claim?.product?.sku || '—'}</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label py-1"><span className="label-text text-xs font-semibold">Lý do bảo hành <span className="text-red-500">*</span></span></label>
                        <div className="grid grid-cols-2 gap-2">
                            {Object.entries(REASON_LABELS).map(([val, label]) => (
                                <button key={val} type="button" onClick={() => setForm((f) => ({ ...f, reason: val }))}
                                    className={`px-3 py-2.5 rounded-xl text-sm font-medium border-2 text-left transition-all ${form.reason === val ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-base-300 text-base-content/70 hover:border-blue-300'}`}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="label py-1"><span className="label-text text-xs font-semibold">Mô tả tình trạng</span></label>
                        <textarea className="textarea textarea-bordered w-full text-sm" rows={2}
                            value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                            placeholder="Mô tả chi tiết..." maxLength={1000} />
                    </div>

                    <div className="rounded-xl bg-base-200/30 border border-base-200 p-4 space-y-3">
                        <h4 className="font-semibold text-sm text-base-content/70 flex items-center gap-2"><User className="w-4 h-4" />Thông tin khách hàng</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div><label className="label py-1"><span className="label-text text-xs">Họ tên <span className="text-red-500">*</span></span></label>
                                <input type="text" value={form.customerName} onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))} className="input input-bordered w-full h-10 text-sm" /></div>
                            <div><label className="label py-1"><span className="label-text text-xs">Điện thoại <span className="text-red-500">*</span></span></label>
                                <input type="text" value={form.customerPhone} onChange={(e) => setForm((f) => ({ ...f, customerPhone: e.target.value }))} className="input input-bordered w-full h-10 text-sm" /></div>
                            <div className="sm:col-span-2"><label className="label py-1"><span className="label-text text-xs flex items-center gap-1"><Mail className="w-3 h-3" />Email</span></label>
                                <input type="email" value={form.customerEmail} onChange={(e) => setForm((f) => ({ ...f, customerEmail: e.target.value }))} className="input input-bordered w-full h-10 text-sm" /></div>
                        </div>
                    </div>

                    <div className="rounded-xl bg-base-200/30 border border-base-200 p-4 space-y-3">
                        <h4 className="font-semibold text-sm text-base-content/70 flex items-center gap-2"><MapPin className="w-4 h-4" />Địa chỉ</h4>
                        <div><label className="label py-1"><span className="label-text text-xs">Địa chỉ đầy đủ</span></label>
                            <input type="text" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)}
                                className="input input-bordered w-full h-10 text-sm" placeholder="Số nhà, đường, phường, quận, tỉnh..." /></div>
                    </div>

                    <div><label className="label py-1"><span className="label-text text-xs flex items-center gap-1"><Phone className="w-3 h-3" />Ghi chú thêm</span></label>
                        <input type="text" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="input input-bordered w-full h-10 text-sm" /></div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" className="btn btn-outline flex-1" onClick={onClose}>Hủy</button>
                        <button type="submit" className="btn btn-primary flex-1 gap-2" disabled={saving}>
                            {saving ? <><span className="loading loading-spinner loading-xs" /> Đang lưu...</> : <><CheckCircle className="w-4 h-4" /> Lưu thay đổi</>}
                        </button>
                    </div>
                </form>
            </div>
            <div className="modal-backdrop" onClick={onClose} />
        </div>
    );
}

// ── Xóa Modal ────────────────────────────────────────────────────────
function DeleteConfirmModal({ claim, warrantyId, onClose, onConfirm }) {
    const [confirming, setConfirming] = useState(false);

    const handleDelete = async () => {
        setConfirming(true);
        try {
            const res = await deleteWarranty(warrantyId);
            if (res?.success) {
                toast.success('Xóa phiếu bảo hành thành công!');
                onConfirm();
                onClose();
            } else {
                toast.error(res?.message || 'Xóa thất bại.');
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Lỗi khi xóa.');
        } finally {
            setConfirming(false);
        }
    };

    return (
        <div className="modal modal-open">
            <div className="modal-box max-w-sm w-full">
                <div className="flex flex-col items-center gap-4 py-4 text-center">
                    <div className="w-14 h-14 rounded-full bg-error/10 flex items-center justify-center">
                        <Trash2 className="w-7 h-7 text-error" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">Xóa phiếu bảo hành?</h3>
                        <p className="text-base-content/60 text-sm mt-1">
                            <span className="font-mono font-semibold">{claim?.claimCode}</span>
                        </p>
                        <p className="text-error text-xs mt-1">Hành động này không thể hoàn tác.</p>
                    </div>
                    <div className="flex gap-3 w-full">
                        <button className="btn btn-outline flex-1" onClick={onClose} disabled={confirming}>Hủy</button>
                        <button className="btn btn-error flex-1 gap-2" onClick={handleDelete} disabled={confirming}>
                            {confirming ? <><span className="loading loading-spinner loading-xs" /> Đang xóa...</> : <><Trash2 className="w-4 h-4" /> Xóa</>}
                        </button>
                    </div>
                </div>
            </div>
            <div className="modal-backdrop" onClick={onClose} />
        </div>
    );
}

// ── Modal: Tra cứu hóa đơn ─────────────────────────────────────────────
function LookupOrderModal({ onClose, onSelectProduct, orderData, setOrderData, lookupLoading, setLookupLoading, lookupError, setLookupError, orderCode, setOrderCode, handleLookup, handleNew }) {
    return (
        <div className="modal modal-open">
            <div className="modal-box max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Search className="w-5 h-5 text-blue-700" />
                        Tra cứu hóa đơn
                    </h3>
                    <button className="btn btn-sm btn-ghost btn-circle" onClick={onClose}><X className="w-4 h-4" /></button>
                </div>

                <form onSubmit={handleLookup} className="space-y-4">
                    <div>
                        <label className="label py-1"><span className="label-text text-xs font-semibold">Nhập mã hóa đơn</span></label>
                        <input
                            type="text"
                            value={orderCode}
                            onChange={(e) => setOrderCode(e.target.value.toUpperCase())}
                            placeholder="ORD-2026-XXXXXX-ABCD"
                            className="input input-bordered w-full h-11 font-mono"
                            autoFocus
                        />
                    </div>
                    {lookupError && (
                        <div className="alert alert-error py-2 text-sm"><X className="w-4 h-4" />{lookupError}</div>
                    )}
                    <button type="submit" className="btn btn-primary w-full gap-2" disabled={lookupLoading}>
                        {lookupLoading ? <><span className="loading loading-spinner loading-sm" /> Đang tra...</> : <><Search className="w-4 h-4" /> Tra cứu</>}
                    </button>
                </form>

                {orderData && (
                    <div className="mt-4 space-y-3">
                        <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/20 rounded-lg">
                            <div className="w-5 h-5 rounded-full bg-success flex items-center justify-center"><span className="text-white text-xs">✓</span></div>
                            <span className="text-sm font-medium text-success">Hóa đơn hợp lệ</span>
                            <span className="font-mono text-sm font-semibold ml-auto">{orderData.order.code}</span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm p-4 bg-base-200/50 rounded-xl border border-base-200">
                            <div><p className="text-base-content/50 text-xs">Ngày mua</p><p className="font-medium">{formatDate(orderData.order.purchaseDate)}</p></div>
                            <div><p className="text-base-content/50 text-xs">Tổng tiền</p><p className="font-medium text-error">{formatVND(orderData.order.totalAmount)}</p></div>
                            <div><p className="text-base-content/50 text-xs">Khách hàng</p><p className="font-medium">{orderData.order.customerName || '—'}</p></div>
                            <div><p className="text-base-content/50 text-xs">Điện thoại</p><p className="font-medium">{orderData.order.customerPhone || '—'}</p></div>
                        </div>

                        <div className="border border-base-200 rounded-xl overflow-hidden">
                            <div className="bg-base-200/50 px-4 py-3">
                                <h4 className="font-semibold text-sm flex items-center gap-2"><Package className="w-4 h-4" />Chọn sản phẩm cần bảo hành</h4>
                            </div>
                            <div className="divide-y divide-base-200 max-h-64 overflow-y-auto">
                                {orderData.warranties.map((w) => (
                                    <button
                                        key={w._id || w.product?._id}
                                        onClick={() => onSelectProduct(w)}
                                        className="w-full flex items-center gap-3 p-4 hover:bg-blue-50 transition-colors text-left"
                                    >
                                        <div className="w-12 h-12 rounded-lg border border-base-200 bg-white flex items-center justify-center shrink-0">
                                            {w.product?.image ? (
                                                <img src={w.product.image} alt={w.product.name} className="w-full h-full object-contain p-0.5" />
                                            ) : (
                                                <Package className="w-6 h-6 text-gray-300" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-sm text-base-content truncate">{w.product?.name || '—'}</p>
                                            {w.product?.sku && <p className="text-xs text-base-content/40 font-mono">SKU: {w.product.sku}</p>}
                                            {w.warrantyText && <p className="text-xs text-blue-600 mt-0.5">BH: {w.warrantyText}</p>}
                                        </div>
                                        <span className="badge badge-primary badge-sm">Chọn</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button onClick={handleNew} className="btn btn-ghost btn-sm gap-1 text-base-content/60 w-full">
                            <RefreshCw className="w-3 h-3" /> Tra hóa đơn khác
                        </button>
                    </div>
                )}

                <div className="modal-action">
                    <button className="btn" onClick={onClose}>Đóng</button>
                </div>
            </div>
            <div className="modal-backdrop" onClick={onClose} />
        </div>
    );
}

// ── Modal: Tạo phiếu BH ──────────────────────────────────────────────
function CreateWarrantyFormModal({ onClose, onSuccess, selectedProduct, orderData, loadStats }) {
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [result, setResult] = useState(null);

    const [provinces, setProvinces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [wards, setWards] = useState([]);
    const [loadingAddress, setLoadingAddress] = useState(false);

    const [form, setForm] = useState(() => {
        const order = orderData?.order || {};
        let name = order.customerName || '';
        let phone = order.customerPhone || '';
        let email = '';
        if (orderData?.customerProfile) {
            const cp = orderData.customerProfile;
            name = cp.name || name;
            phone = cp.phone || phone;
            email = cp.email || email;
        }
        return {
            reason: '',
            description: '',
            customerName: name,
            customerPhone: phone,
            customerEmail: email,
            provinceCode: '',
            provinceName: '',
            districtCode: '',
            districtName: '',
            wardCode: '',
            wardName: '',
            addressLine: '',
            notes: '',
        };
    });

    useEffect(() => {
        getProvinces().then((data) => setProvinces(data || [])).catch(() => {});
    }, []);

    const loadDistricts = async (code) => {
        if (!code) { setDistricts([]); return; }
        setLoadingAddress(true);
        try { setDistricts(await getDistricts(code) || []); } catch { setDistricts([]); }
        setLoadingAddress(false);
    };
    const loadWards = async (code) => {
        if (!code) { setWards([]); return; }
        setLoadingAddress(true);
        try { setWards(await getWards(code) || []); } catch { setWards([]); }
        setLoadingAddress(false);
    };

    useEffect(() => {
        if (form.districtCode) loadWards(form.districtCode);
    }, [form.districtCode]);

    const handleProvinceChange = (code) => {
        const p = provinces.find((x) => String(x.code) === code);
        setForm((f) => ({ ...f, provinceCode: code, provinceName: p?.name || '', districtCode: '', districtName: '', wardCode: '', wardName: '' }));
        setDistricts([]); setWards([]);
        if (code) loadDistricts(code);
    };
    const handleDistrictChange = (code) => {
        const d = districts.find((x) => String(x.code) === code);
        setForm((f) => ({ ...f, districtCode: code, districtName: d?.name || '', wardCode: '', wardName: '' }));
        setWards([]);
        if (code) loadWards(code);
    };
    const handleWardChange = (code) => {
        const w = wards.find((x) => String(x.code) === code);
        setForm((f) => ({ ...f, wardCode: code, wardName: w?.name || '' }));
    };

    const buildAddress = () => {
        const parts = [];
        if (form.wardName) parts.push(form.wardName);
        if (form.districtName) parts.push(form.districtName);
        if (form.provinceName) parts.push(form.provinceName);
        if (form.addressLine) parts.push(form.addressLine);
        return parts.join(', ');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.reason) { toast.error('Vui lòng chọn lý do bảo hành.'); return; }
        if (!form.customerName.trim()) { toast.error('Vui lòng nhập họ tên.'); return; }
        if (!form.customerPhone.trim() || !/^[\d\s\-\+]{8,15}$/.test(form.customerPhone.trim())) {
            toast.error('Vui lòng nhập số điện thoại hợp lệ.'); return;
        }

        setSubmitting(true);
        try {
            const productId = selectedProduct.product?._id || selectedProduct.productId;
            const res = await createWarrantyClaim({
                orderCode: orderData.order.code,
                productId,
                reason: form.reason,
                description: form.description,
                customerName: form.customerName.trim(),
                customerPhone: form.customerPhone.trim(),
                customerEmail: form.customerEmail.trim(),
                customerAddress: buildAddress(),
                notes: form.notes.trim(),
            });
            if (res?.success) {
                setResult(res.data);
                setSubmitted(true);
                toast.success('Tạo phiếu bảo hành thành công!');
                loadStats && loadStats();
            } else {
                toast.error(res?.message || 'Tạo phiếu thất bại.');
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Lỗi khi tạo phiếu bảo hành.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => { if (submitted) onSuccess(); onClose(); };

    if (submitted && result) {
        return (
            <div className="modal modal-open">
                <div className="modal-box max-w-md w-full text-center">
                    <div className="flex flex-col items-center gap-4 py-6">
                        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-success flex items-center justify-center text-white text-xl">✓</div>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">Tạo phiếu thành công!</h3>
                            <p className="text-base-content/60 text-sm mt-1">Phiếu bảo hành đã được tạo.</p>
                        </div>
                        <div className="bg-base-200/50 rounded-xl border border-base-200 p-4 w-full space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-base-content/60">Mã phiếu BH:</span><span className="font-mono font-semibold text-primary">{result.claimCode}</span></div>
                            <div className="flex justify-between"><span className="text-base-content/60">Mã bảo hành:</span><span className="font-mono font-semibold">{result.warrantyCode}</span></div>
                            <div className="flex justify-between"><span className="text-base-content/60">Sản phẩm:</span><span className="font-medium text-right max-w-[180px] truncate">{selectedProduct?.product?.name}</span></div>
                            <div className="flex justify-between"><span className="text-base-content/60">Trạng thái:</span><span className="badge badge-warning border-0 text-xs">Chờ xử lý</span></div>
                        </div>
                        <button className="btn btn-primary w-full" onClick={handleClose}>Đóng</button>
                    </div>
                </div>
                <div className="modal-backdrop" onClick={handleClose} />
            </div>
        );
    }

    return (
        <div className="modal modal-open">
            <div className="modal-box max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2"><Plus className="w-5 h-5 text-blue-700" />Tạo phiếu bảo hành</h3>
                    <button className="btn btn-sm btn-ghost btn-circle" onClick={onClose}><X className="w-4 h-4" /></button>
                </div>

                <div className="flex items-center gap-3 p-3 bg-base-200/50 rounded-xl border border-base-200 mb-4">
                    <div className="w-12 h-12 rounded-lg border border-base-200 bg-white flex items-center justify-center shrink-0">
                        {selectedProduct?.product?.image ? (
                            <img src={selectedProduct.product.image} alt="" className="w-full h-full object-contain p-0.5" />
                        ) : (
                            <Package className="w-6 h-6 text-gray-300" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm">{selectedProduct?.product?.name}</p>
                        <p className="text-xs text-blue-600">{selectedProduct?.warrantyText || `BH ${selectedProduct?.warrantyMonths} tháng`}</p>
                    </div>
                    <span className="badge badge-ghost text-xs">{orderData?.order?.code}</span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label py-1"><span className="label-text text-xs font-semibold flex items-center gap-1"><FileText className="w-3 h-3" />Lý do BH <span className="text-red-500">*</span></span></label>
                        <div className="grid grid-cols-2 gap-2">
                            {Object.entries(REASON_LABELS).map(([val, label]) => (
                                <button key={val} type="button" onClick={() => setForm((f) => ({ ...f, reason: val }))}
                                    className={`px-3 py-2.5 rounded-xl text-sm font-medium border-2 text-left transition-all ${form.reason === val ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-base-300 text-base-content/70 hover:border-blue-300'}`}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="label py-1"><span className="label-text text-xs font-semibold">Mô tả tình trạng</span></label>
                        <textarea className="textarea textarea-bordered w-full text-sm" rows={2}
                            value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                            placeholder="Mô tả chi tiết..." maxLength={1000} />
                    </div>

                    <div className="rounded-xl bg-base-200/30 border border-base-200 p-4 space-y-3">
                        <h4 className="font-semibold text-sm text-base-content/70 flex items-center gap-2"><User className="w-4 h-4" />Thông tin khách hàng</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div><label className="label py-1"><span className="label-text text-xs">Họ tên <span className="text-red-500">*</span></span></label>
                                <input type="text" value={form.customerName} onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))} className="input input-bordered w-full h-10 text-sm" /></div>
                            <div><label className="label py-1"><span className="label-text text-xs">Điện thoại <span className="text-red-500">*</span></span></label>
                                <input type="text" value={form.customerPhone} onChange={(e) => setForm((f) => ({ ...f, customerPhone: e.target.value }))} className="input input-bordered w-full h-10 text-sm" /></div>
                            <div className="sm:col-span-2"><label className="label py-1"><span className="label-text text-xs flex items-center gap-1"><Mail className="w-3 h-3" />Email</span></label>
                                <input type="email" value={form.customerEmail} onChange={(e) => setForm((f) => ({ ...f, customerEmail: e.target.value }))} className="input input-bordered w-full h-10 text-sm" /></div>
                        </div>
                    </div>

                    <div className="rounded-xl bg-base-200/30 border border-base-200 p-4 space-y-3">
                        <h4 className="font-semibold text-sm text-base-content/70 flex items-center gap-2"><MapPin className="w-4 h-4" />Địa chỉ</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div><label className="label py-1"><span className="label-text text-xs">Tỉnh/TP</span></label>
                                <div className="relative"><select value={form.provinceCode} onChange={(e) => handleProvinceChange(e.target.value)} className="select select-bordered w-full h-10 text-sm appearance-none pr-8"><option value="">Chọn</option>{provinces.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}</select><ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40 pointer-events-none" /></div></div>
                            <div><label className="label py-1"><span className="label-text text-xs">Quận/Huyện</span></label>
                                <div className="relative"><select value={form.districtCode} onChange={(e) => handleDistrictChange(e.target.value)} disabled={!form.provinceCode || loadingAddress} className="select select-bordered w-full h-10 text-sm appearance-none pr-8 disabled:bg-base-200"><option value="">Chọn</option>{districts.map((d) => <option key={d.code} value={d.code}>{d.name}</option>)}</select><ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40 pointer-events-none" /></div></div>
                            <div><label className="label py-1"><span className="label-text text-xs">Phường/Xã</span></label>
                                <div className="relative"><select value={form.wardCode} onChange={(e) => handleWardChange(e.target.value)} disabled={!form.districtCode || loadingAddress} className="select select-bordered w-full h-10 text-sm appearance-none pr-8 disabled:bg-base-200"><option value="">Chọn</option>{wards.map((w) => <option key={w.code} value={w.code}>{w.name}</option>)}</select><ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40 pointer-events-none" /></div></div>
                        </div>
                        <div><label className="label py-1"><span className="label-text text-xs">Địa chỉ chi tiết</span></label>
                            <input type="text" value={form.addressLine} onChange={(e) => setForm((f) => ({ ...f, addressLine: e.target.value }))} className="input input-bordered w-full h-10 text-sm" placeholder="Số nhà, đường..." /></div>
                        {buildAddress() && <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 text-xs text-blue-800"><span className="font-medium">Địa chỉ: </span>{buildAddress()}</div>}
                    </div>

                    <div><label className="label py-1"><span className="label-text text-xs flex items-center gap-1"><Phone className="w-3 h-3" />Ghi chú thêm</span></label>
                        <input type="text" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="input input-bordered w-full h-10 text-sm" /></div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" className="btn btn-outline flex-1" onClick={onClose}>Hủy</button>
                        <button type="submit" className="btn btn-primary flex-1 gap-2" disabled={submitting || !form.reason || !form.customerName.trim() || !form.customerPhone.trim()}>
                            {submitting ? <><span className="loading loading-spinner loading-xs" /> Đang tạo...</> : <><Plus className="w-4 h-4" />Tạo phiếu BH</>}
                        </button>
                    </div>
                </form>
            </div>
            <div className="modal-backdrop" onClick={onClose} />
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────
export default function WarrantyManagementPage() {
    const [claims, setClaims] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState(null);

    // Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);

    // Modals
    const [showLookupModal, setShowLookupModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const [selectedClaim, setSelectedClaim] = useState(null);
    const [selectedWarrantyId, setSelectedWarrantyId] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedDetailProduct, setSelectedDetailProduct] = useState(null);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [selectedOrderCode, setSelectedOrderCode] = useState(null);
    const [selectedWarrantyEndDate, setSelectedWarrantyEndDate] = useState(null);
    const [selectedPurchaseDate, setSelectedPurchaseDate] = useState(null);
    const [orderData, setOrderData] = useState(null);
    const [orderCode, setOrderCode] = useState('');
    const [lookupLoading, setLookupLoading] = useState(false);
    const [lookupError, setLookupError] = useState('');

    const loadClaims = async (pageNum = 1) => {
        setLoading(true);
        try {
            const params = { page: pageNum, limit: 20 };
            if (search.trim()) params.search = search.trim();
            if (statusFilter) params.claimStatus = statusFilter;

            const res = await getAllClaims(params);
            if (res?.success) {
                setClaims(res.data.claims);
                setPagination(res.data.pagination);
                setPage(pageNum);
            }
        } catch {
            toast.error('Lỗi khi tải danh sách phiếu bảo hành.');
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const res = await getClaimStats();
            if (res?.success) setStats(res.data);
        } catch { /* silent */ }
    };

    useEffect(() => {
        loadClaims(1);
        loadStats();
    }, []);

    const handleSearch = (e) => { e.preventDefault(); loadClaims(1); };

    const goPage = (p) => {
        if (!pagination || p < 1 || p > pagination.totalPages) return;
        loadClaims(p);
    };

    const handleAfterAction = () => { loadClaims(page); loadStats(); };

    const handleNewLookup = () => { setOrderCode(''); setOrderData(null); setSelectedProduct(null); setLookupError(''); };

    const handleLookup = async (e) => {
        e.preventDefault();
        const code = orderCode.trim().toUpperCase();
        if (!code || code.length < 3) { toast.error('Nhập mã hóa đơn (ít nhất 3 ký tự).'); return; }
        setLookupLoading(true);
        setLookupError('');
        try {
            const res = await lookupWarrantyByOrderCode(code);
            if (res?.success && res?.data) setOrderData(res.data);
            else setLookupError(res?.message || 'Không tìm thấy hóa đơn.');
        } catch (err) {
            setLookupError(err?.response?.data?.message || 'Lỗi khi tra cứu.');
        } finally {
            setLookupLoading(false);
        }
    };

    const handleSelectProduct = (product) => {
        setSelectedProduct(product);
        setShowLookupModal(false);
        setShowCreateModal(true);
    };

    const handleOpenLookup = () => { handleNewLookup(); setShowLookupModal(true); };

    const handleCloseAll = () => {
        setShowLookupModal(false); setShowCreateModal(false);
        setShowDetailModal(false); setShowEditModal(false); setShowDeleteModal(false);
        setSelectedProduct(null); setSelectedDetailProduct(null); setSelectedCustomer(null);
        setSelectedOrderCode(null); setSelectedWarrantyEndDate(null); setSelectedPurchaseDate(null);
        setOrderData(null); setOrderCode('');
        setSelectedClaim(null); setSelectedWarrantyId(null);
    };

    return (
        <div className="min-h-screen bg-base-200 flex flex-col">
            {/* Header */}
            <div className="bg-base-100 border-b border-base-200 px-6 py-4 shrink-0">
                <h1 className="text-xl font-bold flex items-center gap-2">
                    <Shield className="w-6 h-6 text-blue-700" /> Quản lý bảo hành
                </h1>
                <p className="text-sm text-base-content/60 mt-0.5">Danh sách phiếu yêu cầu bảo hành</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Stats */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        <StatCard label="Tổng phiếu" value={stats.totalClaims} icon={FileText} colorClass="text-primary" />
                        <StatCard label="Chờ xử lý" value={stats.pendingClaims} icon={Clock} colorClass="text-warning" />
                        <StatCard label="Đã duyệt" value={stats.approvedClaims} icon={CheckCircle} colorClass="text-info" />
                        <StatCard label="Hoàn thành" value={stats.completedClaims} icon={CheckCircle} colorClass="text-success" />
                        <StatCard label="Từ chối" value={stats.rejectedClaims} icon={X} colorClass="text-error" />
                        <StatCard label="Tháng này" value={stats.claimsThisMonth} icon={Calendar} colorClass="text-secondary" />
                    </div>
                )}

                {/* Toolbar */}
                <div className="bg-base-100 rounded-xl border border-base-200 p-4">
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="flex-1 min-w-[200px]">
                            <label className="label py-1"><span className="label-text text-xs font-semibold">Tìm kiếm</span></label>
                            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                                placeholder="Mã phiếu, mã BH, mã đơn, tên, SĐT..."
                                className="input input-bordered w-full h-10 text-sm" />
                        </div>
                        <div className="min-w-[160px]">
                            <label className="label py-1"><span className="label-text text-xs font-semibold">Trạng thái</span></label>
                            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="select select-bordered w-full h-10 text-sm">
                                <option value="">Tất cả</option>
                                <option value="pending">Chờ xử lý</option>
                                <option value="approved">Duyệt đơn</option>
                                <option value="rejected">Từ chối</option>
                                <option value="completed">Hoàn thành</option>
                            </select>
                        </div>
                        <button onClick={handleSearch} className="btn btn-primary btn-sm gap-1 h-10"><Search className="w-4 h-4" /> Tìm</button>
                        <button onClick={() => { setSearch(''); setStatusFilter(''); loadClaims(1); }} className="btn btn-outline btn-sm gap-1 h-10"><RefreshCw className="w-4 h-4" /> Reset</button>
                        <button onClick={handleOpenLookup} className="btn btn-success gap-2 h-10 ml-auto"><Plus className="w-4 h-4" /> Tạo phiếu BH</button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-base-100 rounded-xl border border-base-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="table table-sm">
                            <thead>
                                <tr className="bg-base-200 text-xs uppercase">
                                    <th>Mã phiếu BH</th>
                                    <th>Sản phẩm</th>
                                    <th>Khách hàng</th>
                                    <th>Lý do</th>
                                    <th>Ngày tạo</th>
                                    <th>Trạng thái</th>
                                    <th className="text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={7} className="text-center py-12"><span className="loading loading-spinner loading-lg text-primary" /></td></tr>
                                ) : claims.length === 0 ? (
                                    <tr><td colSpan={7} className="text-center py-12">
                                        <div className="flex flex-col items-center gap-2 text-base-content/40">
                                            <Shield className="w-10 h-10" /><p className="text-sm">Chưa có phiếu bảo hành nào.</p>
                                        </div>
                                    </td></tr>
                                ) : (
                                    claims.map((c) => {
                                        const s = CLAIM_STATUS[c.claim?.status] || {};
                                        const IconCmp = s.icon || Clock;
                                        return (
                                            <tr key={c.claim?.claimCode} className="hover">
                                                <td>
                                                    <span className="font-mono text-xs font-semibold text-blue-700">{c.claim?.claimCode}</span>
                                                    <p className="text-[10px] text-base-content/40 font-mono mt-0.5">{c.warrantyCode}</p>
                                                </td>
                                                <td>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded border border-base-200 overflow-hidden shrink-0 bg-base-200 flex items-center justify-center">
                                                            {c.product?.image ? (
                                                                <img src={c.product.image} alt="" className="w-full h-full object-contain p-0.5" />
                                                            ) : (
                                                                <Package className="w-4 h-4 text-base-content/30" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium leading-tight truncate max-w-[160px]">{c.product?.name || '—'}</p>
                                                            <p className="text-[10px] text-base-content/40 font-mono">{c.product?.sku || '—'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <p className="text-sm">{c.customerName || '—'}</p>
                                                    <p className="text-[10px] text-base-content/40">{c.customerPhone || '—'}</p>
                                                </td>
                                                <td className="text-sm text-base-content/70 max-w-[140px] truncate">
                                                    {REASON_LABELS[c.claim?.reason] || c.claim?.reason || '—'}
                                                </td>
                                                <td className="text-sm text-base-content/70 whitespace-nowrap">{formatDate(c.claim?.createdAt)}</td>
                                                <td>
                                                    <span className={`badge ${s.badge} gap-1 border-0 text-xs`}>
                                                        <IconCmp className="w-3 h-3" /> {s.label}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            className="btn btn-xs btn-ghost btn-primary gap-1"
                                                            title="Chi tiết / Xử lý"
                                                            onClick={() => {
                                                                setSelectedClaim(c.claim);
                                                                setSelectedWarrantyId(c.warrantyId);
                                                                setSelectedDetailProduct(c.product);
                                                                setSelectedCustomer(c.customerName ? { name: c.customerName, phone: c.customerPhone } : null);
                                                                setSelectedOrderCode(c.orderCode);
                                                                setSelectedWarrantyEndDate(c.warrantyEndDate);
                                                                setSelectedPurchaseDate(c.purchaseDate);
                                                                setShowDetailModal(true);
                                                            }}
                                                        >
                                                            <Eye className="w-3 h-3" />
                                                        </button>
                                                        <button
                                                            className="btn btn-xs btn-ghost gap-1"
                                                            title="Sửa"
                                                            onClick={() => {
                                                                setSelectedClaim(c.claim);
                                                                setSelectedWarrantyId(c.warrantyId);
                                                                setSelectedDetailProduct(c.product);
                                                                setSelectedCustomer(c.customerName ? { name: c.customerName, phone: c.customerPhone } : null);
                                                                setSelectedOrderCode(c.orderCode);
                                                                setShowEditModal(true);
                                                            }}
                                                        >
                                                            <Edit className="w-3 h-3" />
                                                        </button>
                                                        <button
                                                            className="btn btn-xs btn-ghost text-error gap-1"
                                                            title="Xóa"
                                                            onClick={() => {
                                                                setSelectedClaim(c.claim);
                                                                setSelectedWarrantyId(c.warrantyId);
                                                                setShowDeleteModal(true);
                                                            }}
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pagination && pagination.totalPages > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-base-200 bg-base-100">
                            <p className="text-sm text-base-content/60">Trang {pagination.page} / {pagination.totalPages} — {pagination.total} phiếu</p>
                            <div className="flex items-center gap-1">
                                <button className="btn btn-sm btn-outline gap-1" disabled={page <= 1} onClick={() => goPage(page - 1)}><ChevronLeft className="w-4 h-4" /></button>
                                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => {
                                    const total = pagination.totalPages;
                                    let show = total <= 7 || Math.abs(p - page) <= 1 || p === 1 || p === total;
                                    if (!show) {
                                        if (p === 2 && page > 4) return <span key={p} className="btn btn-sm btn-ghost btn-circle">...</span>;
                                        if (p === total - 1 && page < total - 3) return <span key={p} className="btn btn-sm btn-ghost btn-circle">...</span>;
                                        return null;
                                    }
                                    return <button key={p} className={`btn btn-sm ${page === p ? 'btn-primary' : 'btn-outline'}`} onClick={() => goPage(p)}>{p}</button>;
                                })}
                                <button className="btn btn-sm btn-outline gap-1" disabled={page >= pagination.totalPages} onClick={() => goPage(page + 1)}><ChevronRight className="w-4 h-4" /></button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Hướng dẫn */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
                    <p className="font-semibold mb-1">Hướng dẫn</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-700 text-xs">
                        <li><strong>Chờ xử lý</strong> → kiểm tra → <strong>Duyệt đơn</strong> / <strong>Từ chối</strong> → <strong>Hoàn thành</strong>.</li>
                        <li>Phiếu được tạo khi khách thanh toán đơn hàng hoặc tạo thủ công tại đây.</li>
                        <li>Tìm kiếm: mã phiếu, mã BH, mã đơn, tên, SĐT khách hàng.</li>
                    </ul>
                </div>
            </div>

            {/* Modals */}
            {showLookupModal && (
                <LookupOrderModal
                    onClose={handleCloseAll} onSelectProduct={handleSelectProduct}
                    orderData={orderData} setOrderData={setOrderData}
                    lookupLoading={lookupLoading} setLookupLoading={setLookupLoading}
                    lookupError={lookupError} setLookupError={setLookupError}
                    orderCode={orderCode} setOrderCode={setOrderCode}
                    handleLookup={handleLookup} handleNew={handleNewLookup}
                />
            )}
            {showCreateModal && selectedProduct && (
                <CreateWarrantyFormModal
                    onClose={handleCloseAll} onSuccess={handleAfterAction}
                    selectedProduct={selectedProduct} orderData={orderData} loadStats={loadStats}
                />
            )}
            {showDetailModal && selectedClaim && (
                <ClaimDetailModal
                    claim={selectedClaim} warrantyId={selectedWarrantyId}
                    onClose={handleCloseAll} onUpdate={handleAfterAction}
                    product={selectedDetailProduct} customer={selectedCustomer}
                    orderCode={selectedOrderCode}
                    warrantyEndDate={selectedWarrantyEndDate}
                    purchaseDate={selectedPurchaseDate}
                />
            )}
            {showEditModal && selectedClaim && (
                <EditClaimModal
                    claim={selectedClaim} warrantyId={selectedWarrantyId}
                    onClose={handleCloseAll} onSuccess={handleAfterAction}
                    product={selectedDetailProduct} customer={selectedCustomer}
                    orderCode={selectedOrderCode}
                />
            )}
            {showDeleteModal && selectedClaim && (
                <DeleteConfirmModal
                    claim={selectedClaim} warrantyId={selectedWarrantyId}
                    onClose={handleCloseAll} onConfirm={handleAfterAction}
                />
            )}
        </div>
    );
}
