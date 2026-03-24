import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { getBatteryTradeInList, updateBatteryTradeInStatus } from '@/services/batteryTradeInService';
import { getProducts } from '@/services/productService';
import { getActiveLocations } from '@/services/locationService';
import { toast } from 'sonner';
import {
    RotateCw,
    ChevronDown,
    ChevronUp,
    Phone,
    Mail,
    MapPin,
    Package,
    Calendar,
    LayoutDashboard,
    X,
} from 'lucide-react';

const STATUS_META = {
    pending: { short: 'Tiếp nhận', badge: 'badge-warning', desc: 'Đang xử lý' },
    contacted: { short: 'Đã hẹn', badge: 'badge-info', desc: 'Chờ khách mang acquy' },
    completed: { short: 'Hoàn tất', badge: 'badge-success', desc: 'Đã thu mua' },
    cancelled: { short: 'Đã hủy', badge: 'badge-neutral', desc: 'Từ chối' },
};

const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('vi-VN');
};

const formatVND = (n) => {
    if (n == null || n === '' || Number.isNaN(Number(n))) return '—';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n));
};

/** Thanh tiến trình 3 bước (hoặc nhánh hủy) */
function StatusProgress({ status }) {
    if (status === 'cancelled') {
        return (
            <div className="flex items-center gap-2">
                <span className="badge badge-error gap-1 border-0 font-medium">Đã từ chối / Hủy</span>
            </div>
        );
    }
    const steps = [
        { key: 'pending', label: 'Tiếp nhận' },
        { key: 'contacted', label: 'Đã liên hệ' },
        { key: 'completed', label: 'Hoàn tất' },
    ];
    const activeIndex = steps.findIndex((s) => s.key === status);

    return (
        <div className="flex items-center w-full max-w-[280px] sm:max-w-xs">
            {steps.map((step, i) => {
                const done = i < activeIndex;
                const current = i === activeIndex;
                return (
                    <div key={step.key} className="flex items-center flex-1 min-w-0">
                        <div className="flex flex-col items-center w-full">
                            <div
                                className={`
                                    w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-colors
                                    ${current ? 'border-primary bg-primary text-primary-content shadow-sm' : ''}
                                    ${done ? 'border-primary bg-primary/15 text-primary' : ''}
                                    ${!done && !current ? 'border-base-300 bg-base-200 text-base-content/40' : ''}
                                `}
                            >
                                {done ? '✓' : i + 1}
                            </div>
                            <span
                                className={`text-[10px] mt-1 text-center leading-tight px-0.5 ${
                                    current ? 'font-semibold text-primary' : 'text-base-content/50'
                                }`}
                            >
                                {step.label}
                            </span>
                        </div>
                        {i < steps.length - 1 && (
                            <div
                                className={`h-0.5 flex-1 min-w-[8px] mx-0.5 -mt-4 rounded ${
                                    i < activeIndex ? 'bg-primary' : 'bg-base-300'
                                }`}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default function AdminBatteryTradeInPage() {
    const [requests, setRequests] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ status: '', search: '' });
    const [appliedSearch, setAppliedSearch] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const [updatingId, setUpdatingId] = useState(null);

    const [products, setProducts] = useState([]);
    const [locations, setLocations] = useState([]);

    const [completeOpen, setCompleteOpen] = useState(false);
    const [completeForId, setCompleteForId] = useState(null);
    const [completeForm, setCompleteForm] = useState({
        locationId: '',
        completedProductId: '',
        completedAmount: '',
        completedNote: '',
    });

    const [cancelOpen, setCancelOpen] = useState(false);
    const [cancelForId, setCancelForId] = useState(null);
    const [cancelReason, setCancelReason] = useState('');

    useEffect(() => {
        getProducts({ limit: 500, page: 1 })
            .then((res) => setProducts(res?.data?.products || []))
            .catch(() => setProducts([]));
        getActiveLocations()
            .then((res) => setLocations(res?.data?.locations || []))
            .catch(() => setLocations([]));
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const params = { page: pagination.page, limit: pagination.limit };
            if (filters.status) params.status = filters.status;
            if (appliedSearch?.trim()) params.search = appliedSearch.trim();
            const res = await getBatteryTradeInList(params);
            const data = res?.data;
            const pag = data?.pagination || {};
            setRequests(data?.requests || []);
            setPagination((p) => ({
                ...p,
                page: pag.page ?? p.page,
                total: pag.total ?? p.total,
                totalPages: Math.max(1, pag.totalPages ?? p.totalPages),
            }));
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Lỗi khi tải danh sách');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, [pagination.page, filters.status, appliedSearch]);

    const handleSimpleStatus = async (id, payload) => {
        setUpdatingId(id);
        try {
            await updateBatteryTradeInStatus(id, payload);
            toast.success('Cập nhật thành công');
            fetchRequests();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Lỗi khi cập nhật');
        } finally {
            setUpdatingId(null);
        }
    };

    const openComplete = (req) => {
        setCompleteForId(req._id);
        setCompleteForm({
            locationId: locations[0]?._id || '',
            completedProductId: '',
            completedAmount: '',
            completedNote: '',
        });
        setCompleteOpen(true);
    };

    const submitComplete = async () => {
        if (!completeForId) return;
        const { locationId, completedProductId, completedAmount, completedNote } = completeForm;
        if (!locationId || !completedProductId || !completedAmount) {
            toast.error('Vui lòng chọn chi nhánh, sản phẩm và nhập số tiền thu mua');
            return;
        }
        const amt = Number(String(completedAmount).replace(/\D/g, ''));
        if (!Number.isFinite(amt) || amt <= 0) {
            toast.error('Số tiền phải lớn hơn 0');
            return;
        }
        setUpdatingId(completeForId);
        try {
            await updateBatteryTradeInStatus(completeForId, {
                status: 'completed',
                locationId,
                completedProductId,
                completedAmount: amt,
                completedNote: completedNote?.trim() || '',
            });
            toast.success('Đã hoàn thành thu mua');
            setCompleteOpen(false);
            setCompleteForId(null);
            fetchRequests();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Lỗi khi cập nhật');
        } finally {
            setUpdatingId(null);
        }
    };

    const openCancel = (id) => {
        setCancelForId(id);
        setCancelReason('');
        setCancelOpen(true);
    };

    const submitCancel = async () => {
        if (!cancelForId) return;
        setUpdatingId(cancelForId);
        try {
            await updateBatteryTradeInStatus(cancelForId, {
                status: 'cancelled',
                cancelledReason: cancelReason.trim(),
            });
            toast.success('Đã từ chối yêu cầu');
            setCancelOpen(false);
            setCancelForId(null);
            fetchRequests();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Lỗi khi cập nhật');
        } finally {
            setUpdatingId(null);
        }
    };

    const toggleExpand = (id) => {
        setExpandedId((prev) => (prev === id ? null : id));
    };

    return (
        <div className="flex-1 p-4 sm:p-6 bg-base-200 min-h-full overflow-y-auto">
            <div className="max-w-5xl mx-auto space-y-5">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-accent/20 to-primary/10 text-primary shadow-sm border border-base-200">
                            <RotateCw className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-base-content tracking-tight">Thu cũ đổi mới</h1>
                            <p className="text-sm text-base-content/60 mt-0.5">Tiếp nhận và xử lý yêu cầu thu acquy</p>
                        </div>
                    </div>
                    <Link
                        to="/admin"
                        className="btn btn-ghost btn-sm gap-2 self-start sm:self-center border border-base-300"
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        Tổng quan
                    </Link>
                </div>

                {/* Bộ lọc */}
                <div className="card bg-base-100 border border-base-200 shadow-sm">
                    <div className="card-body p-4 flex flex-col sm:flex-row flex-wrap gap-3">
                        <div className="form-control flex-1 min-w-[200px]">
                            <label className="label py-1">
                                <span className="label-text text-xs font-medium text-base-content/70">Trạng thái</span>
                            </label>
                            <select
                                className="select select-bordered select-sm w-full"
                                value={filters.status}
                                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                            >
                                <option value="">Tất cả</option>
                                {Object.entries(STATUS_META).map(([v, m]) => (
                                    <option key={v} value={v}>{m.desc}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-control flex-1 min-w-[200px]">
                            <label className="label py-1">
                                <span className="label-text text-xs font-medium text-base-content/70">Tìm kiếm</span>
                            </label>
                            <div className="join w-full">
                                <input
                                    type="text"
                                    placeholder="Tên, SĐT, email..."
                                    className="input input-bordered input-sm join-item flex-1 min-w-0"
                                    value={filters.search}
                                    onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                                    onKeyDown={(e) => e.key === 'Enter' && setAppliedSearch(filters.search)}
                                />
                                <button
                                    type="button"
                                    className="btn btn-primary btn-sm join-item px-4"
                                    onClick={() => setAppliedSearch(filters.search)}
                                >
                                    Tìm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Danh sách */}
                <div className="space-y-3">
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <span className="loading loading-spinner loading-lg text-primary" />
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="card bg-base-100 border border-dashed border-base-300">
                            <div className="card-body items-center text-center py-16 text-base-content/60">
                                <Package className="w-12 h-12 opacity-40 mb-2" />
                                <p>Chưa có yêu cầu nào</p>
                            </div>
                        </div>
                    ) : (
                        requests.map((req) => {
                            const isExpanded = expandedId === req._id;
                            const batteryDisplay = req.productId?.name || req.batteryName || '—';
                            const pricingDisplay =
                                req.pricingType === 'weight'
                                    ? `${req.weightKg || '—'} kg`
                                    : `${req.remainingAmps || '—'} Ah`;
                            const meta = STATUS_META[req.status] || STATUS_META.pending;

                            return (
                                <div
                                    key={req._id}
                                    className="card bg-base-100 border border-base-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                                >
                                    <div className="card-body p-0">
                                        <button
                                            type="button"
                                            className="w-full text-left p-4 sm:p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6"
                                            onClick={() => toggleExpand(req._id)}
                                        >
                                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                                <span className="mt-1 text-base-content/50 shrink-0">
                                                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                                </span>
                                                <div className="avatar placeholder shrink-0">
                                                    <div className="bg-primary/15 text-primary rounded-xl w-11 h-11 text-sm font-bold">
                                                        {(req.name || '?')[0].toUpperCase()}
                                                    </div>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-semibold text-base truncate">{req.name}</p>
                                                    <p className="text-sm text-base-content/60 truncate">
                                                        {req.phone} · {req.email}
                                                    </p>
                                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                                        <span className="badge badge-sm badge-ghost font-normal">{batteryDisplay}</span>
                                                        <span className="badge badge-sm badge-ghost font-normal">×{req.quantity ?? 1}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col sm:items-end gap-3 sm:min-w-[200px] pl-10 sm:pl-0">
                                                <div className="hidden sm:block w-full">
                                                    <StatusProgress status={req.status} />
                                                </div>
                                                <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                                                    <span className={`badge ${meta.badge} border-0 font-medium sm:hidden`}>
                                                        {meta.short}
                                                    </span>
                                                    <span className="text-xs text-base-content/50 whitespace-nowrap">
                                                        {formatDate(req.createdAt)}
                                                    </span>
                                                </div>
                                            </div>
                                        </button>

                                        <div className="px-4 pb-3 sm:hidden border-t border-base-200 pt-3 mx-4">
                                            <StatusProgress status={req.status} />
                                        </div>

                                        {isExpanded && (
                                            <div className="border-t border-base-200 bg-base-200/40 px-4 sm:px-6 py-5 space-y-5">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-2">
                                                        <h4 className="text-xs font-bold uppercase tracking-wider text-base-content/50">
                                                            Khách hàng
                                                        </h4>
                                                        <div className="rounded-xl bg-base-100 border border-base-200 p-4 space-y-2 text-sm">
                                                            <p className="flex items-center gap-2">
                                                                <Phone className="w-4 h-4 text-base-content/40 shrink-0" />
                                                                {req.phone}
                                                            </p>
                                                            <p className="flex items-center gap-2 break-all">
                                                                <Mail className="w-4 h-4 text-base-content/40 shrink-0" />
                                                                {req.email}
                                                            </p>
                                                            {req.address && (
                                                                <p className="flex items-start gap-2">
                                                                    <MapPin className="w-4 h-4 text-base-content/40 shrink-0 mt-0.5" />
                                                                    {req.address}
                                                                </p>
                                                            )}
                                                            {req.note && (
                                                                <p className="text-base-content/70 pt-1 border-t border-base-200">
                                                                    Ghi chú: {req.note}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <h4 className="text-xs font-bold uppercase tracking-wider text-base-content/50">
                                                            Ắc quy (đăng ký)
                                                        </h4>
                                                        <div className="rounded-xl bg-base-100 border border-base-200 p-4 space-y-2 text-sm">
                                                            <p className="flex items-center gap-2">
                                                                <Package className="w-4 h-4 text-base-content/40 shrink-0" />
                                                                {batteryDisplay}
                                                            </p>
                                                            <p>
                                                                SL: <strong>{req.quantity ?? 1}</strong> · Định giá:{' '}
                                                                {req.pricingType === 'weight' ? 'Theo cân' : 'Theo Ampe'} — {pricingDisplay}
                                                            </p>
                                                            <p className="flex items-center gap-2 text-base-content/80">
                                                                <Calendar className="w-4 h-4 shrink-0" />
                                                                SX: {formatDate(req.manufacturingDate)} · HSD: {formatDate(req.expiryDate)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {req.status === 'completed' && req.completedAmount != null && (
                                                    <div className="rounded-xl border border-success/30 bg-success/5 p-4 text-sm">
                                                        <p className="font-semibold text-success mb-2 flex items-center gap-2">
                                                            <span className="w-2 h-2 rounded-full bg-success" />
                                                            Phiên thu mua đã hoàn tất
                                                        </p>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                            <p>
                                                                <span className="text-base-content/60">Số tiền:</span>{' '}
                                                                <strong className="text-success">{formatVND(req.completedAmount)}</strong>
                                                            </p>
                                                            <p>
                                                                <span className="text-base-content/60">Sản phẩm:</span>{' '}
                                                                {req.completedProductId?.name || '—'}
                                                            </p>
                                                            <p>
                                                                <span className="text-base-content/60">Chi nhánh:</span>{' '}
                                                                {req.locationId?.name || req.locationId?.code || '—'}
                                                            </p>
                                                            <p>
                                                                <span className="text-base-content/60">Ngày:</span> {formatDate(req.completedAt)}
                                                            </p>
                                                        </div>
                                                        {req.completedNote && (
                                                            <p className="mt-2 pt-2 border-t border-success/20 text-base-content/80">
                                                                {req.completedNote}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}

                                                {req.status === 'cancelled' && (req.cancelledReason || req.cancelledAt) && (
                                                    <div className="rounded-xl border border-error/20 bg-error/5 p-4 text-sm">
                                                        <p className="font-medium text-error mb-1">Đã từ chối</p>
                                                        {req.cancelledAt && (
                                                            <p className="text-base-content/70">Thời điểm: {formatDate(req.cancelledAt)}</p>
                                                        )}
                                                        {req.cancelledReason && <p className="mt-1">Lý do: {req.cancelledReason}</p>}
                                                    </div>
                                                )}

                                                {req.images?.length > 0 && (
                                                    <div>
                                                        <h4 className="text-xs font-bold uppercase tracking-wider text-base-content/50 mb-2">
                                                            Ảnh đính kèm
                                                        </h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {req.images.map((url, i) => (
                                                                <a
                                                                    key={i}
                                                                    href={url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="block rounded-lg overflow-hidden border border-base-200 hover:ring-2 hover:ring-primary/30 transition-all"
                                                                >
                                                                    <img src={url} alt="" className="w-20 h-20 object-cover" />
                                                                </a>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex flex-wrap gap-2 pt-1">
                                                    {req.status === 'pending' && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-info gap-1"
                                                                disabled={updatingId === req._id}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleSimpleStatus(req._id, { status: 'contacted' });
                                                                }}
                                                            >
                                                                {updatingId === req._id ? (
                                                                    <span className="loading loading-spinner loading-xs" />
                                                                ) : null}
                                                                Đã liên hệ khách
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-outline btn-error"
                                                                disabled={updatingId === req._id}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openCancel(req._id);
                                                                }}
                                                            >
                                                                Từ chối
                                                            </button>
                                                        </>
                                                    )}
                                                    {req.status === 'contacted' && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-ghost"
                                                                disabled={updatingId === req._id}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleSimpleStatus(req._id, { status: 'pending' });
                                                                }}
                                                            >
                                                                Quay lại tiếp nhận
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-success gap-1"
                                                                disabled={updatingId === req._id}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openComplete(req);
                                                                }}
                                                            >
                                                                Hoàn thành thu mua
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-outline btn-error"
                                                                disabled={updatingId === req._id}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openCancel(req._id);
                                                                }}
                                                            >
                                                                Từ chối
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {pagination.totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 pt-2">
                        <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            disabled={pagination.page <= 1}
                            onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                        >
                            Trước
                        </button>
                        <span className="text-sm text-base-content/70 px-2">
                            {pagination.page} / {pagination.totalPages}
                        </span>
                        <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            disabled={pagination.page >= pagination.totalPages}
                            onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                        >
                            Sau
                        </button>
                    </div>
                )}
            </div>

            {/* Modal hoàn thành — overlay Daisy-friendly */}
            {completeOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
                        aria-label="Đóng"
                        onClick={() => !updatingId && setCompleteOpen(false)}
                    />
                    <div className="relative bg-base-100 rounded-2xl shadow-2xl border border-base-300 w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 flex items-center justify-between px-5 py-4 border-b border-base-200 bg-base-100 rounded-t-2xl">
                            <h3 className="font-bold text-lg">Hoàn thành thu mua</h3>
                            <button
                                type="button"
                                className="btn btn-sm btn-ghost btn-circle"
                                onClick={() => !updatingId && setCompleteOpen(false)}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="form-control w-full">
                                <label className="label py-1">
                                    <span className="label-text font-medium">Chi nhánh *</span>
                                </label>
                                <select
                                    className="select select-bordered select-sm w-full"
                                    value={completeForm.locationId}
                                    onChange={(e) => setCompleteForm((f) => ({ ...f, locationId: e.target.value }))}
                                >
                                    <option value="">Chọn chi nhánh</option>
                                    {locations.map((loc) => (
                                        <option key={loc._id} value={loc._id}>
                                            {loc.name || loc.code}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-control w-full">
                                <label className="label py-1">
                                    <span className="label-text font-medium">Sản phẩm acquy thu được *</span>
                                </label>
                                <select
                                    className="select select-bordered select-sm w-full"
                                    value={completeForm.completedProductId}
                                    onChange={(e) => setCompleteForm((f) => ({ ...f, completedProductId: e.target.value }))}
                                >
                                    <option value="">Chọn sản phẩm</option>
                                    {products.map((p) => (
                                        <option key={p._id} value={p._id}>
                                            {p.name}
                                            {p.sku ? ` (${p.sku})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-control w-full">
                                <label className="label py-1">
                                    <span className="label-text font-medium">Số tiền thu mua (VNĐ) *</span>
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    className="input input-bordered input-sm w-full"
                                    value={completeForm.completedAmount}
                                    onChange={(e) => setCompleteForm((f) => ({ ...f, completedAmount: e.target.value }))}
                                    placeholder="Ví dụ: 500000"
                                />
                            </div>
                            <div className="form-control w-full">
                                <label className="label py-1">
                                    <span className="label-text font-medium">Ghi chú</span>
                                </label>
                                <textarea
                                    className="textarea textarea-bordered textarea-sm w-full min-h-[72px]"
                                    value={completeForm.completedNote}
                                    onChange={(e) => setCompleteForm((f) => ({ ...f, completedNote: e.target.value }))}
                                    placeholder="Tuỳ chọn"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    disabled={!!updatingId}
                                    onClick={() => setCompleteOpen(false)}
                                >
                                    Đóng
                                </button>
                                <button type="button" className="btn btn-primary" disabled={!!updatingId} onClick={submitComplete}>
                                    {updatingId ? <span className="loading loading-spinner loading-sm" /> : null}
                                    Xác nhận hoàn thành
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {cancelOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
                        aria-label="Đóng"
                        onClick={() => !updatingId && setCancelOpen(false)}
                    />
                    <div className="relative bg-base-100 rounded-2xl shadow-2xl border border-base-300 w-full max-w-md">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-base-200">
                            <h3 className="font-bold text-lg">Từ chối yêu cầu</h3>
                            <button
                                type="button"
                                className="btn btn-sm btn-ghost btn-circle"
                                onClick={() => !updatingId && setCancelOpen(false)}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="form-control">
                                <label className="label py-1">
                                    <span className="label-text font-medium">Lý do (tuỳ chọn)</span>
                                </label>
                                <textarea
                                    className="textarea textarea-bordered w-full min-h-[88px]"
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    placeholder="Nhập lý do..."
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    disabled={!!updatingId}
                                    onClick={() => setCancelOpen(false)}
                                >
                                    Đóng
                                </button>
                                <button type="button" className="btn btn-error" disabled={!!updatingId} onClick={submitCancel}>
                                    {updatingId ? <span className="loading loading-spinner loading-sm" /> : null}
                                    Xác nhận từ chối
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
