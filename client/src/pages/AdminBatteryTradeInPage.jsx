import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router';
import { getBatteryTradeInList, updateBatteryTradeInStatus, updateBatteryTradeInDetails } from '@/services/batteryTradeInService';
import { getProvinces, getDistricts, getWards } from '@/services/addressService';
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
    Clock,
    Pencil,
    Recycle,
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

const formatDateTime = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });
};

const formatVND = (n) => {
    if (n == null || n === '' || Number.isNaN(Number(n))) return '—';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n));
};

const formatDateOnly = (d) => {
    if (!d) return '';
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return '';
    return x.toISOString().slice(0, 10);
};

const formatDatetimeLocal = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
};

const parseMetricAdmin = (str) => {
    const n = parseFloat(String(str || '').replace(',', '.').trim());
    if (!Number.isFinite(n)) return null;
    return n;
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

    const [locations, setLocations] = useState([]);

    const [completeOpen, setCompleteOpen] = useState(false);
    const [completeForId, setCompleteForId] = useState(null);
    const [completeForm, setCompleteForm] = useState({
        locationId: '',
        completedProductName: '',
        completedAmount: '',
        completedNote: '',
    });

    const [cancelOpen, setCancelOpen] = useState(false);
    const [cancelForId, setCancelForId] = useState(null);
    const [cancelReason, setCancelReason] = useState('');

    const [contactOpen, setContactOpen] = useState(false);
    const [contactForId, setContactForId] = useState(null);
    const [contactForm, setContactForm] = useState({ appointmentAt: '', appointmentLocationId: '' });

    const [detailsOpen, setDetailsOpen] = useState(false);
    const [detailsFor, setDetailsFor] = useState(null);
    const [detailsForm, setDetailsForm] = useState(null);
    const [detailsSaving, setDetailsSaving] = useState(false);
    const detailsSkipAddrRef = useRef(0);
    const [detailsProvinces, setDetailsProvinces] = useState([]);
    const [detailsDistricts, setDetailsDistricts] = useState([]);
    const [detailsWards, setDetailsWards] = useState([]);

    useEffect(() => {
        getActiveLocations()
            .then((res) => setLocations(res?.data?.locations || []))
            .catch(() => setLocations([]));
        getProvinces().then(setDetailsProvinces).catch(() => setDetailsProvinces([]));
    }, []);

    useEffect(() => {
        if (!detailsOpen || !detailsForm) return;
        if (detailsSkipAddrRef.current > 0) {
            detailsSkipAddrRef.current -= 1;
            return;
        }
        if (!detailsForm.provinceCode) {
            setDetailsDistricts([]);
            setDetailsWards([]);
            return;
        }
        getDistricts(detailsForm.provinceCode)
            .then(setDetailsDistricts)
            .catch(() => setDetailsDistricts([]));
        setDetailsForm((f) =>
            f
                ? { ...f, districtCode: '', districtName: '', wardCode: '', wardName: '' }
                : f,
        );
    }, [detailsForm?.provinceCode, detailsOpen]);

    useEffect(() => {
        if (!detailsOpen || !detailsForm) return;
        if (detailsSkipAddrRef.current > 0) {
            detailsSkipAddrRef.current -= 1;
            return;
        }
        if (!detailsForm.districtCode) {
            setDetailsWards([]);
            return;
        }
        getWards(detailsForm.districtCode).then(setDetailsWards).catch(() => setDetailsWards([]));
        setDetailsForm((f) => (f ? { ...f, wardCode: '', wardName: '' } : f));
    }, [detailsForm?.districtCode, detailsOpen]);

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
            locationId: req.appointmentLocationId?._id || locations[0]?._id || '',
            completedProductName: '',
            completedAmount: '',
            completedNote: '',
        });
        setCompleteOpen(true);
    };

    const openContact = (req) => {
        setContactForId(req._id);
        setContactForm({
            appointmentAt: '',
            appointmentLocationId: locations[0]?._id || '',
        });
        setContactOpen(true);
    };

    const submitContact = async () => {
        if (!contactForId) return;
        const { appointmentAt, appointmentLocationId } = contactForm;
        if (!appointmentAt?.trim()) {
            toast.error('Vui lòng chọn thời gian đã xác nhận với khách');
            return;
        }
        if (!appointmentLocationId) {
            toast.error('Vui lòng chọn cơ sở / chi nhánh');
            return;
        }
        const dt = new Date(appointmentAt);
        if (Number.isNaN(dt.getTime())) {
            toast.error('Thời gian không hợp lệ');
            return;
        }
        setUpdatingId(contactForId);
        try {
            await updateBatteryTradeInStatus(contactForId, {
                status: 'contacted',
                appointmentAt: dt.toISOString(),
                appointmentLocationId,
            });
            toast.success('Đã cập nhật: đã liên hệ & lịch hẹn');
            setContactOpen(false);
            setContactForId(null);
            fetchRequests();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Lỗi khi cập nhật');
        } finally {
            setUpdatingId(null);
        }
    };

    const submitComplete = async () => {
        if (!completeForId) return;
        const { locationId, completedProductName, completedAmount, completedNote } = completeForm;
        const nameStr = String(completedProductName || '').trim();
        if (!locationId || !nameStr || !completedAmount) {
            toast.error('Vui lòng chọn chi nhánh, nhập tên sản phẩm thu được và số tiền');
            return;
        }
        if (nameStr.length < 2 || nameStr.length > 200) {
            toast.error('Tên sản phẩm thu được: 2–200 ký tự');
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
                completedProductName: nameStr,
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

    const openDetails = (req) => {
        setDetailsFor(req);
        const pc = req.provinceCode || '';
        const dc = req.districtCode || '';
        Promise.all([pc ? getDistricts(pc) : Promise.resolve([]), dc ? getWards(dc) : Promise.resolve([])]).then(
            ([dList, wList]) => {
                if (pc && dc) detailsSkipAddrRef.current = 2;
                else if (pc) detailsSkipAddrRef.current = 1;
                else detailsSkipAddrRef.current = 0;
                setDetailsDistricts(dList);
                setDetailsWards(wList);
                setDetailsForm({
                    name: req.name || '',
                    phone: req.phone || '',
                    email: req.email || '',
                    note: req.note || '',
                    provinceCode: pc,
                    provinceName: req.provinceName || '',
                    districtCode: dc,
                    districtName: req.districtName || '',
                    wardCode: req.wardCode || '',
                    wardName: req.wardName || '',
                    addressLine: req.addressLine || '',
                    batteryName: req.batteryName || '',
                    quantity: req.quantity ?? 1,
                    manufacturingDate: formatDateOnly(req.manufacturingDate),
                    expiryDate: formatDateOnly(req.expiryDate),
                    condition: req.condition || '',
                    usageDuration: req.usageDuration || '',
                    isWorkingWell: req.isWorkingWell === true ? true : req.isWorkingWell === false ? false : null,
                    pricingType: req.pricingType === 'weight' ? 'weight' : 'ampe',
                    remainingAmps: req.remainingAmps != null ? String(req.remainingAmps) : '',
                    weightKg: req.weightKg != null ? String(req.weightKg) : '',
                    appointmentAt: formatDatetimeLocal(req.appointmentAt),
                    appointmentLocationId: req.appointmentLocationId?._id || '',
                    completedAmount: req.completedAmount ?? '',
                    completedProductName:
                        (req.completedProductName && String(req.completedProductName).trim()) ||
                        req.completedProductId?.name ||
                        '',
                    locationId: req.locationId?._id || '',
                    completedNote: req.completedNote || '',
                });
                setDetailsOpen(true);
            },
        );
    };

    const submitDetails = async () => {
        if (!detailsFor || !detailsForm) return;
        const bn = (detailsForm.batteryName || '').trim();
        if (!bn) {
            toast.error('Vui lòng nhập tên ắc quy');
            return;
        }
        const qty = parseInt(detailsForm.quantity, 10);
        if (!Number.isInteger(qty) || qty < 1) {
            toast.error('Số lượng không hợp lệ');
            return;
        }
        if (!detailsForm.manufacturingDate || !detailsForm.expiryDate) {
            toast.error('Chọn đủ ngày sản xuất và hạn sử dụng');
            return;
        }
        if (detailsForm.pricingType === 'ampe') {
            const v = parseMetricAdmin(detailsForm.remainingAmps);
            if (v == null || v <= 0 || v >= 200) {
                toast.error('Ampe (Ah) không hợp lệ');
                return;
            }
        } else {
            const v = parseMetricAdmin(detailsForm.weightKg);
            if (v == null || v <= 0 || v >= 200) {
                toast.error('Cân nặng (kg) không hợp lệ');
                return;
            }
        }

        const payload = {
            name: detailsForm.name.trim(),
            phone: detailsForm.phone.trim().replace(/\s/g, ''),
            email: detailsForm.email.trim().toLowerCase(),
            note: detailsForm.note?.trim() || '',
            provinceCode: detailsForm.provinceCode,
            provinceName: detailsForm.provinceName,
            districtCode: detailsForm.districtCode,
            districtName: detailsForm.districtName,
            wardCode: detailsForm.wardCode,
            wardName: detailsForm.wardName,
            addressLine: detailsForm.addressLine?.trim() || '',
            batteryName: bn,
            quantity: qty,
            manufacturingDate: detailsForm.manufacturingDate,
            expiryDate: detailsForm.expiryDate,
            condition: detailsForm.condition?.trim() || '',
            usageDuration: detailsForm.usageDuration?.trim() || '',
            isWorkingWell:
                detailsForm.isWorkingWell === true ? true : detailsForm.isWorkingWell === false ? false : undefined,
            pricingType: detailsForm.pricingType === 'weight' ? 'weight' : 'ampe',
            remainingAmps: detailsForm.pricingType === 'ampe' ? String(parseMetricAdmin(detailsForm.remainingAmps)) : '',
            weightKg: detailsForm.pricingType === 'weight' ? String(parseMetricAdmin(detailsForm.weightKg)) : '',
        };

        if (['contacted', 'completed'].includes(detailsFor.status)) {
            if (detailsForm.appointmentAt?.trim()) {
                if (!detailsForm.appointmentLocationId) {
                    toast.error('Chọn cơ sở / chi nhánh khi điền thời gian hẹn');
                    return;
                }
                payload.appointmentAt = new Date(detailsForm.appointmentAt).toISOString();
                payload.appointmentLocationId = detailsForm.appointmentLocationId;
            }
        }

        if (detailsFor.status === 'completed') {
            const amt = Number(String(detailsForm.completedAmount).replace(/\D/g, ''));
            if (!Number.isFinite(amt) || amt <= 0) {
                toast.error('Số tiền thu mua không hợp lệ');
                return;
            }
            const pn = String(detailsForm.completedProductName || '').trim();
            if (pn.length < 2 || pn.length > 200) {
                toast.error('Tên sản phẩm thu được: 2–200 ký tự');
                return;
            }
            if (!detailsForm.locationId) {
                toast.error('Chọn chi nhánh hoàn tất');
                return;
            }
            payload.completedAmount = amt;
            payload.completedProductName = pn;
            payload.locationId = detailsForm.locationId;
            payload.completedNote = detailsForm.completedNote?.trim() || '';
        }

        setDetailsSaving(true);
        try {
            await updateBatteryTradeInDetails(detailsFor._id, payload);
            toast.success('Đã cập nhật thông tin đơn');
            setDetailsOpen(false);
            setDetailsFor(null);
            setDetailsForm(null);
            fetchRequests();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Lỗi khi lưu');
        } finally {
            setDetailsSaving(false);
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
                                    placeholder="Mã TC-..., tên, SĐT, email..."
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
                                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-primary/25 shadow-sm">
                                                    <Recycle className="w-5 h-5" aria-hidden />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-semibold text-base truncate">{req.name}</p>
                                                    {req.requestCode && (
                                                        <p className="text-xs font-mono text-primary font-medium mt-0.5">
                                                            {req.requestCode}
                                                        </p>
                                                    )}
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

                                                {(req.status === 'contacted' || req.status === 'completed') &&
                                                    req.appointmentAt &&
                                                    req.appointmentLocationId && (
                                                        <div className="rounded-xl border border-info/30 bg-info/5 p-4 text-sm">
                                                            <p className="font-semibold text-info mb-2 flex items-center gap-2">
                                                                <Clock className="w-4 h-4" />
                                                                Lịch hẹn đã xác nhận với khách
                                                            </p>
                                                            <div className="space-y-1 text-base-content/90">
                                                                <p>
                                                                    <span className="text-base-content/60">Thời gian:</span>{' '}
                                                                    <strong>{formatDateTime(req.appointmentAt)}</strong>
                                                                </p>
                                                                <p>
                                                                    <span className="text-base-content/60">Cơ sở:</span>{' '}
                                                                    <strong>
                                                                        {req.appointmentLocationId?.name ||
                                                                            req.appointmentLocationId?.code ||
                                                                            '—'}
                                                                    </strong>
                                                                </p>
                                                                {req.appointmentLocationId?.address && (
                                                                    <p className="flex items-start gap-2">
                                                                        <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-base-content/50" />
                                                                        {req.appointmentLocationId.address}
                                                                    </p>
                                                                )}
                                                                {req.appointmentLocationId?.phone && (
                                                                    <p className="flex items-center gap-2">
                                                                        <Phone className="w-4 h-4 text-base-content/50" />
                                                                        {req.appointmentLocationId.phone}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

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
                                                                <span className="text-base-content/60">Sản phẩm thu:</span>{' '}
                                                                {req.completedProductName?.trim() ||
                                                                    req.completedProductId?.name ||
                                                                    '—'}
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
                                                    {req.status !== 'cancelled' && (
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline gap-1 border-primary/40"
                                                            disabled={updatingId === req._id}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openDetails(req);
                                                            }}
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                            Sửa thông tin đơn
                                                        </button>
                                                    )}
                                                    {req.status === 'pending' && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-info gap-1"
                                                                disabled={updatingId === req._id}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openContact(req);
                                                                }}
                                                            >
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

            {/* Modal đã liên hệ — thời gian + cơ sở */}
            {contactOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
                        aria-label="Đóng"
                        onClick={() => !updatingId && setContactOpen(false)}
                    />
                    <div className="relative bg-base-100 rounded-2xl shadow-2xl border border-base-300 w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 flex items-center justify-between px-5 py-4 border-b border-base-200 bg-base-100 rounded-t-2xl">
                            <h3 className="font-bold text-lg">Xác nhận đã liên hệ</h3>
                            <button
                                type="button"
                                className="btn btn-sm btn-ghost btn-circle"
                                onClick={() => !updatingId && setContactOpen(false)}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <p className="text-sm text-base-content/70">
                                Nhập thời gian và địa chỉ cơ sở đã thống nhất với khách (mang acquy đến / hẹn gặp).
                            </p>
                            <div className="form-control w-full">
                                <label className="label py-1">
                                    <span className="label-text font-medium">Thời gian đã xác nhận *</span>
                                </label>
                                <input
                                    type="datetime-local"
                                    className="input input-bordered input-sm w-full"
                                    value={contactForm.appointmentAt}
                                    onChange={(e) => setContactForm((f) => ({ ...f, appointmentAt: e.target.value }))}
                                />
                            </div>
                            <div className="form-control w-full">
                                <label className="label py-1">
                                    <span className="label-text font-medium">Cơ sở / chi nhánh *</span>
                                </label>
                                <select
                                    className="select select-bordered select-sm w-full"
                                    value={contactForm.appointmentLocationId}
                                    onChange={(e) =>
                                        setContactForm((f) => ({ ...f, appointmentLocationId: e.target.value }))
                                    }
                                >
                                    <option value="">Chọn chi nhánh</option>
                                    {locations.map((loc) => (
                                        <option key={loc._id} value={loc._id}>
                                            {loc.name || loc.code}
                                            {loc.address ? ` — ${loc.address}` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-2 justify-end pt-2">
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    disabled={!!updatingId}
                                    onClick={() => setContactOpen(false)}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    disabled={!!updatingId}
                                    onClick={submitContact}
                                >
                                    {updatingId ? <span className="loading loading-spinner loading-xs" /> : null}
                                    Xác nhận
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal hoàn thành — overlay Daisy-friendly */}
            {completeOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
                        aria-label="Đóng"
                        onClick={() => !updatingId && setCompleteOpen(false)}
                    />
                    <div className="relative bg-base-100 rounded-2xl shadow-2xl border border-base-200 w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 flex items-center justify-between px-5 py-4 border-b border-base-200 bg-gradient-to-r from-success/10 to-base-100 rounded-t-2xl">
                            <div className="flex items-center gap-2">
                                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/15 text-success">
                                    <Recycle className="w-4 h-4" />
                                </span>
                                <h3 className="font-bold text-lg">Hoàn thành thu mua</h3>
                            </div>
                            <button
                                type="button"
                                className="btn btn-sm btn-ghost btn-circle"
                                onClick={() => !updatingId && setCompleteOpen(false)}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <p className="text-sm text-base-content/70 -mt-1">
                                Ghi tên ắc quy thực tế đã thu, số tiền và chi nhánh giao dịch.
                            </p>
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
                                    <span className="label-text font-medium">Tên sản phẩm acquy thu được *</span>
                                </label>
                                <input
                                    type="text"
                                    className="input input-bordered input-sm w-full"
                                    placeholder="Ví dụ: Ắc quy GS 60Ah, Atlas MF..."
                                    value={completeForm.completedProductName}
                                    onChange={(e) =>
                                        setCompleteForm((f) => ({ ...f, completedProductName: e.target.value }))
                                    }
                                    maxLength={200}
                                />
                                <label className="label py-0">
                                    <span className="label-text-alt text-base-content/50">2–200 ký tự</span>
                                </label>
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

            {detailsOpen && detailsForm && detailsFor && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
                        aria-label="Đóng"
                        onClick={() => !detailsSaving && setDetailsOpen(false)}
                    />
                    <div className="relative bg-base-100 rounded-2xl shadow-2xl border border-base-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 flex items-center justify-between px-5 py-4 border-b border-base-200 bg-gradient-to-r from-primary/10 to-base-100 rounded-t-2xl z-10">
                            <div className="flex items-center gap-3 min-w-0">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20">
                                    <Pencil className="w-5 h-5" />
                                </span>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-lg">Sửa thông tin đơn</h3>
                                    <p className="text-xs text-base-content/60 font-mono mt-0.5 truncate">{detailsFor.requestCode}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                className="btn btn-sm btn-ghost btn-circle"
                                onClick={() => !detailsSaving && setDetailsOpen(false)}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4 text-sm">
                            <p className="text-xs text-base-content/60 -mt-1 pb-1 border-b border-base-200">
                                Chỉnh thông tin liên hệ và ắc quy. Ảnh khách gửi không sửa tại đây.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="form-control">
                                    <label className="label py-1">
                                        <span className="label-text font-medium">Họ tên *</span>
                                    </label>
                                    <input
                                        className="input input-bordered input-sm w-full"
                                        value={detailsForm.name}
                                        onChange={(e) => setDetailsForm((f) => ({ ...f, name: e.target.value }))}
                                    />
                                </div>
                                <div className="form-control">
                                    <label className="label py-1">
                                        <span className="label-text font-medium">SĐT *</span>
                                    </label>
                                    <input
                                        className="input input-bordered input-sm w-full"
                                        value={detailsForm.phone}
                                        onChange={(e) => setDetailsForm((f) => ({ ...f, phone: e.target.value }))}
                                    />
                                </div>
                                <div className="form-control sm:col-span-2">
                                    <label className="label py-1">
                                        <span className="label-text font-medium">Gmail *</span>
                                    </label>
                                    <input
                                        type="email"
                                        className="input input-bordered input-sm w-full"
                                        value={detailsForm.email}
                                        onChange={(e) => setDetailsForm((f) => ({ ...f, email: e.target.value }))}
                                    />
                                </div>
                                <div className="form-control sm:col-span-2">
                                    <label className="label py-1">
                                        <span className="label-text font-medium">Ghi chú</span>
                                    </label>
                                    <input
                                        className="input input-bordered input-sm w-full"
                                        value={detailsForm.note}
                                        onChange={(e) => setDetailsForm((f) => ({ ...f, note: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="divider my-1 text-xs">Địa chỉ</div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <select
                                    className="select select-bordered select-sm w-full"
                                    value={detailsForm.provinceCode}
                                    onChange={(e) => {
                                        const code = e.target.value;
                                        const p = detailsProvinces.find((x) => String(x.code) === code);
                                        setDetailsForm((f) => ({
                                            ...f,
                                            provinceCode: code,
                                            provinceName: p?.name || '',
                                        }));
                                    }}
                                >
                                    <option value="">Tỉnh/TP</option>
                                    {detailsProvinces.map((p) => (
                                        <option key={p.code} value={p.code}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    className="select select-bordered select-sm w-full"
                                    value={detailsForm.districtCode}
                                    onChange={(e) => {
                                        const code = e.target.value;
                                        const d = detailsDistricts.find((x) => String(x.code) === code);
                                        setDetailsForm((f) => ({
                                            ...f,
                                            districtCode: code,
                                            districtName: d?.name || '',
                                        }));
                                    }}
                                    disabled={!detailsForm.provinceCode}
                                >
                                    <option value="">Quận/Huyện</option>
                                    {detailsDistricts.map((d) => (
                                        <option key={d.code} value={d.code}>
                                            {d.name}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    className="select select-bordered select-sm w-full"
                                    value={detailsForm.wardCode}
                                    onChange={(e) => {
                                        const code = e.target.value;
                                        const w = detailsWards.find((x) => String(x.code) === code);
                                        setDetailsForm((f) => ({
                                            ...f,
                                            wardCode: code,
                                            wardName: w?.name || '',
                                        }));
                                    }}
                                    disabled={!detailsForm.districtCode}
                                >
                                    <option value="">Phường/Xã</option>
                                    {detailsWards.map((w) => (
                                        <option key={w.code} value={w.code}>
                                            {w.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-control">
                                <label className="label py-1">
                                    <span className="label-text font-medium">Địa chỉ cụ thể *</span>
                                </label>
                                <input
                                    className="input input-bordered input-sm w-full"
                                    value={detailsForm.addressLine}
                                    onChange={(e) => setDetailsForm((f) => ({ ...f, addressLine: e.target.value }))}
                                />
                            </div>

                            <div className="divider my-1 text-xs">Ắc quy</div>
                            <div className="form-control">
                                <label className="label py-1">
                                    <span className="label-text font-medium">Tên ắc quy (đăng ký) *</span>
                                </label>
                                <input
                                    className="input input-bordered input-sm w-full"
                                    value={detailsForm.batteryName}
                                    onChange={(e) => setDetailsForm((f) => ({ ...f, batteryName: e.target.value }))}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="form-control">
                                    <label className="label py-1">
                                        <span className="label-text font-medium">Số lượng *</span>
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        className="input input-bordered input-sm w-full"
                                        value={detailsForm.quantity}
                                        onChange={(e) => setDetailsForm((f) => ({ ...f, quantity: e.target.value }))}
                                    />
                                </div>
                                <div className="form-control">
                                    <label className="label py-1">
                                        <span className="label-text font-medium">Định giá</span>
                                    </label>
                                    <select
                                        className="select select-bordered select-sm w-full"
                                        value={detailsForm.pricingType}
                                        onChange={(e) =>
                                            setDetailsForm((f) => ({
                                                ...f,
                                                pricingType: e.target.value,
                                                remainingAmps: e.target.value === 'weight' ? '' : f.remainingAmps,
                                                weightKg: e.target.value === 'ampe' ? '' : f.weightKg,
                                            }))
                                        }
                                    >
                                        <option value="ampe">Theo Ampe (Ah)</option>
                                        <option value="weight">Theo cân (kg)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="form-control">
                                    <label className="label py-1">
                                        <span className="label-text font-medium">Ngày SX *</span>
                                    </label>
                                    <input
                                        type="date"
                                        className="input input-bordered input-sm w-full"
                                        value={detailsForm.manufacturingDate}
                                        onChange={(e) => setDetailsForm((f) => ({ ...f, manufacturingDate: e.target.value }))}
                                    />
                                </div>
                                <div className="form-control">
                                    <label className="label py-1">
                                        <span className="label-text font-medium">Hạn SD *</span>
                                    </label>
                                    <input
                                        type="date"
                                        className="input input-bordered input-sm w-full"
                                        value={detailsForm.expiryDate}
                                        onChange={(e) => setDetailsForm((f) => ({ ...f, expiryDate: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div className="form-control">
                                <label className="label py-1">
                                    <span className="label-text font-medium">Tình trạng</span>
                                </label>
                                <select
                                    className="select select-bordered select-sm w-full"
                                    value={detailsForm.condition}
                                    onChange={(e) => setDetailsForm((f) => ({ ...f, condition: e.target.value }))}
                                >
                                    <option value="">—</option>
                                    <option value="tốt">Tốt</option>
                                    <option value="trung bình">Trung bình</option>
                                    <option value="kém">Kém</option>
                                </select>
                            </div>
                            <div className="form-control">
                                <label className="label py-1">
                                    <span className="label-text font-medium">Đã dùng bao lâu</span>
                                </label>
                                <input
                                    className="input input-bordered input-sm w-full"
                                    value={detailsForm.usageDuration}
                                    onChange={(e) => setDetailsForm((f) => ({ ...f, usageDuration: e.target.value }))}
                                />
                            </div>
                            <div className="flex gap-4 flex-wrap">
                                <label className="label cursor-pointer gap-2">
                                    <input
                                        type="radio"
                                        name="d-well"
                                        className="radio radio-xs"
                                        checked={detailsForm.isWorkingWell === true}
                                        onChange={() => setDetailsForm((f) => ({ ...f, isWorkingWell: true }))}
                                    />
                                    <span className="label-text">Còn tốt</span>
                                </label>
                                <label className="label cursor-pointer gap-2">
                                    <input
                                        type="radio"
                                        name="d-well"
                                        className="radio radio-xs"
                                        checked={detailsForm.isWorkingWell === false}
                                        onChange={() => setDetailsForm((f) => ({ ...f, isWorkingWell: false }))}
                                    />
                                    <span className="label-text">Không</span>
                                </label>
                            </div>
                            {detailsForm.pricingType === 'ampe' ? (
                                <div className="form-control">
                                    <label className="label py-1">
                                        <span className="label-text font-medium">Ampe (Ah) *</span>
                                    </label>
                                    <input
                                        className="input input-bordered input-sm w-full"
                                        value={detailsForm.remainingAmps}
                                        onChange={(e) => setDetailsForm((f) => ({ ...f, remainingAmps: e.target.value }))}
                                    />
                                </div>
                            ) : (
                                <div className="form-control">
                                    <label className="label py-1">
                                        <span className="label-text font-medium">Cân nặng (kg) *</span>
                                    </label>
                                    <input
                                        className="input input-bordered input-sm w-full"
                                        value={detailsForm.weightKg}
                                        onChange={(e) => setDetailsForm((f) => ({ ...f, weightKg: e.target.value }))}
                                    />
                                </div>
                            )}

                            {(detailsFor.status === 'contacted' || detailsFor.status === 'completed') && (
                                <>
                                    <div className="divider my-1 text-xs">Lịch hẹn (sửa nếu nhập nhầm)</div>
                                    <div className="form-control">
                                        <label className="label py-1">
                                            <span className="label-text font-medium">Thời gian đã xác nhận</span>
                                        </label>
                                        <input
                                            type="datetime-local"
                                            className="input input-bordered input-sm w-full"
                                            value={detailsForm.appointmentAt}
                                            onChange={(e) =>
                                                setDetailsForm((f) => ({ ...f, appointmentAt: e.target.value }))
                                            }
                                        />
                                    </div>
                                    <div className="form-control">
                                        <label className="label py-1">
                                            <span className="label-text font-medium">Cơ sở hẹn</span>
                                        </label>
                                        <select
                                            className="select select-bordered select-sm w-full"
                                            value={detailsForm.appointmentLocationId}
                                            onChange={(e) =>
                                                setDetailsForm((f) => ({ ...f, appointmentLocationId: e.target.value }))
                                            }
                                        >
                                            <option value="">Chọn chi nhánh</option>
                                            {locations.map((loc) => (
                                                <option key={loc._id} value={loc._id}>
                                                    {loc.name || loc.code}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            )}

                            {detailsFor.status === 'completed' && (
                                <>
                                    <div className="divider my-1 text-xs">Hoàn tất thu mua</div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <div className="form-control">
                                            <label className="label py-1">
                                                <span className="label-text font-medium">Số tiền (VNĐ) *</span>
                                            </label>
                                            <input
                                                type="number"
                                                min={1}
                                                className="input input-bordered input-sm w-full"
                                                value={detailsForm.completedAmount}
                                                onChange={(e) =>
                                                    setDetailsForm((f) => ({ ...f, completedAmount: e.target.value }))
                                                }
                                            />
                                        </div>
                                        <div className="form-control">
                                            <label className="label py-1">
                                                <span className="label-text font-medium">Chi nhánh *</span>
                                            </label>
                                            <select
                                                className="select select-bordered select-sm w-full"
                                                value={detailsForm.locationId}
                                                onChange={(e) =>
                                                    setDetailsForm((f) => ({ ...f, locationId: e.target.value }))
                                                }
                                            >
                                                <option value="">Chọn</option>
                                                {locations.map((loc) => (
                                                    <option key={loc._id} value={loc._id}>
                                                        {loc.name || loc.code}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-control sm:col-span-2">
                                            <label className="label py-1">
                                                <span className="label-text font-medium">Tên sản phẩm acquy thu được *</span>
                                            </label>
                                            <input
                                                type="text"
                                                className="input input-bordered input-sm w-full"
                                                placeholder="Ghi tên thực tế đã thu"
                                                maxLength={200}
                                                value={detailsForm.completedProductName}
                                                onChange={(e) =>
                                                    setDetailsForm((f) => ({
                                                        ...f,
                                                        completedProductName: e.target.value,
                                                    }))
                                                }
                                            />
                                            <label className="label py-0">
                                                <span className="label-text-alt text-base-content/50">2–200 ký tự</span>
                                            </label>
                                        </div>
                                        <div className="form-control sm:col-span-2">
                                            <label className="label py-1">
                                                <span className="label-text font-medium">Ghi chú hoàn tất</span>
                                            </label>
                                            <textarea
                                                className="textarea textarea-bordered textarea-sm w-full min-h-[64px]"
                                                value={detailsForm.completedNote}
                                                onChange={(e) =>
                                                    setDetailsForm((f) => ({ ...f, completedNote: e.target.value }))
                                                }
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-base-100 pb-1">
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    disabled={detailsSaving}
                                    onClick={() => setDetailsOpen(false)}
                                >
                                    Đóng
                                </button>
                                <button type="button" className="btn btn-primary btn-sm" disabled={detailsSaving} onClick={submitDetails}>
                                    {detailsSaving ? <span className="loading loading-spinner loading-xs" /> : null}
                                    Lưu
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
