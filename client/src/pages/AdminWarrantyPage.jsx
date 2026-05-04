import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router';
import { getAllClaims, updateWarrantyClaim, getActiveLocations } from '@/services/warrantyService';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';
import {
    Shield,
    Search,
    Filter,
    ChevronDown,
    ChevronUp,
    Phone,
    MapPin,
    Package,
    Calendar,
    Clock,
    Eye,
    CheckCircle,
    XCircle,
    RotateCw,
    FileText,
    X,
    RefreshCw,
    User,
    Check,
    Building2,
} from 'lucide-react';

const CLAIM_STATUS_META = {
    pending: { short: 'Chờ xử lý', badge: 'bg-amber-100 text-amber-800 border-amber-200', label: 'badge-warning' },
    approved: { short: 'Đã duyệt', badge: 'bg-blue-100 text-blue-800 border-blue-200', label: 'badge-info' },
    rejected: { short: 'Từ chối', badge: 'bg-red-100 text-red-800 border-red-200', label: 'badge-error' },
    completed: { short: 'Hoàn thành', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'badge-success' },
};

const REASON_LABELS = {
    product_damage: 'Sản phẩm bị hư hỏng',
    product_defect: 'Lỗi từ nhà sản xuất',
    battery_leak: 'Ắc quy bị chảy nước',
    charging_issue: 'Không sạc được / sạc yếu',
    other: 'Lý do khác',
};

const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('vi-VN');
};

const formatDateTime = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });
};

const formatDateInput = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
};

function ClaimStatusBadge({ status }) {
    const meta = CLAIM_STATUS_META[status] || CLAIM_STATUS_META.pending;
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${meta.badge}`}>
            {status === 'pending' && <Clock className="w-3 h-3" />}
            {status === 'approved' && <CheckCircle className="w-3 h-3" />}
            {status === 'rejected' && <XCircle className="w-3 h-3" />}
            {status === 'completed' && <Check className="w-3 h-3" />}
            {meta.short}
        </span>
    );
}

function StatusProgress({ status }) {
    if (status === 'rejected') {
        return (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                <XCircle className="w-3.5 h-3.5" /> Từ chối
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
                                    ${current ? 'border-blue-600 bg-blue-600 text-white' : ''}
                                    ${done ? 'border-blue-400 bg-blue-100 text-blue-600' : ''}
                                    ${!done && !current ? 'border-gray-300 bg-gray-100 text-gray-400' : ''}`}
                            >
                                {done ? '✓' : i + 1}
                            </div>
                            <span className={`text-[9px] mt-1 text-center leading-tight ${current ? 'font-semibold text-blue-600' : 'text-gray-400'}`}>
                                {step.label}
                            </span>
                        </div>
                        {i < steps.length - 1 && (
                            <div className={`h-0.5 flex-1 min-w-[8px] mx-0.5 -mt-4 rounded ${i < activeIndex ? 'bg-blue-400' : 'bg-gray-200'}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default function AdminWarrantyPage() {
    const { isAdmin } = useUserRole();
    const [claims, setClaims] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ claimStatus: '', reason: '', search: '', locationId: '' });
    const [appliedFilters, setAppliedFilters] = useState({ claimStatus: '', reason: '', search: '', locationId: '' });
    const [expandedId, setExpandedId] = useState(null);
    const [updatingId, setUpdatingId] = useState(null);
    const [locations, setLocations] = useState([]);

    // Chi tiết claim
    const [detailClaim, setDetailClaim] = useState(null);
    const [detailOpen, setDetailOpen] = useState(false);

    // Modal xử lý claim
    const [processOpen, setProcessOpen] = useState(false);
    const [processClaim, setProcessClaim] = useState(null);
    const [processStatus, setProcessStatus] = useState('');
    const [processNotes, setProcessNotes] = useState('');

    const fetchClaims = async () => {
        setLoading(true);
        try {
            const params = { page: pagination.page, limit: pagination.limit };
            if (appliedFilters.claimStatus) params.claimStatus = appliedFilters.claimStatus;
            if (appliedFilters.reason) params.reason = appliedFilters.reason;
            if (appliedFilters.search?.trim()) params.search = appliedFilters.search.trim();
            if (appliedFilters.locationId) params.locationId = appliedFilters.locationId;

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
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Lỗi khi tải danh sách');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClaims();
    }, [pagination.page, appliedFilters]);

    // Load locations cho filter (Admin)
    useEffect(() => {
        if (isAdmin) {
            getActiveLocations().then((res) => {
                if (res?.success) setLocations(res.data?.locations || []);
            }).catch(() => {});
        }
    }, [isAdmin]);

    const applyFilters = () => {
        setAppliedFilters({ ...filters });
        setPagination((p) => ({ ...p, page: 1 }));
    };

    const clearFilters = () => {
        setFilters({ claimStatus: '', reason: '', search: '', locationId: '' });
        setAppliedFilters({ claimStatus: '', reason: '', search: '', locationId: '' });
        setPagination((p) => ({ ...p, page: 1 }));
    };

    const handleProcess = (claim) => {
        setProcessClaim(claim);
        setProcessStatus(claim.claim.status);
        setProcessNotes('');
        setProcessOpen(true);
    };

    const handleSubmitProcess = async () => {
        if (!processStatus) {
            toast.error('Vui lòng chọn trạng thái xử lý');
            return;
        }

        setUpdatingId(processClaim.warrantyId);
        try {
            await updateWarrantyClaim(processClaim.warrantyId, processClaim.claim.claimCode, {
                status: processStatus,
                resolutionNotes: processNotes.trim(),
            });
            toast.success('Cập nhật thành công!');
            setProcessOpen(false);
            fetchClaims();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Lỗi khi cập nhật');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleViewDetail = (claim) => {
        setDetailClaim(claim);
        setDetailOpen(true);
    };

    const hasFilters = appliedFilters.claimStatus || appliedFilters.reason || appliedFilters.search;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center">
                                <Shield className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-gray-900">Quản lý Bảo hành</h1>
                                <p className="text-xs text-gray-500">Xem & xử lý yêu cầu bảo hành từ khách hàng</p>
                            </div>
                        </div>
                        <button
                            onClick={fetchClaims}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Làm mới
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
                {/* Bộ lọc */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-semibold text-gray-700">Bộ lọc</span>
                        {hasFilters && (
                            <button onClick={clearFilters} className="ml-auto text-xs text-red-500 hover:underline">
                                Xóa bộ lọc
                            </button>
                        )}
                    </div>
                    <div className="p-4">
                        <div className="flex flex-wrap gap-3 items-end">
                            <div className="flex-1 min-w-[180px]">
                                <label className="text-xs text-gray-500 mb-1 block">Tìm kiếm</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        value={filters.search}
                                        onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                                        onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                                        placeholder="Mã BH, mã YC, tên, SĐT..."
                                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            <div className="w-40">
                                <label className="text-xs text-gray-500 mb-1 block">Trạng thái</label>
                                <select
                                    value={filters.claimStatus}
                                    onChange={(e) => setFilters((f) => ({ ...f, claimStatus: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Tất cả</option>
                                    <option value="pending">Chờ xử lý</option>
                                    <option value="approved">Đã duyệt</option>
                                    <option value="rejected">Từ chối</option>
                                    <option value="completed">Hoàn thành</option>
                                </select>
                            </div>
                            <div className="w-48">
                                <label className="text-xs text-gray-500 mb-1 block">Lý do</label>
                                <select
                                    value={filters.reason}
                                    onChange={(e) => setFilters((f) => ({ ...f, reason: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Tất cả</option>
                                    {Object.entries(REASON_LABELS).map(([val, label]) => (
                                        <option key={val} value={val}>{label}</option>
                                    ))}
                                </select>
                            </div>
                            {isAdmin && (
                                <div className="w-48">
                                    <label className="text-xs text-gray-500 mb-1 block">Cơ sở BH</label>
                                    <select
                                        value={filters.locationId}
                                        onChange={(e) => setFilters((f) => ({ ...f, locationId: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Tất cả cơ sở</option>
                                        {locations.map((loc) => (
                                            <option key={loc._id} value={loc._id}>
                                                {loc.code} - {loc.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <button
                                onClick={applyFilters}
                                className="px-4 py-2 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800 transition-colors"
                            >
                                Lọc
                            </button>
                        </div>
                    </div>
                </div>

                {/* Bảng danh sách */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-20 text-gray-400">
                            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Đang tải...
                        </div>
                    ) : claims.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                            <Shield className="w-12 h-12 mb-3 opacity-30" />
                            <p className="font-medium">Không có yêu cầu bảo hành nào</p>
                            {hasFilters && (
                                <button onClick={clearFilters} className="text-blue-600 text-sm mt-2 hover:underline">
                                    Xóa bộ lọc
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Yêu cầu BH</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sản phẩm</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Khách hàng</th>
                                        {isAdmin && <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cơ sở</th>}
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ngày gửi</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Trạng thái</th>
                                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {claims.map((claim) => (
                                        <>
                                            <tr
                                                key={`${claim.warrantyId}-${claim.claim.claimCode}`}
                                                className="hover:bg-gray-50 transition-colors"
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="space-y-0.5">
                                                        <p className="font-mono text-sm font-semibold text-blue-800">
                                                            {claim.claim.claimCode}
                                                        </p>
                                                        <p className="text-xs text-gray-400">
                                                            BH: {claim.warrantyCode}
                                                        </p>
                                                        <p className="text-xs text-gray-500 font-mono">
                                                            {claim.orderCode}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        {claim.product?.image && (
                                                            <img
                                                                src={claim.product.image}
                                                                alt={claim.product.name}
                                                                className="w-8 h-8 rounded-lg object-contain border border-gray-100 bg-white"
                                                            />
                                                        )}
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-gray-900 truncate max-w-[180px]">
                                                                {claim.product?.name || '—'}
                                                            </p>
                                                            {claim.product?.sku && (
                                                                <p className="text-xs text-gray-400 font-mono">{claim.product.sku}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="space-y-0.5">
                                                        <p className="text-sm font-medium text-gray-900">{claim.customerName || claim.claim.customerName || '—'}</p>
                                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                                            <Phone className="w-3 h-3" />
                                                            {claim.customerPhone || claim.claim.customerPhone || '—'}
                                                        </p>
                                                        {claim.claim.customerAddress && (
                                                            <p className="text-xs text-gray-400 flex items-center gap-1 max-w-[150px] truncate">
                                                                <MapPin className="w-3 h-3 shrink-0" />
                                                                {claim.claim.customerAddress}
                                                            </p>
                                                        )}
                                                    </div>
                                                </td>
                                                {isAdmin && (
                                                    <td className="px-4 py-3">
                                                        {claim.location ? (
                                                            <div className="flex items-center gap-1.5">
                                                                <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                                <div>
                                                                    <p className="text-sm font-medium text-gray-800">{claim.location.name || '—'}</p>
                                                                    {claim.location.code && (
                                                                        <p className="text-xs text-gray-400">{claim.location.code}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-sm text-gray-400">—</span>
                                                        )}
                                                    </td>
                                                )}
                                                <td className="px-4 py-3">
                                                    <p className="text-sm text-gray-700">{formatDate(claim.claim.createdAt)}</p>
                                                    <p className="text-xs text-gray-400">{formatDateTime(claim.claim.createdAt).split(',')[1]?.trim() || ''}</p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <ClaimStatusBadge status={claim.claim.status} />
                                                    <div className="mt-1.5">
                                                        <StatusProgress status={claim.claim.status} />
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            onClick={() => handleViewDetail(claim)}
                                                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Xem chi tiết"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleProcess(claim)}
                                                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Xử lý"
                                                        >
                                                            <CheckCircle className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        </>
                                    ))}
                                </tbody>
                            </table>

                            {/* Phân trang */}
                            {pagination.totalPages > 1 && (
                                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
                                    <p className="text-xs text-gray-500">
                                        Hiển thị {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} trong {pagination.total} yêu cầu
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                                            disabled={pagination.page <= 1}
                                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-100 transition-colors"
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
                                                    className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                                                        page === pagination.page
                                                            ? 'bg-blue-700 text-white border-blue-700'
                                                            : 'border-gray-300 hover:bg-gray-100'
                                                    }`}
                                                >
                                                    {page}
                                                </button>
                                            );
                                        })}
                                        <button
                                            onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                                            disabled={pagination.page >= pagination.totalPages}
                                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-100 transition-colors"
                                        >
                                            →
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Modal Chi tiết */}
            {detailOpen && detailClaim && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setDetailOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Shield className="w-5 h-5 text-blue-700" />
                                Chi tiết yêu cầu bảo hành
                            </h2>
                            <button onClick={() => setDetailOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Trạng thái */}
                            <div className="flex items-center justify-between">
                                <ClaimStatusBadge status={detailClaim.claim.status} />
                                <StatusProgress status={detailClaim.claim.status} />
                            </div>

                            {/* Cơ sở bảo hành */}
                            {detailClaim.location && (
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                    <p className="text-xs font-bold uppercase text-blue-600 mb-2 flex items-center gap-1">
                                        <Building2 className="w-3.5 h-3.5" /> Cơ sở bảo hành
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                            <Building2 className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">{detailClaim.location.name || '—'}</p>
                                            {detailClaim.location.code && (
                                                <p className="text-sm text-gray-500">{detailClaim.location.code}</p>
                                            )}
                                            {detailClaim.location.address && (
                                                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                                    <MapPin className="w-3 h-3" /> {detailClaim.location.address}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Mã & thời gian */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <p className="text-xs text-gray-500 mb-1">Mã yêu cầu</p>
                                    <p className="font-mono font-semibold text-blue-800">{detailClaim.claim.claimCode}</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <p className="text-xs text-gray-500 mb-1">Mã bảo hành</p>
                                    <p className="font-mono font-semibold text-gray-800">{detailClaim.warrantyCode}</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <p className="text-xs text-gray-500 mb-1">Mã hóa đơn</p>
                                    <p className="font-mono font-semibold text-gray-800">{detailClaim.orderCode}</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <p className="text-xs text-gray-500 mb-1">Ngày gửi yêu cầu</p>
                                    <p className="font-medium text-gray-800">{formatDateTime(detailClaim.claim.createdAt)}</p>
                                </div>
                            </div>

                            {/* Sản phẩm */}
                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-xs font-bold uppercase text-gray-500 mb-2">Sản phẩm</p>
                                <div className="flex items-center gap-3">
                                    {detailClaim.product?.image && (
                                        <img
                                            src={detailClaim.product.image}
                                            alt={detailClaim.product.name}
                                            className="w-14 h-14 rounded-xl object-contain border border-gray-200 bg-white"
                                        />
                                    )}
                                    <div>
                                        <p className="font-semibold text-gray-900">{detailClaim.product?.name || '—'}</p>
                                        {detailClaim.product?.sku && <p className="text-xs text-gray-500 font-mono">SKU: {detailClaim.product.sku}</p>}
                                        <p className="text-xs text-gray-500">Mua ngày: {formatDate(detailClaim.purchaseDate)}</p>
                                        <p className="text-xs text-gray-500">BH đến: {formatDate(detailClaim.warrantyEndDate)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Thông tin khách hàng */}
                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-xs font-bold uppercase text-gray-500 mb-2">Người yêu cầu BH</p>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <p className="text-xs text-gray-500">Họ tên</p>
                                        <p className="font-medium">{detailClaim.claim.customerName || detailClaim.customerName || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Điện thoại</p>
                                        <p className="font-medium">{detailClaim.claim.customerPhone || detailClaim.customerPhone || '—'}</p>
                                    </div>
                                    {detailClaim.claim.customerAddress && (
                                        <div className="col-span-2">
                                            <p className="text-xs text-gray-500">Địa chỉ</p>
                                            <p className="font-medium">{detailClaim.claim.customerAddress}</p>
                                        </div>
                                    )}
                                    {detailClaim.claim.notes && (
                                        <div className="col-span-2">
                                            <p className="text-xs text-gray-500">Ghi chú</p>
                                            <p className="font-medium">{detailClaim.claim.notes}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Lý do & mô tả */}
                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-xs font-bold uppercase text-gray-500 mb-2">Lý do & Mô tả</p>
                                <div className="space-y-2 text-sm">
                                    <div>
                                        <p className="text-xs text-gray-500">Lý do</p>
                                        <p className="font-semibold text-red-700">
                                            {REASON_LABELS[detailClaim.claim.reason] || detailClaim.claim.reason}
                                        </p>
                                    </div>
                                    {detailClaim.claim.description && (
                                        <div>
                                            <p className="text-xs text-gray-500">Mô tả chi tiết</p>
                                            <p className="text-gray-700">{detailClaim.claim.description}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Ảnh */}
                            {detailClaim.claim.images?.length > 0 && (
                                <div>
                                    <p className="text-xs font-bold uppercase text-gray-500 mb-2">Ảnh đính kèm ({detailClaim.claim.images.length})</p>
                                    <div className="flex flex-wrap gap-2">
                                        {detailClaim.claim.images.map((url, i) => (
                                            <a
                                                key={i}
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block rounded-xl overflow-hidden border border-gray-200 hover:ring-2 hover:ring-blue-400 transition-all"
                                            >
                                                <img src={url} alt={`Ảnh ${i + 1}`} className="w-24 h-24 object-cover" />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Ghi chú xử lý */}
                            {detailClaim.claim.resolutionNotes && (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                                    <p className="text-xs font-bold uppercase text-emerald-700 mb-1">Ghi chú xử lý</p>
                                    <p className="text-sm text-emerald-800">{detailClaim.claim.resolutionNotes}</p>
                                    {detailClaim.claim.resolvedAt && (
                                        <p className="text-xs text-emerald-600 mt-1">
                                            Xử lý lúc: {formatDateTime(detailClaim.claim.resolvedAt)}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-2">
                            <button
                                onClick={() => { setDetailOpen(false); handleProcess(detailClaim); }}
                                className="px-4 py-2 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800 transition-colors flex items-center gap-1.5"
                            >
                                <CheckCircle className="w-4 h-4" />
                                Xử lý
                            </button>
                            <button
                                onClick={() => setDetailOpen(false)}
                                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Xử lý */}
            {processOpen && processClaim && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setProcessOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-900">Xử lý yêu cầu bảo hành</h2>
                            <button onClick={() => setProcessOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Thông tin claim */}
                            <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                                <p className="font-mono font-semibold text-blue-800 text-sm">{processClaim.claim.claimCode}</p>
                                <p className="text-sm font-medium text-gray-900">{processClaim.product?.name}</p>
                                <p className="text-xs text-gray-500">
                                    {REASON_LABELS[processClaim.claim.reason] || processClaim.claim.reason}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {processClaim.claim.customerName || processClaim.customerName} · {processClaim.claim.customerPhone || processClaim.customerPhone}
                                </p>
                            </div>

                            {/* Trạng thái */}
                            <div>
                                <label className="text-sm font-semibold text-gray-700 mb-2 block">Cập nhật trạng thái</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { value: 'approved', label: '✓ Duyệt', color: 'bg-blue-600 hover:bg-blue-700 text-white' },
                                        { value: 'rejected', label: '✕ Từ chối', color: 'bg-red-600 hover:bg-red-700 text-white' },
                                        { value: 'completed', label: '✓ Hoàn thành', color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
                                        { value: 'pending', label: '↩ Chờ xử lý', color: 'bg-amber-500 hover:bg-amber-600 text-white' },
                                    ].map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setProcessStatus(opt.value)}
                                            className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border-2 ${
                                                processStatus === opt.value
                                                    ? `${opt.color} border-transparent`
                                                    : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Ghi chú xử lý */}
                            <div>
                                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                                    Ghi chú xử lý {processStatus === 'rejected' && <span className="text-red-500">*</span>}
                                </label>
                                <textarea
                                    value={processNotes}
                                    onChange={(e) => setProcessNotes(e.target.value)}
                                    placeholder={
                                        processStatus === 'rejected'
                                            ? 'Vui lòng ghi rõ lý do từ chối...'
                                            : 'Ghi chú xử lý (VD: Đã đổi sản phẩm mới cho khách, đã gửi bảo hành hãng...)'
                                    }
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    maxLength={1000}
                                />
                                <p className="text-xs text-gray-400 mt-1 text-right">{processNotes.length}/1000</p>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
                            <button
                                onClick={() => setProcessOpen(false)}
                                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleSubmitProcess}
                                disabled={updatingId === processClaim.warrantyId}
                                className="px-4 py-2 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-60 flex items-center gap-1.5"
                            >
                                {updatingId === processClaim.warrantyId ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" /> Đang xử lý...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-4 h-4" /> Cập nhật
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
