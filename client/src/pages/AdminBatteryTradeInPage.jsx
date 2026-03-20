import { useEffect, useState } from 'react';
import { getBatteryTradeInList, updateBatteryTradeInStatus } from '@/services/batteryTradeInService';
import { toast } from 'sonner';
import { RotateCw, ChevronDown, ChevronUp, Phone, Mail, MapPin, Package, Calendar } from 'lucide-react';

const STATUS_LABELS = {
    pending: 'Đang xử lý',
    contacted: 'Đã liên hệ',
    completed: 'Đã xác nhận',
    cancelled: 'Đã hủy',
};

const STATUS_OPTIONS = [
    { value: 'pending', label: 'Đang xử lý' },
    { value: 'contacted', label: 'Đã liên hệ' },
    { value: 'completed', label: 'Đã xác nhận' },
];

function formatDate(d) {
    if (!d) return '—';
    const date = new Date(d);
    return date.toLocaleDateString('vi-VN');
}

export default function AdminBatteryTradeInPage() {
    const [requests, setRequests] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ status: '', search: '' });
    const [appliedSearch, setAppliedSearch] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const [updatingId, setUpdatingId] = useState(null);

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

    const handleUpdateStatus = async (id, status) => {
        setUpdatingId(id);
        try {
            await updateBatteryTradeInStatus(id, status);
            toast.success('Cập nhật trạng thái thành công');
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
        <div className="flex-1 p-6 bg-base-200 overflow-y-auto">
            <div className="container mx-auto space-y-4">
                <h1 className="text-2xl font-bold text-base-content flex items-center gap-2">
                    <RotateCw className="w-7 h-7" />
                    Yêu cầu thu cũ acquy
                </h1>

                <div className="flex flex-wrap gap-2 items-center">
                    <select
                        className="select select-bordered select-sm w-44"
                        value={filters.status}
                        onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                    >
                        <option value="">Tất cả trạng thái</option>
                        {Object.entries(STATUS_LABELS).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                        ))}
                    </select>
                    <input
                        type="text"
                        placeholder="Tìm theo tên, SĐT, email..."
                        className="input input-bordered input-sm w-56"
                        value={filters.search}
                        onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && setAppliedSearch(filters.search)}
                    />
                    <button className="btn btn-sm btn-primary" onClick={() => setAppliedSearch(filters.search)}>Tìm</button>
                </div>

                <div className="bg-base-100 rounded-lg shadow-lg overflow-hidden">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <span className="loading loading-spinner loading-lg text-primary" />
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="text-center py-12 text-base-content/60">Chưa có yêu cầu nào</div>
                    ) : (
                        <div className="divide-y divide-base-300">
                            {requests.map((req) => {
                                const isExpanded = expandedId === req._id;
                                const batteryDisplay = req.productId?.name || req.batteryName || '—';
                                const pricingDisplay = req.pricingType === 'weight'
                                    ? `${req.weightKg || '—'} kg`
                                    : `${req.remainingAmps || '—'} Ah`;

                                return (
                                    <div key={req._id} className="p-4">
                                        <div
                                            className="flex flex-wrap items-center justify-between gap-2 cursor-pointer"
                                            onClick={() => toggleExpand(req._id)}
                                        >
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <span className="text-base-content/70">{isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}</span>
                                                <div className="min-w-0">
                                                    <p className="font-medium truncate">{req.name}</p>
                                                    <p className="text-sm text-base-content/60">{req.phone} • {req.email}</p>
                                                </div>
                                                <span className="badge badge-ghost">{batteryDisplay} × {req.quantity ?? 1}</span>
                                                <span
                                                    className={`badge ${
                                                        req.status === 'completed' ? 'badge-success' :
                                                        req.status === 'contacted' ? 'badge-info' :
                                                        req.status === 'cancelled' ? 'badge-ghost' :
                                                        'badge-warning'
                                                    }`}
                                                >
                                                    {STATUS_LABELS[req.status] || req.status}
                                                </span>
                                            </div>
                                            <span className="text-sm text-base-content/50">{formatDate(req.createdAt)}</span>
                                        </div>

                                        {isExpanded && (
                                            <div className="mt-4 pl-8 space-y-4 border-l-2 border-base-300 ml-2">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <h4 className="font-semibold text-sm text-base-content/70 mb-2">Thông tin khách hàng</h4>
                                                        <div className="space-y-1 text-sm">
                                                            <p><Phone className="w-4 h-4 inline mr-2" />{req.phone}</p>
                                                            <p><Mail className="w-4 h-4 inline mr-2" />{req.email}</p>
                                                            {req.address && <p><MapPin className="w-4 h-4 inline mr-2" />{req.address}</p>}
                                                            {req.note && <p className="text-base-content/70">Ghi chú: {req.note}</p>}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-sm text-base-content/70 mb-2">Thông tin acquy</h4>
                                                        <div className="space-y-1 text-sm">
                                                            <p><Package className="w-4 h-4 inline mr-2" />{batteryDisplay}</p>
                                                            <p>Số lượng: <strong>{req.quantity ?? 1}</strong></p>
                                                            <p><Calendar className="w-4 h-4 inline mr-2" />SX: {formatDate(req.manufacturingDate)} | HSD: {formatDate(req.expiryDate)}</p>
                                                            <p>Tình trạng: {req.condition || '—'} | Đã dùng: {req.usageDuration || '—'}</p>
                                                            <p>Hoạt động tốt: {req.isWorkingWell === true ? 'Có' : req.isWorkingWell === false ? 'Không' : '—'}</p>
                                                            <p>Định giá: {req.pricingType === 'weight' ? 'Theo cân' : 'Theo Ampe'} — {pricingDisplay}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {req.images?.length > 0 && (
                                                    <div>
                                                        <h4 className="font-semibold text-sm text-base-content/70 mb-2">Ảnh thực tế</h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {req.images.map((url, i) => (
                                                                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
                                                                    <img src={url} alt="" className="w-20 h-20 object-cover rounded border" />
                                                                </a>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex flex-wrap gap-2 pt-2">
                                                    {STATUS_OPTIONS.map(({ value, label }) => (
                                                        <button
                                                            key={value}
                                                            className={`btn btn-sm ${req.status === value ? 'btn-primary' : 'btn-ghost'}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleUpdateStatus(req._id, value);
                                                            }}
                                                            disabled={updatingId === req._id}
                                                        >
                                                            {updatingId === req._id ? <span className="loading loading-spinner loading-xs" /> : label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {pagination.totalPages > 1 && (
                        <div className="flex justify-center gap-2 p-4 border-t border-base-300">
                            <button
                                className="btn btn-sm btn-ghost"
                                disabled={pagination.page <= 1}
                                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                            >
                                Trước
                            </button>
                            <span className="flex items-center px-4 text-sm">
                                Trang {pagination.page} / {pagination.totalPages}
                            </span>
                            <button
                                className="btn btn-sm btn-ghost"
                                disabled={pagination.page >= pagination.totalPages}
                                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                            >
                                Sau
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
