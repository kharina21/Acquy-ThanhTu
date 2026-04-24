import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
    getWarranties,
    updateWarrantyClaim,
    getWarrantyStats,
} from '@/services/warrantyService';
import { toast } from 'sonner';
import {
    Shield,
    ShieldCheck,
    ShieldX,
    Search,
    ChevronLeft,
    ChevronRight,
    Package,
    Calendar,
    Clock,
    AlertCircle,
    CheckCircle,
    XCircle,
    RefreshCw,
    Eye,
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

const CLAIM_STATUS_LABELS = {
    pending: 'Chờ xử lý',
    approved: 'Đã duyệt',
    rejected: 'Từ chối',
    completed: 'Hoàn thành',
};

const CLAIM_STATUS_BADGES = {
    pending: 'badge-warning',
    approved: 'badge-info',
    rejected: 'badge-error',
    completed: 'badge-success',
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
        <div className="stat bg-base-100 border border-base-200 rounded-xl shadow-sm">
            <div className="stat-figure text-3xl">
                <Icon className={`w-8 h-8 ${colorClass}`} />
            </div>
            <div className="stat-title text-xs text-base-content/60">{label}</div>
            <div className="stat-value text-2xl font-bold">{value ?? 0}</div>
        </div>
    );
}

// ── Warranty Detail Modal ───────────────────────────────────────────────
function WarrantyDetailModal({ warranty, onClose, onUpdateClaim }) {
    const [selectedClaim, setSelectedClaim] = useState(null);
    const [claimNotes, setClaimNotes] = useState('');
    const [updating, setUpdating] = useState(false);

    if (!warranty) return null;

    const isExpired = warranty.isExpired;

    const handleUpdateClaim = async (claimCode, newStatus) => {
        setUpdating(true);
        try {
            const res = await updateWarrantyClaim(warranty._id, claimCode, { status: newStatus, notes: claimNotes });
            if (res?.success) {
                toast.success('Cập nhật thành công!');
                setSelectedClaim(null);
                setClaimNotes('');
                onUpdateClaim();
            } else {
                toast.error(res?.message || 'Cập nhật thất bại.');
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Lỗi khi cập nhật.');
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="modal modal-open">
            <div className="modal-box max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-700" />
                    Chi tiết bảo hành
                </h3>
                <p className="text-sm text-base-content/60 mb-4">
                    Mã: <span className="font-mono font-semibold text-base-content">{warranty.warrantyCode}</span>
                </p>

                <div className="space-y-4">
                    {/* Trạng thái */}
                    <div className="flex items-center gap-3">
                        {isExpired ? (
                            <span className="badge badge-error gap-1 border-0">
                                <ShieldX className="w-3 h-3" /> Hết hạn
                            </span>
                        ) : (
                            <span className="badge badge-success gap-1 border-0">
                                <ShieldCheck className="w-3 h-3" /> Còn hạn
                            </span>
                        )}
                        {warranty.hasPendingClaim && (
                            <span className="badge badge-warning gap-1 border-0">
                                <Clock className="w-3 h-3" /> Có yêu cầu chờ
                            </span>
                        )}
                    </div>

                    {/* Thông tin sản phẩm */}
                    <div className="rounded-xl bg-base-100 border border-base-200 p-4 space-y-2 text-sm">
                        <h4 className="font-semibold text-base-content/70 text-xs uppercase tracking-wide">Sản phẩm</h4>
                        <div className="flex items-center gap-3">
                            <div className="w-14 h-14 rounded-lg border border-base-200 overflow-hidden shrink-0 bg-base-200 flex items-center justify-center">
                                {warranty.product?.image ? (
                                    <img src={warranty.product.image} alt="" className="w-full h-full object-contain p-0.5" />
                                ) : (
                                    <Package className="w-6 h-6 text-base-content/30" />
                                )}
                            </div>
                            <div>
                                <p className="font-semibold">{warranty.product?.name || '—'}</p>
                                <p className="text-base-content/60 text-xs font-mono">SKU: {warranty.product?.sku || '—'}</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-base-content/60">
                            <span>BH: <strong>{warranty.warrantyText || `${warranty.warrantyMonths} tháng`}</strong></span>
                            <span>Ngày mua: <strong>{formatDate(warranty.purchaseDate)}</strong></span>
                            <span>Hạn: <strong>{formatDate(warranty.warrantyEndDate)}</strong></span>
                            <span>Giá: <strong>{formatVND(warranty.product?.price)}</strong></span>
                        </div>
                    </div>

                    {/* Thông tin khách */}
                    <div className="rounded-xl bg-base-100 border border-base-200 p-4 text-sm">
                        <h4 className="font-semibold text-base-content/70 text-xs uppercase tracking-wide mb-2">Khách hàng</h4>
                        <div className="space-y-1">
                            <p className="font-medium">{warranty.customer?.name || '—'}</p>
                            <p className="text-base-content/60 text-xs">Điện thoại: {warranty.customer?.phone || '—'}</p>
                            <p className="text-base-content/60 text-xs">
                                Mã hóa đơn: <span className="font-mono">{warranty.orderCode}</span>
                            </p>
                        </div>
                    </div>

                    {/* Yêu cầu bảo hành */}
                    {warranty.claims?.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-base-content/70 text-xs uppercase tracking-wide mb-2">
                                Lịch sử yêu cầu ({warranty.claims.length})
                            </h4>
                            <div className="space-y-2">
                                {warranty.claims.slice().reverse().map((claim) => (
                                    <div key={claim.claimCode} className="rounded-lg border border-base-200 bg-base-100 p-3 text-sm">
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs font-semibold">{claim.claimCode}</span>
                                                <span className={`badge ${CLAIM_STATUS_BADGES[claim.status]} gap-1 border-0 text-xs`}>
                                                    {CLAIM_STATUS_LABELS[claim.status]}
                                                </span>
                                            </div>
                                            {claim.status === 'pending' && (
                                                <button
                                                    className="btn btn-xs btn-outline btn-primary gap-1"
                                                    onClick={() => {
                                                        setSelectedClaim(claim);
                                                        setClaimNotes('');
                                                    }}
                                                >
                                                    <RefreshCw className="w-3 h-3" />
                                                    Xử lý
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-xs text-base-content/70">
                                            <span className="font-medium">Lý do:</span> {REASON_LABELS[claim.reason] || claim.reason}
                                        </p>
                                        {claim.description && (
                                            <p className="text-xs text-base-content/60 mt-1">
                                                <span className="font-medium">Mô tả:</span> {claim.description}
                                            </p>
                                        )}
                                        <p className="text-xs text-base-content/40 mt-1">
                                            Gửi lúc: {formatDate(claim.createdAt)}
                                        </p>
                                        {claim.notes && (
                                            <p className="text-xs text-blue-700 mt-1 bg-blue-50 p-2 rounded">
                                                <span className="font-medium">Ghi chú:</span> {claim.notes}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {warranty.claims?.length === 0 && (
                        <div className="rounded-lg border border-dashed border-base-300 p-4 text-center text-sm text-base-content/50">
                            Chưa có yêu cầu bảo hành nào.
                        </div>
                    )}
                </div>

                {/* Modal xử lý claim */}
                {selectedClaim && (
                    <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                        <h4 className="font-semibold text-sm">Xử lý yêu cầu: {selectedClaim.claimCode}</h4>
                        <div>
                            <label className="text-xs text-base-content/60 mb-1 block">Ghi chú</label>
                            <textarea
                                className="textarea textarea-bordered w-full text-sm"
                                rows={2}
                                value={claimNotes}
                                onChange={(e) => setClaimNotes(e.target.value)}
                                placeholder="Nhập ghi chú xử lý..."
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                className="btn btn-sm btn-success gap-1"
                                disabled={updating}
                                onClick={() => handleUpdateClaim(selectedClaim.claimCode, 'approved')}
                            >
                                <CheckCircle className="w-3 h-3" />
                                Duyệt
                            </button>
                            <button
                                className="btn btn-sm btn-outline btn-error gap-1"
                                disabled={updating}
                                onClick={() => handleUpdateClaim(selectedClaim.claimCode, 'rejected')}
                            >
                                <XCircle className="w-3 h-3" />
                                Từ chối
                            </button>
                            <button
                                className="btn btn-sm btn-outline gap-1"
                                disabled={updating}
                                onClick={() => handleUpdateClaim(selectedClaim.claimCode, 'completed')}
                            >
                                <CheckCircle className="w-3 h-3" />
                                Hoàn thành
                            </button>
                            <button
                                className="btn btn-sm btn-ghost gap-1"
                                onClick={() => setSelectedClaim(null)}
                            >
                                Hủy
                            </button>
                        </div>
                    </div>
                )}

                <div className="modal-action">
                    <button className="btn" onClick={onClose}>
                        Đóng
                    </button>
                </div>
            </div>
            <div className="modal-backdrop" onClick={onClose} />
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────
export default function WarrantyManagementPage() {
    // State
    const [warranties, setWarranties] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState(null);

    // Filters
    const [searchCode, setSearchCode] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // Pagination
    const [page, setPage] = useState(1);

    // Detail modal
    const [selectedWarranty, setSelectedWarranty] = useState(null);

    // Load warranties
    const loadWarranties = async (pageNum = 1) => {
        setLoading(true);
        try {
            const params = { page: pageNum, limit: 20 };
            if (searchCode.trim()) params.orderCode = searchCode.trim();
            if (statusFilter) params.status = statusFilter;

            const res = await getWarranties(params);
            if (res?.success) {
                setWarranties(res.data.warranties);
                setPagination(res.data.pagination);
                setPage(pageNum);
            }
        } catch (err) {
            toast.error('Lỗi khi tải danh sách bảo hành.');
        } finally {
            setLoading(false);
        }
    };

    // Load stats
    const loadStats = async () => {
        try {
            const res = await getWarrantyStats();
            if (res?.success) setStats(res.data);
        } catch (err) {
            console.warn('loadStats failed:', err.message);
        }
    };

    useEffect(() => {
        loadWarranties(1);
        loadStats();
    }, []);

    useEffect(() => {
        loadWarranties(page);
    }, [statusFilter]);

    const handleSearch = (e) => {
        e.preventDefault();
        loadWarranties(1);
    };

    const goPage = (p) => {
        if (!pagination) return;
        if (p < 1 || p > pagination.totalPages) return;
        loadWarranties(p);
    };

    const handleCloseModal = () => {
        setSelectedWarranty(null);
        loadWarranties(page);
        loadStats();
    };

    return (
        <div className="min-h-screen bg-base-200">
            {/* Header */}
            <div className="bg-base-100 border-b border-base-200 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Shield className="w-7 h-7 text-blue-700" />
                            Quản lý bảo hành
                        </h1>
                        <p className="text-sm text-base-content/60 mt-1">
                            Theo dõi và xử lý yêu cầu bảo hành sản phẩm
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Stats */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <StatCard
                            label="Còn hạn BH"
                            value={stats.totalActive}
                            icon={ShieldCheck}
                            colorClass="text-success"
                        />
                        <StatCard
                            label="Hết hạn BH"
                            value={stats.totalExpired}
                            icon={ShieldX}
                            colorClass="text-error"
                        />
                        <StatCard
                            label="Đang chờ xử lý"
                            value={stats.pendingClaims}
                            icon={Clock}
                            colorClass="text-warning"
                        />
                        <StatCard
                            label="Có yêu cầu BH"
                            value={stats.totalClaimed}
                            icon={AlertCircle}
                            colorClass="text-info"
                        />
                        <StatCard
                            label="Yêu cầu tháng này"
                            value={stats.claimedThisMonth}
                            icon={Calendar}
                            colorClass="text-primary"
                        />
                    </div>
                )}

                {/* Filters */}
                <div className="bg-base-100 rounded-xl border border-base-200 p-4">
                    <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3">
                        <div className="flex-1 min-w-[200px]">
                            <label className="label py-1">
                                <span className="label-text text-xs font-semibold">Tìm theo mã hóa đơn</span>
                            </label>
                            <input
                                type="text"
                                value={searchCode}
                                onChange={(e) => setSearchCode(e.target.value)}
                                placeholder="ORD-2026-XXXX..."
                                className="input input-bordered w-full h-9 text-sm font-mono"
                            />
                        </div>
                        <div className="min-w-[160px]">
                            <label className="label py-1">
                                <span className="label-text text-xs font-semibold">Trạng thái BH</span>
                            </label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="select select-bordered w-full h-9 text-sm"
                            >
                                <option value="">Tất cả</option>
                                <option value="active">Còn hạn</option>
                                <option value="expired">Hết hạn</option>
                                <option value="claimed">Có yêu cầu</option>
                            </select>
                        </div>
                        <button type="submit" className="btn btn-primary btn-sm gap-1 h-9">
                            <Search className="w-4 h-4" />
                            Tìm kiếm
                        </button>
                        <button
                            type="button"
                            className="btn btn-outline btn-sm gap-1 h-9"
                            onClick={() => {
                                setSearchCode('');
                                setStatusFilter('');
                                loadWarranties(1);
                            }}
                        >
                            <RefreshCw className="w-4 h-4" />
                            Reset
                        </button>
                    </form>
                </div>

                {/* Table */}
                <div className="bg-base-100 rounded-xl border border-base-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="table table-sm">
                            <thead>
                                <tr className="bg-base-200 text-xs uppercase">
                                    <th>Mã BH</th>
                                    <th>Sản phẩm</th>
                                    <th>Khách hàng</th>
                                    <th>Ngày mua</th>
                                    <th>Hạn BH</th>
                                    <th>Trạng thái</th>
                                    <th>Yêu cầu</th>
                                    <th className="text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="text-center py-8">
                                            <span className="loading loading-spinner loading-md text-primary" />
                                        </td>
                                    </tr>
                                ) : warranties.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="text-center py-8 text-base-content/50 text-sm">
                                            Không có bảo hành nào.
                                        </td>
                                    </tr>
                                ) : (
                                    warranties.map((w) => (
                                        <tr key={w._id} className="hover">
                                            <td>
                                                <span className="font-mono text-xs font-semibold text-blue-700">
                                                    {w.warrantyCode}
                                                </span>
                                                <p className="text-[10px] text-base-content/40 font-mono mt-0.5">
                                                    {w.orderCode}
                                                </p>
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded border border-base-200 overflow-hidden shrink-0 bg-base-200 flex items-center justify-center">
                                                        {w.product?.image ? (
                                                            <img src={w.product.image} alt="" className="w-full h-full object-contain p-0.5" />
                                                        ) : (
                                                            <Package className="w-4 h-4 text-base-content/30" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium leading-tight truncate max-w-[160px]">
                                                            {w.product?.name || '—'}
                                                        </p>
                                                        <p className="text-[10px] text-base-content/40 font-mono">
                                                            {w.product?.sku || '—'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <p className="text-sm">{w.customer?.name || '—'}</p>
                                                <p className="text-[10px] text-base-content/40">{w.customer?.phone || '—'}</p>
                                            </td>
                                            <td className="text-sm text-base-content/70 whitespace-nowrap">
                                                {formatDate(w.purchaseDate)}
                                            </td>
                                            <td className="text-sm whitespace-nowrap">
                                                <span className={w.isExpired ? 'text-error font-medium' : 'text-success font-medium'}>
                                                    {formatDate(w.warrantyEndDate)}
                                                </span>
                                            </td>
                                            <td>
                                                {w.isExpired ? (
                                                    <span className="badge badge-error gap-1 border-0 text-xs">
                                                        <ShieldX className="w-3 h-3" /> Hết hạn
                                                    </span>
                                                ) : w.hasPendingClaim ? (
                                                    <span className="badge badge-warning gap-1 border-0 text-xs">
                                                        <Clock className="w-3 h-3" /> Chờ xử lý
                                                    </span>
                                                ) : (
                                                    <span className="badge badge-success gap-1 border-0 text-xs">
                                                        <ShieldCheck className="w-3 h-3" /> Còn hạn
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                {w.claimsCount > 0 ? (
                                                    <span className={`badge ${CLAIM_STATUS_BADGES[w.latestClaim?.status] || 'badge-warning'} border-0 text-xs`}>
                                                        {CLAIM_STATUS_LABELS[w.latestClaim?.status] || 'Chờ'}
                                                    </span>
                                                ) : (
                                                    <span className="badge badge-ghost border-0 text-xs">—</span>
                                                )}
                                            </td>
                                            <td className="text-right">
                                                <button
                                                    className="btn btn-xs btn-outline btn-primary gap-1"
                                                    onClick={() => setSelectedWarranty(w)}
                                                >
                                                    <Eye className="w-3 h-3" />
                                                    Chi tiết
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pagination && pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-base-200">
                            <p className="text-sm text-base-content/60">
                                Trang {pagination.page} / {pagination.totalPages} — {pagination.total} bảo hành
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    className="btn btn-sm btn-outline gap-1"
                                    disabled={page <= 1}
                                    onClick={() => goPage(page - 1)}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Trước
                                </button>
                                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                    let pageNum;
                                    if (pagination.totalPages <= 5) {
                                        pageNum = i + 1;
                                    } else if (page <= 3) {
                                        pageNum = i + 1;
                                    } else if (page >= pagination.totalPages - 2) {
                                        pageNum = pagination.totalPages - 4 + i;
                                    } else {
                                        pageNum = page - 2 + i;
                                    }
                                    return (
                                        <button
                                            key={pageNum}
                                            className={`btn btn-sm ${page === pageNum ? 'btn-primary' : 'btn-outline'}`}
                                            onClick={() => goPage(pageNum)}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                                <button
                                    className="btn btn-sm btn-outline gap-1"
                                    disabled={page >= pagination.totalPages}
                                    onClick={() => goPage(page + 1)}
                                >
                                    Sau
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Ghi chú */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
                    <p className="font-semibold mb-1">Hướng dẫn</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-700 text-xs">
                        <li>Bảo hành được tự động tạo khi khách thanh toán đơn hàng thành công.</li>
                        <li>Thời gian bảo hành được tính từ ngày mua trên hóa đơn.</li>
                        <li>Yêu cầu bảo hành được xử lý: Duyệt / Từ chối / Hoàn thành.</li>
                        <li>Khách hàng có thể tra cứu bảo hành bằng mã hóa đơn tại trang <code className="bg-blue-100 px-1 rounded">/warranty</code>.</li>
                    </ul>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedWarranty && (
                <WarrantyDetailModal
                    warranty={selectedWarranty}
                    onClose={handleCloseModal}
                    onUpdateClaim={handleCloseModal}
                />
            )}
        </div>
    );
}
