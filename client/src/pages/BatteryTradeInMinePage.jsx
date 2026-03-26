import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthStore } from '@/stores/useAuthStore';
import { getMyBatteryTradeIns } from '@/services/batteryTradeInService';
import { toast } from 'sonner';
import {
    ArrowLeft,
    Package,
    LogIn,
    ClipboardList,
    ChevronLeft,
    ChevronRight,
    Info,
    User,
    Phone,
    Mail,
    MapPin,
    Calendar,
    Clock,
    Eye,
} from 'lucide-react';

const STATUS_META = {
    pending: { label: 'Đang xử lý', badge: 'bg-amber-100 text-amber-900 border-amber-200' },
    contacted: { label: 'Đã liên hệ', badge: 'bg-sky-100 text-sky-900 border-sky-200' },
    completed: { label: 'Hoàn tất', badge: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
    cancelled: { label: 'Đã hủy', badge: 'bg-gray-200 text-gray-800 border-gray-300' },
};

const LIMIT = 10;

const formatDateOnly = (d) => {
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

/** Nội dung chi tiết đơn (dữ liệu từ API /mine) */
function TradeInDetailBody({ req }) {
    if (!req) return null;
    const meta = STATUS_META[req.status] || STATUS_META.pending;
    const apt = req.appointmentLocationId;
    const aptObj = apt && typeof apt === 'object' ? apt : null;
    const completedProd = req.completedProductId;
    const completedProdObj = completedProd && typeof completedProd === 'object' ? completedProd : null;
    const locDone = req.locationId;
    const locDoneObj = locDone && typeof locDone === 'object' ? locDone : null;
    const pricingLabel = req.pricingType === 'weight' ? 'Theo cân (kg)' : 'Theo Ampe (Ah)';
    const pricingVal =
        req.pricingType === 'weight' ? (req.weightKg != null ? `${req.weightKg} kg` : '—') : (req.remainingAmps != null ? `${req.remainingAmps} Ah` : '—');

    return (
        <div className="space-y-5 text-sm text-gray-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono font-semibold text-lg text-blue-900">{req.requestCode}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${meta.badge}`}>{meta.label}</span>
            </div>

            <div className="space-y-2 border-t border-gray-100 pt-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Liên hệ</p>
                <p className="flex items-start gap-2">
                    <User className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    <span>{req.name || '—'}</span>
                </p>
                <p className="flex items-start gap-2">
                    <Phone className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    <span>{req.phone || '—'}</span>
                </p>
                <p className="flex items-start gap-2 break-all">
                    <Mail className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    <span>{req.email || '—'}</span>
                </p>
                {req.address && (
                    <p className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                        <span>{req.address}</span>
                    </p>
                )}
                {req.note ? (
                    <p className="text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                        <span className="text-gray-500">Ghi chú:</span> {req.note}
                    </p>
                ) : null}
            </div>

            <div className="space-y-2 border-t border-gray-100 pt-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ắc quy</p>
                <p className="flex items-start gap-2">
                    <Package className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    <span>
                        {req.batteryName || '—'}
                        {req.quantity != null ? ` · ×${req.quantity}` : ''}
                    </span>
                </p>
                <p className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    <span>
                        SX: {formatDateOnly(req.manufacturingDate)} · HSD: {formatDateOnly(req.expiryDate)}
                    </span>
                </p>
                {req.condition ? (
                    <p>
                        <span className="text-gray-500">Tình trạng:</span> {req.condition}
                    </p>
                ) : null}
                {req.usageDuration ? (
                    <p>
                        <span className="text-gray-500">Đã dùng:</span> {req.usageDuration}
                    </p>
                ) : null}
                <p>
                    <span className="text-gray-500">Hoạt động tốt:</span>{' '}
                    {req.isWorkingWell === true ? 'Có' : req.isWorkingWell === false ? 'Không' : '—'}
                </p>
                <p>
                    <span className="text-gray-500">Định giá:</span> {pricingLabel} — {pricingVal}
                </p>
            </div>

            {Array.isArray(req.images) && req.images.length > 0 && (
                <div className="border-t border-gray-100 pt-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ảnh đính kèm</p>
                    <div className="flex flex-wrap gap-2">
                        {req.images.map((url, i) => (
                            <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block rounded-lg overflow-hidden border border-gray-200 w-20 h-20 shrink-0"
                            >
                                <img src={url} alt="" className="w-full h-full object-cover" />
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {(req.status === 'contacted' || req.status === 'completed') && req.appointmentAt && (
                <div className="rounded-lg bg-sky-50 border border-sky-100 p-4 space-y-2">
                    <p className="font-medium text-sky-900 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Lịch hẹn đã xác nhận
                    </p>
                    <p>
                        <span className="text-gray-600">Thời gian:</span>{' '}
                        <strong>{formatDateTime(req.appointmentAt)}</strong>
                    </p>
                    {aptObj ? (
                        <>
                            <p>
                                <span className="text-gray-600">Cơ sở:</span>{' '}
                                <strong>{aptObj.name || aptObj.code || '—'}</strong>
                            </p>
                            {aptObj.address && (
                                <p className="flex items-start gap-2 text-gray-700">
                                    <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                                    {aptObj.address}
                                </p>
                            )}
                            {aptObj.phone && (
                                <p className="flex items-center gap-2 text-gray-700">
                                    <Phone className="w-4 h-4 shrink-0" />
                                    {aptObj.phone}
                                </p>
                            )}
                        </>
                    ) : (
                        <p className="text-gray-600 text-xs">Thông tin chi nhánh đang cập nhật.</p>
                    )}
                </div>
            )}

            {req.status === 'completed' && req.completedAmount != null && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-4 space-y-2">
                    <p className="font-medium text-emerald-900">Hoàn tất thu mua</p>
                    <p>
                        <span className="text-gray-600">Số tiền:</span>{' '}
                        <strong className="text-emerald-800">{formatVND(req.completedAmount)}</strong>
                    </p>
                    <p>
                        <span className="text-gray-600">Sản phẩm thu được:</span>{' '}
                        {(req.completedProductName && String(req.completedProductName).trim()) ||
                            completedProdObj?.name ||
                            '—'}
                    </p>
                    <p>
                        <span className="text-gray-600">Chi nhánh:</span>{' '}
                        {locDoneObj?.name || locDoneObj?.code || '—'}
                    </p>
                    {req.completedAt && (
                        <p>
                            <span className="text-gray-600">Thời điểm:</span> {formatDateTime(req.completedAt)}
                        </p>
                    )}
                    {req.completedNote ? (
                        <p className="text-gray-700 pt-1 border-t border-emerald-100">{req.completedNote}</p>
                    ) : null}
                </div>
            )}

            {req.status === 'cancelled' && (req.cancelledReason || req.cancelledAt) && (
                <div className="rounded-lg bg-red-50 border border-red-100 p-4 space-y-1">
                    <p className="font-medium text-red-900">Đã hủy / từ chối</p>
                    {req.cancelledAt && <p className="text-gray-700">Thời điểm: {formatDateTime(req.cancelledAt)}</p>}
                    {req.cancelledReason ? <p className="text-gray-700">Lý do: {req.cancelledReason}</p> : null}
                </div>
            )}

            <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">
                Cập nhật: {formatDateTime(req.updatedAt)} · Gửi lúc: {formatDateTime(req.createdAt)}
            </p>
        </div>
    );
}

export default function BatteryTradeInMinePage() {
    const { user, accessToken, logout } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [requests, setRequests] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [page, setPage] = useState(1);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailReq, setDetailReq] = useState(null);

    const handleLogout = async () => {
        try {
            await logout();
            toast.success('Đã đăng xuất thành công !');
        } catch {
            toast.error('Lỗi khi đăng xuất !');
        }
    };

    const fetchMine = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getMyBatteryTradeIns({ page, limit: LIMIT });
            const data = res?.data;
            setRequests(data?.requests || []);
            const pag = data?.pagination || {};
            setPagination({
                page: pag.page ?? page,
                totalPages: Math.max(1, pag.totalPages ?? 1),
                total: pag.total ?? 0,
            });
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Lỗi khi tải danh sách');
            setRequests([]);
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => {
        if (!accessToken) return;
        fetchMine();
    }, [accessToken, fetchMine]);

    const formatDate = (d) => {
        if (!d) return '—';
        return new Date(d).toLocaleString('vi-VN');
    };

    const openDetail = (req) => {
        setDetailReq(req);
        setDetailOpen(true);
    };

    if (!accessToken) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <Header user={user} onLogout={handleLogout} />
                <main className="flex-1 container mx-auto px-4 py-10 max-w-lg">
                    <nav className="mb-6">
                        <Link
                            to="/battery-trade-in"
                            className="inline-flex items-center gap-2 text-sm text-blue-700 hover:underline"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Thu cũ đổi mới
                        </Link>
                    </nav>
                    <Card className="border-0 shadow-lg overflow-hidden">
                        <CardHeader className="bg-blue-900 text-white py-6">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <ClipboardList className="w-5 h-5" />
                                Đơn thu cũ của bạn
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="flex gap-3 rounded-lg bg-amber-50 border border-amber-100 p-4 text-sm text-amber-950">
                                <Info className="w-5 h-5 shrink-0 mt-0.5" />
                                <p>
                                    Vui lòng <strong>đăng nhập</strong> để xem các yêu cầu thu cũ đã gửi bằng tài khoản của
                                    bạn. Đơn gửi khi chưa đăng nhập chỉ tra cứu được bằng <strong>mã + Gmail</strong> ở
                                    trang tra cứu.
                                </p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                <Button asChild className="bg-blue-700 hover:bg-blue-800 w-full sm:w-auto">
                                    <Link to="/login" className="gap-2">
                                        <LogIn className="w-4 h-4" />
                                        Đăng nhập
                                    </Link>
                                </Button>
                                <Button asChild variant="outline" className="w-full sm:w-auto">
                                    <Link to="/register">Đăng ký tài khoản</Link>
                                </Button>
                            </div>
                            <p className="text-xs text-gray-500 pt-2">
                                <Link to="/battery-trade-in/tra-cuu" className="text-blue-700 hover:underline font-medium">
                                    Tra cứu bằng mã và email
                                </Link>{' '}
                                — không cần đăng nhập.
                            </p>
                        </CardContent>
                    </Card>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header user={user} onLogout={handleLogout} />

            <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
                <nav className="mb-6">
                    <Link
                        to="/battery-trade-in"
                        className="inline-flex items-center gap-2 text-sm text-blue-700 hover:underline"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Gửi yêu cầu thu cũ
                    </Link>
                </nav>

                <h1 className="text-2xl md:text-3xl font-bold text-blue-900 mb-1 flex items-center gap-2">
                    <ClipboardList className="w-8 h-8 text-blue-800" />
                    Đơn thu cũ của bạn
                </h1>
                <p className="text-gray-600 text-sm mb-6">
                    Các yêu cầu đã gửi khi bạn đã đăng nhập (gắn với tài khoản).
                    {!loading && pagination.total > 0 && (
                        <span className="text-gray-500"> · {pagination.total} yêu cầu</span>
                    )}
                </p>

                <div className="rounded-lg bg-blue-50/80 border border-blue-100 px-4 py-3 text-sm text-blue-900 mb-6 flex gap-2">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                        Đơn gửi <strong>trước khi đăng nhập</strong> hoặc khi chưa đăng nhập không hiển thị ở đây — dùng{' '}
                        <Link to="/battery-trade-in/tra-cuu" className="font-medium underline">
                            tra cứu mã + Gmail
                        </Link>
                        .
                    </span>
                </div>

                {loading ? (
                    <div className="flex justify-center py-16">
                        <span className="loading loading-spinner loading-lg text-primary" />
                    </div>
                ) : requests.length === 0 ? (
                    <Card className="border border-dashed border-gray-200 bg-white">
                        <CardContent className="py-12 text-center text-gray-600">
                            <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                            <p className="font-medium text-gray-800">Chưa có đơn thu cũ nào</p>
                            <p className="text-sm mt-1 mb-4">Gửi yêu cầu thu cũ để hiển thị tại đây.</p>
                            <Button asChild className="bg-blue-700 hover:bg-blue-800">
                                <Link to="/battery-trade-in">Gửi yêu cầu thu cũ</Link>
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <ul className="space-y-3">
                            {requests.map((req) => {
                                const meta = STATUS_META[req.status] || STATUS_META.pending;
                                return (
                                    <li
                                        key={req._id}
                                        className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 sm:p-5"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                                            <span className="font-mono font-semibold text-blue-900">{req.requestCode}</span>
                                            <span
                                                className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${meta.badge}`}
                                            >
                                                {meta.label}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-800 font-medium">{req.batteryName || '—'}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Số lượng: {req.quantity ?? 1} · Gửi lúc {formatDate(req.createdAt)}
                                        </p>
                                        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => openDetail(req)}
                                                className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg px-3 py-1.5"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                Xem chi tiết
                                            </button>
                                            <Link
                                                to={`/battery-trade-in/tra-cuu?code=${encodeURIComponent(req.requestCode)}&email=${encodeURIComponent(req.email || '')}`}
                                                className="text-xs font-medium text-blue-700 hover:underline"
                                            >
                                                Mở tra cứu
                                            </Link>
                                            {req.status === 'pending' && (
                                                <Link
                                                    to={`/battery-trade-in?edit=1&code=${encodeURIComponent(req.requestCode)}&email=${encodeURIComponent(req.email || '')}`}
                                                    className="text-xs font-medium text-blue-700 hover:underline"
                                                >
                                                    Sửa đơn
                                                </Link>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>

                        {pagination.totalPages > 1 && (
                            <div className="flex justify-center items-center gap-2 mt-8">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-ghost gap-1"
                                    disabled={page <= 1}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Trước
                                </button>
                                <span className="text-sm text-gray-600 px-2">
                                    {page} / {pagination.totalPages}
                                </span>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-ghost gap-1"
                                    disabled={page >= pagination.totalPages}
                                    onClick={() => setPage((p) => p + 1)}
                                >
                                    Sau
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </main>

            <Dialog
                open={detailOpen}
                onOpenChange={(open) => {
                    setDetailOpen(open);
                    if (!open) setDetailReq(null);
                }}
            >
                <DialogContent className="max-w-lg max-h-[min(90vh,720px)] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-blue-900">Chi tiết yêu cầu thu cũ</DialogTitle>
                    </DialogHeader>
                    {detailReq && <TradeInDetailBody req={detailReq} />}
                </DialogContent>
            </Dialog>

            <Footer />
        </div>
    );
}
