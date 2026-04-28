import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { lookupWarrantyByOrderCode } from '@/services/warrantyService';
import { useAuthStore } from '@/stores/useAuthStore';
import {
    Search,
    Package,
    Shield,
    ShieldCheck,
    ShieldX,
    ShoppingBag,
    AlertCircle,
} from 'lucide-react';

const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const getDaysRemaining = (endDate) => {
    if (!endDate) return null;
    const now = new Date();
    const end = new Date(endDate);
    return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
};

export default function WarrantyLookupPage() {
    const { user, logout } = useAuthStore();
    const [searchParams] = useSearchParams();

    const [orderCode, setOrderCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const code = searchParams.get('code');
        if (code) setOrderCode(code.trim().toUpperCase());
    }, [searchParams]);

    const handleLogout = async () => {
        try { await logout(); toast.success('Đã đăng xuất!'); } catch { toast.error('Lỗi đăng xuất!'); }
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
            setError(err?.response?.data?.message || 'Không tìm thấy hóa đơn hoặc lỗi máy chủ.');
        } finally {
            setLoading(false);
        }
    };

    const CHANNEL_LABEL = { online: 'Mua Online', in_store: 'Tại Quầy' };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
            <Header user={user} onLogout={handleLogout} />

            <main className="flex-1">
                {/* Hero */}
                <div className="bg-gradient-to-r from-blue-800 to-blue-600 text-white py-12 px-4">
                    <div className="max-w-3xl mx-auto text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-4">
                            <Shield className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold mb-2">Tra cứu Bảo hành</h1>
                        <p className="text-blue-100 text-sm">
                            Nhập <strong>mã hóa đơn</strong> để xem thông tin bảo hành sản phẩm đã mua.
                            Mã hóa đơn có dạng: <code className="bg-white/20 px-1 rounded">ORD-XXXX-XXXX</code>
                        </p>
                    </div>
                </div>

                <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
                    {/* Form tra cứu */}
                    <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
                        <div className="bg-blue-900 text-white px-6 py-4 flex items-center gap-2">
                            <Search className="w-5 h-5" />
                            <h2 className="font-semibold text-base">Tra cứu hóa đơn</h2>
                        </div>
                        <div className="p-6">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <Label>Mã hóa đơn</Label>
                                    <Input
                                        value={orderCode}
                                        onChange={(e) => setOrderCode(e.target.value.toUpperCase())}
                                        placeholder="ORD-2026-XXXXXX-ABCD"
                                        className="mt-1 h-12 font-mono text-base"
                                        autoFocus
                                    />
                                </div>
                                {error && (
                                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
                                        <AlertCircle className="w-4 h-4 shrink-0" />{error}
                                    </div>
                                )}
                                <Button type="submit" className="w-full h-12 bg-blue-700 hover:bg-blue-800 text-base font-medium"
                                    disabled={loading}>
                                    {loading ? (
                                        <><span className="animate-spin mr-2">⏳</span>Đang tra cứu...</>
                                    ) : (
                                        <><Search className="w-4 h-4 mr-2" />Tra cứu ngay</>
                                    )}
                                </Button>
                            </form>
                        </div>
                    </Card>

                    {/* Kết quả */}
                    {result && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Thông tin hóa đơn */}
                            <Card className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                <div className="bg-gray-50 border-b border-gray-100 px-5 py-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <ShoppingBag className="w-4 h-4 text-gray-500" />
                                        <span className="text-sm font-semibold text-gray-800">Thông tin hóa đơn</span>
                                    </div>
                                    <span className="font-mono text-sm font-bold text-blue-800">{result.order.code}</span>
                                </div>
                                <div className="p-5">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div><p className="text-gray-400 text-xs mb-1">Ngày mua</p><p className="font-medium">{formatDate(result.order.purchaseDate)}</p></div>
                                        <div><p className="text-gray-400 text-xs mb-1">Kênh</p><p className="font-medium">{CHANNEL_LABEL[result.order.channel] || result.order.channel}</p></div>
                                        <div><p className="text-gray-400 text-xs mb-1">Tổng tiền</p><p className="font-medium text-red-700">{new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(result.order.totalAmount)}</p></div>
                                        {result.order.customerName && <div><p className="text-gray-400 text-xs mb-1">Khách hàng</p><p className="font-medium">{result.order.customerName}</p></div>}
                                        {result.order.customerPhone && <div><p className="text-gray-400 text-xs mb-1">Điện thoại</p><p className="font-medium">{result.order.customerPhone}</p></div>}
                                    </div>
                                </div>
                            </Card>

                            {/* Danh sách sản phẩm */}
                            <div>
                                <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <Package className="w-5 h-5 text-gray-500" />
                                    Sản phẩm ({result.warranties.length})
                                </h2>

                                <div className="space-y-3">
                                    {result.warranties.map((w) => {
                                        const daysLeft = getDaysRemaining(w.warrantyEndDate);
                                        const isExpired = w.isExpired;
                                        const noWarranty = w.hasWarrantyRecord === false || w.status === 'no_warranty_record';

                                        return (
                                            <Card key={w._id || w.product?._id || Math.random()}
                                                className={`rounded-2xl overflow-hidden border ${
                                                    noWarranty ? 'border-gray-200' : isExpired ? 'border-gray-200' : 'border-blue-200 shadow-sm'
                                                }`}>
                                                <CardContent className="p-0">
                                                    <div className="flex gap-4 p-4">
                                                        {/* Hình ảnh */}
                                                        <div className="w-16 h-16 rounded-xl border border-gray-200 bg-white flex items-center justify-center shrink-0">
                                                            {w.product?.image ? (
                                                                <img src={w.product.image} alt={w.product.name}
                                                                    className="w-full h-full object-contain p-1" />
                                                            ) : (
                                                                <Package className="w-7 h-7 text-gray-300" />
                                                            )}
                                                        </div>

                                                        {/* Info */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex flex-wrap items-start justify-between gap-2 mb-1.5">
                                                                <div>
                                                                    <h3 className="font-semibold text-gray-900 leading-snug">{w.product?.name || '—'}</h3>
                                                                    {w.product?.sku && <p className="text-xs text-gray-400 font-mono">SKU: {w.product.sku}</p>}
                                                                </div>
                                                                {noWarranty ? (
                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200 shrink-0">
                                                                        <Shield className="w-3 h-3" />Chưa có thông tin BH
                                                                    </span>
                                                                ) : isExpired ? (
                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200 shrink-0">
                                                                        <ShieldX className="w-3 h-3" />Hết hạn BH
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                                                                        <ShieldCheck className="w-3 h-3" />Còn bảo hành
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Thời gian BH */}
                                                            {!noWarranty && w.warrantyStartDate && (
                                                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                                                                    <span>Bảo hành: <strong className="text-gray-700">{w.warrantyText || `${w.warrantyMonths} tháng`}</strong></span>
                                                                    <span>Từ: {formatDate(w.warrantyStartDate)}</span>
                                                                    <span>Đến: <strong className={isExpired ? 'text-red-600' : 'text-emerald-700'}>{formatDate(w.warrantyEndDate)}</strong></span>
                                                                    {!isExpired && daysLeft !== null && (
                                                                        <span className="text-emerald-700 font-medium">Còn <strong>{daysLeft} ngày</strong></span>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {noWarranty && w.warrantyText && (
                                                                <div className="text-xs text-gray-500">
                                                                    Bảo hành: <strong className="text-gray-700">{w.warrantyText}</strong>
                                                                </div>
                                                            )}

                                                            {/* Mã bảo hành */}
                                                            {w.warrantyCode && (
                                                                <p className="text-xs text-gray-400 mt-1">Mã BH: <span className="font-mono">{w.warrantyCode}</span></p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Ghi chú */}
                            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-800">
                                <p className="font-semibold mb-1">Lưu ý</p>
                                <ul className="list-disc list-inside space-y-1 text-blue-700 text-xs">
                                    <li>Thời hạn bảo hành tính từ ngày mua hàng trên hóa đơn.</li>
                                    <li>Bảo hành không áp dụng cho va đập, ngập nước, sử dụng sai cách.</li>
                                    <li>Liên hệ cửa hàng kèm mã hóa đơn để được hỗ trợ nhanh nhất.</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
