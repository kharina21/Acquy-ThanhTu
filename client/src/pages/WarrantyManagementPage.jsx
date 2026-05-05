import { useState, useEffect } from 'react';
import {
    getAllClaims,
    updateWarrantyClaim,
    deleteWarranty,
    getClaimStats,
    createWarrantyClaim,
    lookupWarrantyByOrderCode,
    getActiveLocations,
} from '@/services/warrantyService';
import { getProvinces, getDistricts, getWards } from '@/services/addressService';
import { useUserRole } from '@/hooks/useUserRole';
import { useBranchStore } from '@/stores/useBranchStore';
import { toast } from 'sonner';
import ModalPortal from '@/components/common/ModalPortal';
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
    Building2,
    Filter,
} from 'lucide-react';
import { FilterToolbar, FilterToolbarActions, FilterToolbarField } from '@/components/common/FilterToolbar';

// ── Helpers ────────────────────────────────────────────────────────────
const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('vi-VN');
};

const formatDateTime = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });
};

const formatVND = (n) => {
    if (n == null || Number.isNaN(Number(n))) return '—';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n));
};

// 4 trạng thái
const CLAIM_STATUS = {
    pending:   { label: 'Chờ xử lý', badge: 'badge-warning', icon: Clock },
    approved:  { label: 'Đã duyệt',  badge: 'badge-info',    icon: CheckCircle },
    rejected:  { label: 'Từ chối',   badge: 'badge-error',   icon: X },
    completed: { label: 'Hoàn thành', badge: 'badge-success', icon: CheckCircle },
};

const CLAIM_STATUS_META = {
    pending: { short: 'Chờ xử lý', badge: 'badge-warning' },
    approved: { short: 'Đã duyệt', badge: 'badge-info' },
    rejected: { short: 'Từ chối', badge: 'badge-error' },
    completed: { short: 'Hoàn thành', badge: 'badge-success' },
};

const REASON_LABELS = {
    product_damage: 'Sản phẩm bị hư hỏng',
    product_defect: 'Lỗi từ nhà sản xuất',
    battery_leak: 'Ắc quy bị chảy nước',
    charging_issue: 'Không sạc được / sạc yếu',
    other: 'Lý do khác',
};

// ── Status Progress ─────────────────────────────────────────────────────
function StatusProgress({ status }) {
    if (status === 'rejected') {
        return (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-error">
                <X className="w-3.5 h-3.5" /> Từ chối
            </span>
        );
    }
    const steps = [
        { key: 'pending', label: 'Tiếp nhận' },
        { key: 'approved', label: 'Đã duyệt' },
        { key: 'completed', label: 'Hoàn thành' },
    ];
    const order = ['pending', 'approved', 'completed'];
    const activeIndex = order.indexOf(status);

    return (
        <div className="flex items-center w-full max-w-[220px]">
            {steps.map((step, i) => {
                const done = i < activeIndex;
                const current = i === activeIndex;
                return (
                    <div key={step.key} className="flex items-center flex-1 min-w-0">
                        <div className="flex flex-col items-center w-full">
                            <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-colors
                                    ${current ? 'border-primary bg-primary text-primary-content' : ''}
                                    ${done ? 'border-primary bg-primary/15 text-primary' : ''}
                                    ${!done && !current ? 'border-base-300 bg-base-200 text-base-content/40' : ''}`}
                            >
                                {done ? '✓' : i + 1}
                            </div>
                            <span className={`text-[9px] mt-1 text-center leading-tight ${current ? 'font-semibold text-primary' : 'text-base-content/50'}`}>
                                {step.label}
                            </span>
                        </div>
                        {i < steps.length - 1 && (
                            <div className={`h-0.5 flex-1 min-w-[8px] mx-0.5 -mt-4 rounded ${i < activeIndex ? 'bg-primary' : 'bg-base-300'}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function ClaimStatusBadge({ status }) {
    const meta = CLAIM_STATUS_META[status] || CLAIM_STATUS_META.pending;
    return (
        <span className={`badge ${meta.badge} gap-1 border-0`}>
            {status === 'pending' && <Clock className="w-3 h-3" />}
            {status === 'approved' && <CheckCircle className="w-3 h-3" />}
            {status === 'rejected' && <X className="w-3 h-3" />}
            {status === 'completed' && <CheckCircle className="w-3 h-3" />}
            {meta.short}
        </span>
    );
}

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
function ClaimDetailModal({ claim, warrantyId, onClose, onUpdate, product, customer, orderCode, warrantyEndDate, purchaseDate, location }) {
    const [selectedClaim, setSelectedClaim] = useState(claim);
    const [claimNotes, setClaimNotes] = useState('');
    const [updating, setUpdating] = useState(false);

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
        <div className="modal modal-open" data-theme="light">
            <div className="modal-box max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-white text-base-content border border-base-200 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Shield className="w-5 h-5 text-primary" />
                        Chi tiết yêu cầu bảo hành
                    </h3>
                    <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <p className="text-sm text-base-content/60 mb-4">
                    Mã phiếu: <span className="font-mono font-semibold text-base-content">{selectedClaim?.claimCode}</span>
                    <span className="mx-2">|</span>
                    Mã BH: <span className="font-mono font-semibold text-base-content">{selectedClaim?.warrantyCode || warrantyId}</span>
                </p>

                <div className="space-y-4">
                    {/* Trạng thái */}
                    <div className="flex items-center gap-3">
                        <ClaimStatusBadge status={selectedClaim?.status} />
                        <StatusProgress status={selectedClaim?.status} />
                    </div>

                    {/* Cơ sở bảo hành */}
                    {location && (
                        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                            <p className="text-xs font-bold uppercase text-primary mb-2 flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5" /> Cơ sở bảo hành
                            </p>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Building2 className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="font-semibold text-base-content">{location.name || '—'}</p>
                                    {location.code && (
                                        <p className="text-sm text-base-content/60">{location.code}</p>
                                    )}
                                    {location.address && (
                                        <p className="text-xs text-base-content/50 flex items-center gap-1 mt-0.5">
                                            <MapPin className="w-3 h-3" /> {location.address}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Mã & thời gian */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-base-200 rounded-xl p-3">
                            <p className="text-xs text-base-content/50 mb-1">Mã yêu cầu</p>
                            <p className="font-mono font-semibold text-primary">{selectedClaim?.claimCode}</p>
                        </div>
                        <div className="bg-base-200 rounded-xl p-3">
                            <p className="text-xs text-base-content/50 mb-1">Mã hóa đơn</p>
                            <p className="font-mono font-semibold text-base-content">{orderCode || selectedClaim?.orderCode || '—'}</p>
                        </div>
                        <div className="bg-base-200 rounded-xl p-3">
                            <p className="text-xs text-base-content/50 mb-1">Ngày gửi yêu cầu</p>
                            <p className="font-medium text-base-content">{formatDateTime(selectedClaim?.createdAt)}</p>
                        </div>
                        <div className="bg-base-200 rounded-xl p-3">
                            <p className="text-xs text-base-content/50 mb-1">Ngày mua</p>
                            <p className="font-medium text-base-content">{formatDate(purchaseDate || selectedClaim?.purchaseDate)}</p>
                        </div>
                    </div>

                    {/* Sản phẩm */}
                    <div className="bg-base-200 rounded-xl p-4">
                        <p className="text-xs font-bold uppercase text-base-content/50 mb-2">Sản phẩm</p>
                        <div className="flex items-center gap-3">
                            {product?.image && (
                                <img
                                    src={product.image}
                                    alt={product.name}
                                    className="w-14 h-14 rounded-xl object-contain border border-base-300 bg-base-100"
                                />
                            )}
                            <div>
                                <p className="font-semibold text-base-content">{product?.name || selectedClaim?.product?.name || '—'}</p>
                                {product?.sku && <p className="text-xs text-base-content/60 font-mono">SKU: {product.sku}</p>}
                                <p className="text-xs text-base-content/60">BH đến: {formatDate(warrantyEndDate || selectedClaim?.warrantyEndDate)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Thông tin khách hàng */}
                    <div className="bg-base-200 rounded-xl p-4">
                        <p className="text-xs font-bold uppercase text-base-content/50 mb-2">Người yêu cầu BH</p>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <p className="text-xs text-base-content/50">Họ tên</p>
                                <p className="font-medium">{customer?.name || selectedClaim?.customerName || '—'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-base-content/50">Điện thoại</p>
                                <p className="font-medium">{customer?.phone || selectedClaim?.customerPhone || '—'}</p>
                            </div>
                            {selectedClaim?.customerAddress && (
                                <div className="col-span-2">
                                    <p className="text-xs text-base-content/50">Địa chỉ</p>
                                    <p className="font-medium">{selectedClaim.customerAddress}</p>
                                </div>
                            )}
                            {selectedClaim?.notes && (
                                <div className="col-span-2">
                                    <p className="text-xs text-base-content/50">Ghi chú</p>
                                    <p className="font-medium">{selectedClaim.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Lý do & mô tả */}
                    <div className="bg-base-200 rounded-xl p-4">
                        <p className="text-xs font-bold uppercase text-base-content/50 mb-2">Lý do & Mô tả</p>
                        <div className="space-y-2 text-sm">
                            <div>
                                <p className="text-xs text-base-content/50">Lý do</p>
                                <p className="font-semibold text-error">
                                    {REASON_LABELS[selectedClaim?.reason] || selectedClaim?.reason}
                                </p>
                            </div>
                            {selectedClaim?.description && (
                                <div>
                                    <p className="text-xs text-base-content/50">Mô tả chi tiết</p>
                                    <p className="text-base-content">{selectedClaim.description}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Ghi chú xử lý */}
                    {selectedClaim?.resolutionNotes && (
                        <div className="bg-success/5 border border-success/20 rounded-xl p-4">
                            <p className="text-xs font-bold uppercase text-success mb-1">Ghi chú xử lý</p>
                            <p className="text-sm text-success">{selectedClaim.resolutionNotes}</p>
                            {selectedClaim?.resolvedAt && (
                                <p className="text-xs text-success/70 mt-1">
                                    Xử lý lúc: {formatDateTime(selectedClaim.resolvedAt)}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Xử lý phiếu */}
                    {(selectedClaim?.status === 'pending' || selectedClaim?.status === 'approved') && (
                        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
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
                                        <button className="btn btn-sm btn-info gap-1" disabled={updating} onClick={() => handleUpdateClaim('approved')}>
                                            <CheckCircle className="w-3 h-3" /> Duyệt đơn
                                        </button>
                                        <button className="btn btn-sm btn-error btn-outline gap-1" disabled={updating} onClick={() => handleUpdateClaim('rejected')}>
                                            <X className="w-3 h-3" /> Từ chối
                                        </button>
                                    </>
                                )}
                                <button className="btn btn-sm btn-success gap-1" disabled={updating} onClick={() => handleUpdateClaim('completed')}>
                                    <CheckCircle className="w-3 h-3" /> Hoàn thành
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-action">
                    <button className="btn btn-ghost btn-sm" onClick={onClose}>Đóng</button>
                </div>
            </div>
            <form method="dialog" className="modal-backdrop">
                <button onClick={onClose}>close</button>
            </form>
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
        <div className="modal modal-open" data-theme="light">
            <div className="modal-box max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-white text-base-content border border-base-200 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Edit className="w-5 h-5 text-primary" />
                        Sửa phiếu bảo hành
                    </h3>
                    <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
                        <X className="w-5 h-5" />
                    </button>
                </div>

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
                                    className={`px-3 py-2.5 rounded-xl text-sm font-medium border-2 text-left transition-all ${form.reason === val ? 'border-primary bg-primary/10 text-primary' : 'border-base-300 text-base-content/70 hover:border-primary/30'}`}>
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
            <form method="dialog" className="modal-backdrop">
                <button onClick={onClose}>close</button>
            </form>
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
        <div className="modal modal-open" data-theme="light">
            <div className="modal-box max-w-sm w-full bg-white text-base-content border border-base-200 shadow-2xl">
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
            <form method="dialog" className="modal-backdrop">
                <button onClick={onClose}>close</button>
            </form>
        </div>
    );
}

// ── Modal: Tra cứu hóa đơn ─────────────────────────────────────────────
function LookupOrderModal({ onClose, onSelectProduct, orderData, setOrderData, lookupLoading, setLookupLoading, lookupError, setLookupError, orderCode, setOrderCode, handleLookup, handleNew }) {
    return (
        <div className="modal modal-open" data-theme="light">
            <div className="modal-box max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-white text-base-content border border-base-200 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Search className="w-5 h-5 text-primary" />
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
                                        className="w-full flex items-center gap-3 p-4 hover:bg-primary/5 transition-colors text-left"
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
                                            {w.warrantyText && <p className="text-xs text-primary mt-0.5">BH: {w.warrantyText}</p>}
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
                    <button className="btn btn-ghost btn-sm" onClick={onClose}>Đóng</button>
                </div>
            </div>
            <form method="dialog" className="modal-backdrop">
                <button onClick={onClose}>close</button>
            </form>
        </div>
    );
}

// ── Modal: Tạo phiếu BH ──────────────────────────────────────────────
function CreateWarrantyFormModal({ onClose, onSuccess, selectedProduct, orderData, loadStats, isAdmin, allLocations, currentLocationId }) {
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [result, setResult] = useState(null);

    const [provinces, setProvinces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [wards, setWards] = useState([]);
    const [loadingAddress, setLoadingAddress] = useState(false);

    // Chọn cơ sở bảo hành
    const [selectedLocationId, setSelectedLocationId] = useState(
        !isAdmin && currentLocationId ? currentLocationId : ''
    );

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
        // Validate cơ sở bảo hành
        if (isAdmin && !selectedLocationId) {
            toast.error('Vui lòng chọn cơ sở bảo hành.');
            return;
        }

        setSubmitting(true);
        try {
            const productId = selectedProduct.product?._id || selectedProduct.productId;
            const payload = {
                orderCode: orderData.order.code,
                productId,
                reason: form.reason,
                description: form.description,
                customerName: form.customerName.trim(),
                customerPhone: form.customerPhone.trim(),
                customerEmail: form.customerEmail.trim(),
                customerAddress: buildAddress(),
                notes: form.notes.trim(),
            };
            // Thêm locationId nếu là admin
            if (isAdmin && selectedLocationId) {
                payload.locationId = selectedLocationId;
            }

            const res = await createWarrantyClaim(payload);
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
            <div className="modal modal-open" data-theme="light">
                <div className="modal-box max-w-md w-full text-center bg-white text-base-content border border-base-200 shadow-2xl">
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
                <form method="dialog" className="modal-backdrop">
                    <button onClick={handleClose}>close</button>
                </form>
            </div>
        );
    }

    return (
        <div className="modal modal-open" data-theme="light">
            <div className="modal-box max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-white text-base-content border border-base-200 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2"><Plus className="w-5 h-5 text-primary" />Tạo phiếu bảo hành</h3>
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
                        <p className="text-xs text-primary">{selectedProduct?.warrantyText || `BH ${selectedProduct?.warrantyMonths} tháng`}</p>
                    </div>
                    <span className="badge badge-ghost text-xs font-mono">{orderData?.order?.code}</span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Chọn cơ sở bảo hành */}
                    {(isAdmin || allLocations.length > 1) && (
                        <div>
                            <label className="label py-1">
                                <span className="label-text text-xs font-semibold flex items-center gap-1">
                                    <Building2 className="w-3 h-3" />
                                    Cơ sở bảo hành <span className="text-red-500">*</span>
                                </span>
                            </label>
                            <select
                                value={selectedLocationId}
                                onChange={(e) => setSelectedLocationId(e.target.value)}
                                className="select select-bordered w-full h-10 text-sm"
                                required
                            >
                                <option value="">-- Chọn cơ sở bảo hành --</option>
                                {allLocations.map((loc) => (
                                    <option key={loc._id} value={loc._id}>
                                        {loc.code} - {loc.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="label py-1"><span className="label-text text-xs font-semibold flex items-center gap-1"><FileText className="w-3 h-3" />Lý do BH <span className="text-red-500">*</span></span></label>
                        <div className="grid grid-cols-2 gap-2">
                            {Object.entries(REASON_LABELS).map(([val, label]) => (
                                <button key={val} type="button" onClick={() => setForm((f) => ({ ...f, reason: val }))}
                                    className={`px-3 py-2.5 rounded-xl text-sm font-medium border-2 text-left transition-all ${form.reason === val ? 'border-primary bg-primary/10 text-primary' : 'border-base-300 text-base-content/70 hover:border-primary/30'}`}>
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
                        {buildAddress() && <div className="bg-primary/5 border border-primary/20 rounded-lg p-2 text-xs text-primary"><span className="font-medium">Địa chỉ: </span>{buildAddress()}</div>}
                    </div>

                    <div><label className="label py-1"><span className="label-text text-xs flex items-center gap-1"><Phone className="w-3 h-3" />Ghi chú thêm</span></label>
                        <input type="text" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="input input-bordered w-full h-10 text-sm" /></div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" className="btn btn-outline flex-1" onClick={onClose}>Hủy</button>
                        <button type="submit" className="btn btn-primary flex-1 gap-2" disabled={submitting || !form.reason || !form.customerName.trim() || !form.customerPhone.trim() || (isAdmin && !selectedLocationId)}>
                            {submitting ? <><span className="loading loading-spinner loading-xs" /> Đang tạo...</> : <><Plus className="w-4 h-4" />Tạo phiếu BH</>}
                        </button>
                    </div>
                </form>
            </div>
            <form method="dialog" className="modal-backdrop">
                <button onClick={onClose}>close</button>
            </form>
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────
export default function WarrantyManagementPage() {
    const { isAdmin, isManager, isSeller } = useUserRole();
    const { currentLocationId, locations, fetchLocations } = useBranchStore();
    const [claims, setClaims] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState(null);

    // Filters
    const [filters, setFilters] = useState({ search: '', status: '', locationId: '' });
    const [appliedFilters, setAppliedFilters] = useState({ search: '', status: '', locationId: '' });
    const [allLocations, setAllLocations] = useState([]);

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
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [orderData, setOrderData] = useState(null);
    const [orderCode, setOrderCode] = useState('');
    const [lookupLoading, setLookupLoading] = useState(false);
    const [lookupError, setLookupError] = useState('');

    // Load locations dựa trên quyền
    useEffect(() => {
        if (isAdmin) {
            getActiveLocations().then((res) => {
                if (res?.success) setAllLocations(res.data?.locations || []);
            }).catch(() => {});
            fetchLocations();
        } else {
            fetchLocations({ scope: 'mine' });
        }
    }, [isAdmin]);

    useEffect(() => {
        if (!isAdmin && locations.length > 0) {
            setAllLocations(locations);
        }
    }, [locations, isAdmin]);

    const fetchClaims = async () => {
        setLoading(true);
        try {
            const params = { page: pagination.page, limit: pagination.limit };
            if (appliedFilters.search?.trim()) params.search = appliedFilters.search.trim();
            if (appliedFilters.status) params.claimStatus = appliedFilters.status;
            if (appliedFilters.locationId) {
                params.locationId = appliedFilters.locationId;
            } else if (!isAdmin && currentLocationId && currentLocationId !== 'all') {
                params.locationId = currentLocationId;
            }

            const res = await getAllClaims(params);
            const data = res?.data;
            setClaims(data?.claims || []);
            const pag = data?.pagination || {};
            setPagination((p) => ({
                ...p,
                page: pag.page ?? p.page,
                total: pag.total ?? p.total,
                totalPages: Math.max(1, pag.totalPages ?? p.totalPages),
            }));
        } catch {
            toast.error('Lỗi khi tải danh sách phiếu bảo hành.');
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const params = {};
            if (appliedFilters.locationId) {
                params.locationId = appliedFilters.locationId;
            } else if (!isAdmin && currentLocationId && currentLocationId !== 'all') {
                params.locationId = currentLocationId;
            }
            const res = await getClaimStats(params);
            if (res?.success) setStats(res.data);
        } catch { /* silent */ }
    };

    useEffect(() => {
        fetchClaims();
        loadStats();
    }, [pagination.page, appliedFilters, currentLocationId]);

    const applyFilters = () => {
        setAppliedFilters({ ...filters });
        setPagination((p) => ({ ...p, page: 1 }));
    };

    const clearFilters = () => {
        setFilters({ search: '', status: '', locationId: '' });
        setAppliedFilters({ search: '', status: '', locationId: '' });
        setPagination((p) => ({ ...p, page: 1 }));
    };

    const handleAfterAction = () => { fetchClaims(); loadStats(); };

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
        setSelectedLocation(null);
        setOrderData(null); setOrderCode('');
        setSelectedClaim(null); setSelectedWarrantyId(null);
    };

    return (
        <div className="bg-base-200 flex flex-col min-h-full">
            {/* Header */}
            <div className="bg-base-100 border-b border-base-200 px-6 py-4 shrink-0 sticky top-0 z-10">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            <Shield className="w-6 h-6 text-blue-700" /> Quản lý bảo hành
                        </h1>
                        <p className="text-sm text-base-content/60 mt-0.5">Danh sách phiếu yêu cầu bảo hành</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => { handleNewLookup(); setShowLookupModal(true); }} className="btn btn-primary btn-sm gap-1">
                            <Plus className="w-4 h-4" /> Tạo phiếu BH
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <StatCard label="Tổng phiếu" value={stats?.totalClaims ?? 0} icon={FileText} colorClass="text-primary" />
                    <StatCard label="Chờ xử lý" value={stats?.pendingClaims ?? 0} icon={Clock} colorClass="text-warning" />
                    <StatCard label="Đã duyệt" value={stats?.approvedClaims ?? 0} icon={CheckCircle} colorClass="text-info" />
                    <StatCard label="Hoàn thành" value={stats?.completedClaims ?? 0} icon={CheckCircle} colorClass="text-success" />
                    <StatCard label="Từ chối" value={stats?.rejectedClaims ?? 0} icon={X} colorClass="text-error" />
                    <StatCard label="Tháng này" value={stats?.claimsThisMonth ?? 0} icon={Calendar} colorClass="text-secondary" />
                </div>

                {/* Bộ lọc */}
                <div className="bg-base-100 rounded-xl border border-base-200 shadow-sm overflow-hidden">
                    <div className="bg-base-200 px-4 py-3 border-b border-base-200 flex items-center gap-2">
                        <Filter className="w-4 h-4 text-base-content/60" />
                        <span className="text-sm font-semibold text-base-content">Bộ lọc</span>
                        {(filters.search || filters.status || filters.locationId || filters.reason) && (
                            <button onClick={clearFilters} className="ml-auto text-xs text-error hover:underline">
                                Xóa bộ lọc
                            </button>
                        )}
                    </div>
                    <div className="p-4">
                        <FilterToolbar>
                            <FilterToolbarField label="Tìm kiếm" className="min-w-[180px] flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/40" />
                                    <input
                                        type="text"
                                        value={filters.search}
                                        onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                                        onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                                        placeholder="Mã BH, mã YC, tên, SĐT..."
                                        className="input input-bordered input-sm w-full pl-9"
                                    />
                                </div>
                            </FilterToolbarField>
                            <FilterToolbarField label="Trạng thái" className="w-40">
                                <select
                                    value={filters.status}
                                    onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                                    className="select select-bordered select-sm w-full"
                                >
                                    <option value="">Tất cả</option>
                                    <option value="pending">Chờ xử lý</option>
                                    <option value="approved">Đã duyệt</option>
                                    <option value="rejected">Từ chối</option>
                                    <option value="completed">Hoàn thành</option>
                                </select>
                            </FilterToolbarField>
                            <FilterToolbarField label="Cơ sở BH" className="w-48">
                                <select
                                    value={filters.locationId}
                                    onChange={(e) => setFilters((f) => ({ ...f, locationId: e.target.value }))}
                                    className="select select-bordered select-sm w-full"
                                    disabled={!isAdmin && locations.length <= 1}
                                >
                                    <option value="">
                                        {!isAdmin && locations.length === 1 ? `${locations[0]?.name || locations[0]?.code || 'Cơ sở của bạn'}` : 'Tất cả cơ sở'}
                                    </option>
                                    {allLocations.map((loc) => (
                                        <option key={loc._id} value={loc._id}>
                                            {loc.code} - {loc.name}
                                        </option>
                                    ))}
                                </select>
                            </FilterToolbarField>
                            <FilterToolbarActions>
                                <button type="button" onClick={applyFilters} className="btn btn-primary btn-sm">
                                    Lọc
                                </button>
                            </FilterToolbarActions>
                        </FilterToolbar>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-base-100 rounded-xl border border-base-200 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-20 text-base-content/40">
                            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Đang tải...
                        </div>
                    ) : claims.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-base-content/40">
                            <Shield className="w-12 h-12 mb-3 opacity-30" />
                            <p className="font-medium">Không có yêu cầu bảo hành nào</p>
                            {(filters.search || filters.status || filters.locationId || filters.reason) && (
                                <button onClick={clearFilters} className="text-primary text-sm mt-2 hover:underline">
                                    Xóa bộ lọc
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            <table className="table w-full">
                                <thead>
                                    <tr className="bg-base-200 border-b border-base-200">
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-base-content/70 uppercase tracking-wide">Yêu cầu BH</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-base-content/70 uppercase tracking-wide">Sản phẩm</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-base-content/70 uppercase tracking-wide">Khách hàng</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-base-content/70 uppercase tracking-wide">Cơ sở</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-base-content/70 uppercase tracking-wide">Ngày gửi</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-base-content/70 uppercase tracking-wide">Trạng thái</th>
                                        <th className="text-right px-4 py-3 text-xs font-semibold text-base-content/70 uppercase tracking-wide">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-base-200">
                                    {claims.map((c) => {
                                        const s = CLAIM_STATUS[c.claim?.status] || {};
                                        const IconCmp = s.icon || Clock;
                                        return (
                                            <tr key={c.claim?.claimCode} className="hover:bg-base-200/50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="space-y-0.5">
                                                        <p className="font-mono text-sm font-semibold text-primary">
                                                            {c.claim?.claimCode}
                                                        </p>
                                                        <p className="text-xs text-base-content/50">
                                                            BH: {c.warrantyCode}
                                                        </p>
                                                        <p className="text-xs text-base-content/60 font-mono">
                                                            {c.orderCode}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        {c.product?.image && (
                                                            <img
                                                                src={c.product.image}
                                                                alt={c.product.name}
                                                                className="w-8 h-8 rounded-lg object-contain border border-base-200 bg-base-200"
                                                            />
                                                        )}
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-base-content truncate max-w-[180px]">
                                                                {c.product?.name || '—'}
                                                            </p>
                                                            {c.product?.sku && (
                                                                <p className="text-xs text-base-content/50 font-mono">{c.product.sku}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="space-y-0.5">
                                                        <p className="text-sm font-medium text-base-content">{c.customerName || c.claim?.customerName || '—'}</p>
                                                        <p className="text-xs text-base-content/60 flex items-center gap-1">
                                                            <Phone className="w-3 h-3" />
                                                            {c.customerPhone || c.claim?.customerPhone || '—'}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {c.location ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <Building2 className="w-3.5 h-3.5 text-base-content/40 shrink-0" />
                                                            <div>
                                                                <p className="text-sm font-medium text-base-content">{c.location.name || '—'}</p>
                                                                {c.location.code && (
                                                                    <p className="text-xs text-base-content/50">{c.location.code}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-base-content/40">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="text-sm text-base-content">{formatDate(c.claim?.createdAt)}</p>
                                                    <p className="text-xs text-base-content/50">{formatDateTime(c.claim?.createdAt).split(',')[1]?.trim() || ''}</p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <ClaimStatusBadge status={c.claim?.status} />
                                                    <div className="mt-1.5">
                                                        <StatusProgress status={c.claim?.status} />
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            className="btn btn-ghost btn-sm"
                                                            title="Chi tiết / Xử lý"
                                                            onClick={() => {
                                                                setSelectedClaim(c.claim);
                                                                setSelectedWarrantyId(c.warrantyId);
                                                                setSelectedDetailProduct(c.product);
                                                                setSelectedCustomer(c.customerName ? { name: c.customerName, phone: c.customerPhone } : null);
                                                                setSelectedOrderCode(c.orderCode);
                                                                setSelectedWarrantyEndDate(c.warrantyEndDate);
                                                                setSelectedPurchaseDate(c.purchaseDate);
                                                                setSelectedLocation(c.location);
                                                                setShowDetailModal(true);
                                                            }}
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            className="btn btn-ghost btn-sm"
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
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            className="btn btn-ghost btn-sm text-error"
                                                            title="Xóa"
                                                            onClick={() => {
                                                                setSelectedClaim(c.claim);
                                                                setSelectedWarrantyId(c.warrantyId);
                                                                setShowDeleteModal(true);
                                                            }}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {/* Pagination - 10 items per page */}
                            {pagination.totalPages > 1 && (
                                <div className="flex items-center justify-between px-4 py-3 border-t border-base-200 bg-base-200">
                                    <p className="text-xs text-base-content/60">
                                        Hiển thị {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} trong {pagination.total} yêu cầu
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                                            disabled={pagination.page <= 1}
                                            className="btn btn-ghost btn-sm"
                                        >
                                            ←
                                        </button>
                                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                            const page = pagination.page <= 3
                                                ? i + 1
                                                : pagination.page >= pagination.totalPages - 2
                                                  ? pagination.totalPages - 4 + i
                                                  : pagination.page - 2 + i;
                                            if (page < 1 || page > pagination.totalPages) return null;
                                            return (
                                                <button
                                                    key={page}
                                                    onClick={() => setPagination((p) => ({ ...p, page }))}
                                                    className={`btn btn-sm ${page === pagination.page ? 'btn-primary' : 'btn-ghost'}`}
                                                >
                                                    {page}
                                                </button>
                                            );
                                        })}
                                        <button
                                            onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                                            disabled={pagination.page >= pagination.totalPages}
                                            className="btn btn-ghost btn-sm"
                                        >
                                            →
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Hướng dẫn */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
                    <p className="font-semibold mb-1">Hướng dẫn</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-700 text-xs">
                        <li><strong>Chờ xử lý</strong> → kiểm tra → <strong>Duyệt đơn</strong> / <strong>Từ chối</strong> → <strong>Hoàn thành</strong>.</li>
                        <li>Phiếu được tạo khi khách thanh toán đơn hàng hoặc tạo thủ công tại đây.</li>
                        <li>Tìm kiếm: mã phiếu, mã BH, mã đơn, tên, SĐT khách hàng.</li>
                        <li>Admin có thể chọn cơ sở bảo hành khi tạo phiếu mới.</li>
                    </ul>
                </div>
            </div>

            {/* Modals — portal ra body để overlay không bị cắt bởi layout overflow */}
            {showLookupModal && (
                <ModalPortal>
                    <LookupOrderModal
                        onClose={handleCloseAll} onSelectProduct={handleSelectProduct}
                        orderData={orderData} setOrderData={setOrderData}
                        lookupLoading={lookupLoading} setLookupLoading={setLookupLoading}
                        lookupError={lookupError} setLookupError={setLookupError}
                        orderCode={orderCode} setOrderCode={setOrderCode}
                        handleLookup={handleLookup} handleNew={handleNewLookup}
                    />
                </ModalPortal>
            )}
            {showCreateModal && selectedProduct && (
                <ModalPortal>
                    <CreateWarrantyFormModal
                        onClose={handleCloseAll} onSuccess={handleAfterAction}
                        selectedProduct={selectedProduct} orderData={orderData} loadStats={loadStats}
                        isAdmin={isAdmin} isManager={isManager} allLocations={allLocations} currentLocationId={currentLocationId}
                    />
                </ModalPortal>
            )}
            {showDetailModal && selectedClaim && (
                <ModalPortal>
                    <ClaimDetailModal
                        claim={selectedClaim} warrantyId={selectedWarrantyId}
                        onClose={handleCloseAll} onUpdate={handleAfterAction}
                        product={selectedDetailProduct} customer={selectedCustomer}
                        orderCode={selectedOrderCode}
                        warrantyEndDate={selectedWarrantyEndDate}
                        purchaseDate={selectedPurchaseDate}
                    />
                </ModalPortal>
            )}
            {showEditModal && selectedClaim && (
                <ModalPortal>
                    <EditClaimModal
                        claim={selectedClaim} warrantyId={selectedWarrantyId}
                        onClose={handleCloseAll} onSuccess={handleAfterAction}
                        product={selectedDetailProduct} customer={selectedCustomer}
                        orderCode={selectedOrderCode}
                    />
                </ModalPortal>
            )}
            {showDeleteModal && selectedClaim && (
                <ModalPortal>
                    <DeleteConfirmModal
                        claim={selectedClaim} warrantyId={selectedWarrantyId}
                        onClose={handleCloseAll} onConfirm={handleAfterAction}
                    />
                </ModalPortal>
            )}
        </div>
    );
}
