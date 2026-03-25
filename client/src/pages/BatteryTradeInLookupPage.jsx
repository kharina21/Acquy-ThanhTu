import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { lookupBatteryTradeIn } from '@/services/batteryTradeInService';
import { useAuthStore } from '@/stores/useAuthStore';
import { Search, Package, Calendar, User, ArrowLeft, Clock, MapPin, Phone } from 'lucide-react';

const STATUS_BADGE = {
    pending: 'bg-amber-100 text-amber-900 border-amber-200',
    contacted: 'bg-sky-100 text-sky-900 border-sky-200',
    completed: 'bg-emerald-100 text-emerald-900 border-emerald-200',
    cancelled: 'bg-gray-200 text-gray-800 border-gray-300',
};

export default function BatteryTradeInLookupPage() {
    const { user, logout } = useAuthStore();
    const [searchParams] = useSearchParams();
    const [code, setCode] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    useEffect(() => {
        const c = searchParams.get('code');
        if (c) setCode(c.trim().toUpperCase());
    }, [searchParams]);

    const handleLogout = async () => {
        try {
            await logout();
            toast.success('Đã đăng xuất thành công !');
        } catch {
            toast.error('Lỗi khi đăng xuất !');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const c = code.trim().toUpperCase();
        const em = email.trim().toLowerCase();
        if (!c || !em) {
            toast.error('Vui lòng nhập mã yêu cầu và email Gmail.');
            return;
        }
        setLoading(true);
        setResult(null);
        try {
            const res = await lookupBatteryTradeIn({ code: c, email: em });
            if (res?.success && res?.data) {
                setResult(res.data);
                toast.success('Đã tìm thấy yêu cầu.');
            } else {
                toast.error(res?.message || 'Không tìm thấy yêu cầu.');
            }
        } catch (err) {
            const msg = err?.response?.data?.message || 'Không tìm thấy yêu cầu hoặc lỗi máy chủ.';
            toast.error(msg);
            setResult(null);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (d) => {
        if (!d) return '—';
        return new Date(d).toLocaleString('vi-VN');
    };

    const formatDateTime = (d) => {
        if (!d) return '—';
        return new Date(d).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header user={user} onLogout={handleLogout} />

            <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
                <nav className="mb-6">
                    <Link
                        to="/battery-trade-in"
                        className="inline-flex items-center gap-2 text-sm text-blue-700 hover:underline"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Quay lại gửi yêu cầu thu cũ
                    </Link>
                </nav>

                <h1 className="text-2xl md:text-3xl font-bold text-blue-900 mb-2 text-center">Tra cứu yêu cầu thu cũ</h1>
                <p className="text-center text-gray-600 text-sm mb-8">
                    Nhập <strong>mã yêu cầu</strong> (gửi trong email) và <strong>email Gmail</strong> đã dùng khi gửi đơn.
                </p>

                <Card className="border-0 shadow-lg bg-white rounded-xl overflow-hidden mb-8">
                    <CardHeader className="bg-blue-900 text-white py-4">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <Search className="w-5 h-5" />
                            Tra cứu
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Label htmlFor="lookup-code">Mã yêu cầu *</Label>
                                <Input
                                    id="lookup-code"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                                    placeholder="TC-2025-AB12CD34"
                                    className="mt-1 h-10 font-mono tracking-wide"
                                    autoComplete="off"
                                />
                            </div>
                            <div>
                                <Label htmlFor="lookup-email">Email Gmail *</Label>
                                <Input
                                    id="lookup-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="ten@gmail.com"
                                    className="mt-1 h-10"
                                    autoComplete="email"
                                />
                            </div>
                            <Button type="submit" className="w-full bg-blue-700 hover:bg-blue-800" disabled={loading}>
                                {loading ? 'Đang tra cứu...' : 'Tra cứu'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {result && (
                    <Card className="border border-blue-200 shadow-md bg-white rounded-xl overflow-hidden">
                        <CardHeader className="bg-blue-50 border-b border-blue-100 py-4">
                            <CardTitle className="text-lg text-blue-900 flex items-center gap-2">
                                <Package className="w-5 h-5" />
                                Kết quả
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-mono font-semibold text-lg text-blue-900">{result.requestCode}</span>
                                <span
                                    className={`px-3 py-1 rounded-full text-sm font-medium border ${STATUS_BADGE[result.status] || STATUS_BADGE.pending}`}
                                >
                                    {result.statusLabel || result.status}
                                </span>
                            </div>
                            <div className="grid gap-3 text-sm">
                                <p className="flex items-start gap-2">
                                    <User className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                                    <span>
                                        <span className="text-gray-500">Người gửi:</span> {result.name}
                                    </span>
                                </p>
                                <p className="flex items-start gap-2">
                                    <Package className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                                    <span>
                                        <span className="text-gray-500">Ắc quy:</span> {result.batteryName || '—'}
                                        {result.quantity != null ? ` · ×${result.quantity}` : ''}
                                    </span>
                                </p>
                                <p className="flex items-start gap-2">
                                    <Calendar className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                                    <span>
                                        <span className="text-gray-500">Gửi lúc:</span> {formatDate(result.createdAt)}
                                    </span>
                                </p>
                                {result.appointmentAt && result.appointmentLocation && (
                                    <div className="rounded-lg bg-sky-50 border border-sky-100 p-4 space-y-2 mt-2">
                                        <p className="font-medium text-sky-900 flex items-center gap-2">
                                            <Clock className="w-4 h-4" />
                                            Lịch hẹn đã xác nhận
                                        </p>
                                        <p className="text-sm">
                                            <span className="text-gray-600">Thời gian:</span>{' '}
                                            <strong>{formatDateTime(result.appointmentAt)}</strong>
                                        </p>
                                        <p className="text-sm">
                                            <span className="text-gray-600">Cơ sở:</span>{' '}
                                            <strong>{result.appointmentLocation.name || result.appointmentLocation.code}</strong>
                                        </p>
                                        {result.appointmentLocation.address && (
                                            <p className="flex items-start gap-2 text-sm text-gray-700">
                                                <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                                                {result.appointmentLocation.address}
                                            </p>
                                        )}
                                        {result.appointmentLocation.phone && (
                                            <p className="flex items-center gap-2 text-sm text-gray-700">
                                                <Phone className="w-4 h-4 shrink-0" />
                                                {result.appointmentLocation.phone}
                                            </p>
                                        )}
                                    </div>
                                )}
                                <p className="text-xs text-gray-500 mt-2">
                                    Cập nhật gần nhất: {formatDate(result.updatedAt)}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </main>

            <Footer />
        </div>
    );
}
