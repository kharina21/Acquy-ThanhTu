import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { lookupWarrantyByOrderCode, createWarrantyClaim } from '@/services/warrantyService';
import { useAuthStore } from '@/stores/useAuthStore';
import {
    Search,
    Package,
    Calendar,
    Shield,
    ShieldCheck,
    ShieldX,
    Clock,
    CheckCircle,
    AlertCircle,
    ArrowLeft,
    ShoppingBag,
    FileText,
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────────
const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatDateTime = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });
};

const getDaysRemaining = (endDate) => {
    if (!endDate) return null;
    const now = new Date();
    const end = new Date(endDate);
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return diff;
};

const REASON_LABELS = {
    product_damage: 'Sản phẩm bị hư hỏng',
    product_defect: 'Lỗi từ nhà sản xuất',
    battery_leak: 'Ắc quy bị chảy nước',
    charging_issue: 'Không sạc được / sạc yếu',
    other: 'Lý do khác',
};

const CLAIM_STATUS_LABELS = {
    pending: 'Chờ xử lý',
    approved: 'Đã duyệt',
    rejected: 'Từ chối',
    completed: 'Hoàn thành',
};

const CLAIM_STATUS_STYLES = {
    pending: 'bg-amber-100 text-amber-900 border-amber-200',
    approved: 'bg-blue-100 text-blue-900 border-blue-200',
    rejected: 'bg-red-100 text-red-900 border-red-200',
    completed: 'bg-emerald-100 text-emerald-900 border-emerald-200',
};

export default function WarrantyLookupPage() {
    const { user, logout } = useAuthStore();
    const [searchParams] = useSearchParams();

    const [orderCode, setOrderCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [submittingClaim, setSubmittingClaim] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    // Modal tạo yêu cầu BH
    const [showClaimModal, setShowClaimModal] = useState(false);
    const [selectedWarranty, setSelectedWarranty] = useState(null);
    const [claimReason, setClaimReason] = useState('');
    const [claimDescription, setClaimDescription] = useState('');

    // Đọc mã từ URL query
    useEffect(() => {
        const code = searchParams.get('code');
        if (code) setOrderCode(code.trim().toUpperCase());
    }, [searchParams]);

    const handleLogout = async () => {
        try {
            await logout();
            toast.success('Đã đăng xuất!');
        } catch {
            toast.error('Lỗi khi đăng xuất!');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const code = orderCode.trim().toUpperCase();
        if (!code || code.length < 3) {
            toast.error('Vui lòng nhập mã hóa đơn (ít nhất 3 ký tự).');
            return;
        }
        setLoading(true);
        setResult(null);
        setError('');
        try {
            const res = await lookupWarrantyByOrderCode(code);
            if (res?.success && res?.data) {
                setResult(res.data);
            } else {
                setError(res?.message || 'Không tìm thấy hóa đơn nào.');
            }
        } catch (err) {
            const msg = err?.response?.data?.message || 'Không tìm thấy hóa đơn hoặc lỗi máy chủ.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenClaim = (warranty) => {
        setSelectedWarranty(warranty);
        setClaimReason('');
        setClaimDescription('');
        setShowClaimModal(true);
    };

    const handleSubmitClaim = async (e) => {
        e.preventDefault();
        if (!claimReason) {
            toast.error('Vui lòng chọn lý do bảo hành.');
            return;
        }

        if (!selectedWarranty?._id) {
            toast.error('Sản phẩm này chưa có thông tin bảo hành. Vui lòng liên hệ cửa hàng.');
            setShowClaimModal(false);
            return;
        }

        setSubmittingClaim(true);
        try {
            const res = await createWarrantyClaim(selectedWarranty._id, {
                reason: claimReason,
                description: claimDescription,
            });
            if (res?.success) {
                toast.success('Yêu cầu bảo hành đã được gửi thành công!');
                setShowClaimModal(false);
                // Refresh lại kết quả
                const refreshed = await lookupWarrantyByOrderCode(orderCode.trim().toUpperCase());
                if (refreshed?.success && refreshed?.data) {
                    setResult(refreshed.data);
                }
            } else {
                toast.error(res?.message || 'Gửi yêu cầu thất bại.');
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Lỗi khi gửi yêu cầu bảo hành.');
        } finally {
            setSubmittingClaim(false);
        }
    };

    const CHANNEL_LABEL = { online: 'Mua Online', in_store: 'Tại Quầy' };
    const ORDER_STATUS = { pending: 'Chờ xử lý', confirmed: 'Đã xác nhận', completed: 'Hoàn thành', cancelled: 'Đã hủy' };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header user={user} onLogout={handleLogout} />

            <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
                <nav className="mb-6">
                    <Link
                        to="/home"
                        className="inline-flex items-center gap-2 text-sm text-blue-700 hover:underline"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Quay về trang chủ
                    </Link>
                </nav>

                {/* ── Tiêu đề ── */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
                        <Shield className="w-8 h-8 text-blue-700" />
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-blue-900 mb-2">
                        Tra cứu bảo hành
                    </h1>
                    <p className="text-gray-600 text-sm">
                        Nhập <strong>mã hóa đơn</strong> trên hóa đơn mua hàng để xem thông tin bảo hành sản phẩm.
                        <br />
                        Mã hóa đơn có dạng: <code className="bg-gray-100 px-1 rounded">ORD-XXXX-XXXX</code>
                    </p>
                </div>

                {/* ── Form tra cứu ── */}
                <Card className="border-0 shadow-lg bg-white rounded-xl overflow-hidden mb-8">
                    <CardHeader className="bg-blue-900 text-white py-4">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <Search className="w-5 h-5" />
                            Nhập mã hóa đơn
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Label htmlFor="order-code">Mã hóa đơn *</Label>
                                <Input
                                    id="order-code"
                                    value={orderCode}
                                    onChange={(e) => setOrderCode(e.target.value.toUpperCase())}
                                    placeholder="ORD-2026-XXXXXX-ABCD"
                                    className="mt-1 h-11 font-mono tracking-wide text-base"
                                    autoComplete="off"
                                    autoFocus
                                />
                            </div>
                            {error && (
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    {error}
                                </div>
                            )}
                            <Button
                                type="submit"
                                className="w-full bg-blue-700 hover:bg-blue-800 h-11 text-base font-medium"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <span className="animate-spin mr-2">⏳</span>
                                        Đang tra cứu...
                                    </>
                                ) : (
                                    <>
                                        <Search className="w-4 h-4 mr-2" />
                                        Tra cứu bảo hành
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* ── Kết quả ── */}
                {result && (
                    <div className="space-y-6">
                        {/* Thông tin hóa đơn */}
                        <Card className="border border-gray-200 shadow-sm bg-white rounded-xl overflow-hidden">
                            <CardHeader className="bg-gray-50 border-b border-gray-100 py-3 px-6">
                                <CardTitle className="text-base text-gray-800 flex items-center gap-2">
                                    <ShoppingBag className="w-4 h-4 text-gray-600" />
                                    Thông tin hóa đơn
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                        <p className="text-gray-500 text-xs mb-1">Mã hóa đơn</p>
                                        <p className="font-mono font-semibold text-blue-900">{result.order.code}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 text-xs mb-1">Ngày mua</p>
                                        <p className="font-medium">{formatDate(result.order.purchaseDate)}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 text-xs mb-1">Kênh</p>
                                        <p className="font-medium">{CHANNEL_LABEL[result.order.channel] || result.order.channel}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 text-xs mb-1">Tổng tiền</p>
                                        <p className="font-medium text-red-700">
                                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                                                result.order.totalAmount
                                            )}
                                        </p>
                                    </div>
                                    {result.order.customerName && (
                                        <div>
                                            <p className="text-gray-500 text-xs mb-1">Khách hàng</p>
                                            <p className="font-medium">{result.order.customerName}</p>
                                        </div>
                                    )}
                                    {result.order.customerPhone && (
                                        <div>
                                            <p className="text-gray-500 text-xs mb-1">Điện thoại</p>
                                            <p className="font-medium">{result.order.customerPhone}</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Danh sách sản phẩm */}
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Package className="w-5 h-5 text-gray-600" />
                                Sản phẩm trên hóa đơn ({result.warranties.length})
                            </h2>

                            <div className="space-y-4">
                                {result.warranties.map((w) => {
                                    const daysLeft = getDaysRemaining(w.warrantyEndDate);
                                    const isExpired = w.isExpired;
                                    const canClaim = w.canClaim;
                                    // Sản phẩm không có warranty record
                                    const noWarranty = w.hasWarrantyRecord === false || w.status === 'no_warranty_record';

                                    return (
                                        <Card
                                            key={w._id || w.product?._id || Math.random()}
                                            className={`border rounded-xl overflow-hidden ${
                                                noWarranty
                                                    ? 'border-gray-200 bg-gray-50'
                                                    : isExpired
                                                      ? 'border-gray-200 bg-gray-50'
                                                      : 'border-blue-200 bg-white shadow-sm'
                                            }`}
                                        >
                                            <CardContent className="p-0">
                                                {/* Header sản phẩm */}
                                                <div className="flex gap-4 p-5">
                                                    {/* Hình ảnh sản phẩm */}
                                                    <div className="w-20 h-20 rounded-lg border border-gray-200 overflow-hidden shrink-0 bg-white flex items-center justify-center">
                                                        {w.product?.image ? (
                                                            <img
                                                                src={w.product.image}
                                                                alt={w.product.name}
                                                                className="w-full h-full object-contain p-1"
                                                            />
                                                        ) : (
                                                            <Package className="w-8 h-8 text-gray-300" />
                                                        )}
                                                    </div>

                                                    {/* Thông tin */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                                                            <div>
                                                                <h3 className="font-semibold text-gray-900 leading-snug">
                                                                    {w.product?.name || '—'}
                                                                </h3>
                                                                {w.product?.sku && (
                                                                    <p className="text-xs text-gray-500 font-mono mt-0.5">
                                                                        SKU: {w.product.sku}
                                                                    </p>
                                                                )}
                                                            </div>

                                                            {/* Badge trạng thái */}
                                                            {noWarranty ? (
                                                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-600 border border-gray-300 shrink-0">
                                                                    <Shield className="w-3 h-3" />
                                                                    Chưa có thông tin BH
                                                                </span>
                                                            ) : isExpired ? (
                                                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-700 border border-gray-300 shrink-0">
                                                                    <ShieldX className="w-3 h-3" />
                                                                    Hết hạn BH
                                                                </span>
                                                            ) : w.hasPendingClaim ? (
                                                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                                                                    <Clock className="w-3 h-3" />
                                                                    Chờ xử lý
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                                                                    <ShieldCheck className="w-3 h-3" />
                                                                    Còn bảo hành
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Thời gian BH — chỉ hiện khi có warranty record */}
                                                        {!noWarranty && w.warrantyStartDate && (
                                                            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                                                                <div className="flex items-center gap-1.5 text-gray-600">
                                                                    <Calendar className="w-3.5 h-3.5" />
                                                                    <span>
                                                                        Bảo hành: <strong>{w.warrantyText || `${w.warrantyMonths} tháng`}</strong>
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5 text-gray-600">
                                                                    <Clock className="w-3.5 h-3.5" />
                                                                    <span>
                                                                        Từ: {formatDate(w.warrantyStartDate)}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5 text-gray-600">
                                                                    <Clock className="w-3.5 h-3.5" />
                                                                    <span>
                                                                        Đến:{' '}
                                                                        <strong className={isExpired ? 'text-red-600' : 'text-emerald-700'}>
                                                                            {formatDate(w.warrantyEndDate)}
                                                                        </strong>
                                                                    </span>
                                                                </div>
                                                                {!isExpired && daysLeft !== null && (
                                                                    <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                                                                        <CheckCircle className="w-3.5 h-3.5" />
                                                                        <span>Còn <strong>{daysLeft} ngày</strong></span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Hiện thời gian BH từ product nếu chưa có record */}
                                                        {noWarranty && w.warrantyText && (
                                                            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                                                                <div className="flex items-center gap-1.5 text-gray-500">
                                                                    <Calendar className="w-3.5 h-3.5" />
                                                                    <span>
                                                                        Bảo hành: <strong>{w.warrantyText}</strong>
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Yêu cầu BH đã gửi */}
                                                {w.latestClaim && (
                                                    <div className="border-t border-gray-100 bg-amber-50 px-5 py-3">
                                                        <div className="flex items-center justify-between gap-4">
                                                            <div className="flex items-center gap-2 text-sm">
                                                                <FileText className="w-4 h-4 text-amber-700" />
                                                                <span className="text-amber-800">
                                                                    Yêu cầu: <strong>{w.latestClaim.claimCode}</strong>
                                                                </span>
                                                                <span className="text-amber-700">
                                                                    — {REASON_LABELS[w.latestClaim.reason] || w.latestClaim.reason}
                                                                </span>
                                                            </div>
                                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border shrink-0 ${CLAIM_STATUS_STYLES[w.latestClaim.status] || CLAIM_STATUS_STYLES.pending}`}>
                                                                {CLAIM_STATUS_LABELS[w.latestClaim.status] || w.latestClaim.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Nút hành động */}
                                                <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between gap-3">
                                                    {w.warrantyCode ? (
                                                        <p className="text-xs text-gray-500">
                                                            Mã BH: <span className="font-mono">{w.warrantyCode}</span>
                                                        </p>
                                                    ) : (
                                                        <p className="text-xs text-gray-400 italic">
                                                            Chưa có mã bảo hành
                                                        </p>
                                                    )}
                                                    {canClaim && (
                                                        <Button
                                                            size="sm"
                                                            className="bg-blue-700 hover:bg-blue-800 gap-1.5"
                                                            onClick={() => handleOpenClaim(w)}
                                                        >
                                                            <Shield className="w-3.5 h-3.5" />
                                                            Yêu cầu bảo hành
                                                        </Button>
                                                    )}
                                                    {!canClaim && !isExpired && w.hasPendingClaim && (
                                                        <span className="text-xs text-amber-600 font-medium">
                                                            Vui lòng chờ yêu cầu hiện tại được xử lý
                                                        </span>
                                                    )}
                                                    {isExpired && !noWarranty && (
                                                        <span className="text-xs text-gray-400">
                                                            Sản phẩm đã hết thời hạn bảo hành
                                                        </span>
                                                    )}
                                                    {noWarranty && !w.latestClaim && (
                                                        <span className="text-xs text-gray-400 italic">
                                                            Liên hệ cửa hàng để được hỗ trợ bảo hành
                                                        </span>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Ghi chú */}
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
                            <p className="font-semibold mb-1">Lưu ý</p>
                            <ul className="list-disc list-inside space-y-1 text-blue-700">
                                <li>Thời hạn bảo hành tính từ ngày mua hàng trên hóa đơn.</li>
                                <li>Bảo hành không áp dụng cho các trường hợp hư hỏng do va đập, ngập nước hoặc sử dụng sai cách.</li>
                                <li>Để được hỗ trợ nhanh, vui lòng liên hệ cửa hàng kèm theo mã hóa đơn và mã bảo hành.</li>
                            </ul>
                        </div>
                    </div>
                )}
            </main>

            <Footer />

            {/* ── Modal tạo yêu cầu bảo hành ── */}
            <Dialog open={showClaimModal} onOpenChange={setShowClaimModal}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-blue-700" />
                            Gửi yêu cầu bảo hành
                        </DialogTitle>
                        <DialogDescription className="pt-1">
                            Sản phẩm: <strong>{selectedWarranty?.product?.name}</strong>
                            <br />
                            Mã bảo hành:{' '}
                            <span className="font-mono">
                                {selectedWarranty?.warrantyCode || 'Chưa có'}
                            </span>
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmitClaim} className="space-y-4">
                        <div>
                            <Label htmlFor="claim-reason">
                                Lý do bảo hành <span className="text-red-500">*</span>
                            </Label>
                            <select
                                id="claim-reason"
                                value={claimReason}
                                onChange={(e) => setClaimReason(e.target.value)}
                                className="mt-1 w-full h-10 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="">— Chọn lý do —</option>
                                {Object.entries(REASON_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <Label htmlFor="claim-description">Mô tả chi tiết</Label>
                            <Textarea
                                id="claim-description"
                                value={claimDescription}
                                onChange={(e) => setClaimDescription(e.target.value)}
                                placeholder="Mô tả tình trạng sản phẩm, thời điểm phát sinh lỗi..."
                                className="mt-1 min-h-[100px]"
                                maxLength={1000}
                            />
                            <p className="text-xs text-gray-400 mt-1 text-right">
                                {claimDescription.length}/1000 ký tự
                            </p>
                        </div>

                        <DialogFooter className="gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowClaimModal(false)}
                                disabled={submittingClaim}
                            >
                                Hủy
                            </Button>
                            <Button
                                type="submit"
                                className="bg-blue-700 hover:bg-blue-800"
                                disabled={submittingClaim || !claimReason}
                            >
                                {submittingClaim ? 'Đang gửi...' : 'Gửi yêu cầu'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
