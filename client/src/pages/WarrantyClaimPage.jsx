import { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { lookupWarrantyByOrderCode, uploadWarrantyImages, submitClaimFromOrder } from '@/services/warrantyService';
import { useAuthStore } from '@/stores/useAuthStore';
import {
    Shield,
    Search,
    Package,
    Upload,
    X,
    MapPin,
    Phone,
    User,
    Info,
    ArrowLeft,
    CheckCircle,
    Calendar,
    Clock,
    FileText,
} from 'lucide-react';

const REASON_LABELS = {
    product_damage: 'Sản phẩm bị hư hỏng',
    product_defect: 'Lỗi từ nhà sản xuất',
    battery_leak: 'Ắc quy bị chảy nước',
    charging_issue: 'Không sạc được / sạc yếu',
    other: 'Lý do khác',
};

const WARRANTY_POLICY = [
    'Bảo hành điện tử: 12 tháng cho ắc quy, 06 tháng cho bộ sạc và phụ kiện (kể từ ngày mua hàng trên hóa đơn).',
    'Sản phẩm được bảo hành miễn phí nếu lỗi do nhà sản xuất: không sạc được, chai/trì/trạng thái bất thường, ắc quy chảy nước trong thời hạn bảo hành.',
    'Điều kiện bảo hành: sản phẩm còn nguyên vẹn, tem mác, serial không bị tẩy xóa, rách, thay đổi.',
    'KHÔNG bảo hành các trường hợp: va đập mạnh, ngập nước, sử dụng sai điện áp/dòng sạc, tự ý tháo sửa, cạn điện sâu.',
    'Quý khách vui lòng mang theo hóa đơn mua hàng và sản phẩm đến cửa hàng để được hỗ trợ.',
    'Thời gian xử lý: 3–7 ngày làm việc kể từ khi nhận đủ hồ sơ và sản phẩm.',
];

const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function WarrantyClaimPage() {
    const { user, logout } = useAuthStore();
    const { orderCode: paramOrder, productId: paramProductId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [orderCode, setOrderCode] = useState('');
    const [lookupLoading, setLookupLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [result, setResult] = useState(null);
    const [lookupError, setLookupError] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [policyAccepted, setPolicyAccepted] = useState(false);
    const fileInputRef = useRef(null);

    // Form state
    const [form, setForm] = useState({
        reason: '',
        description: '',
        images: [],
        customerName: '',
        customerPhone: '',
        customerAddress: '',
        notes: '',
    });

    // Load order data if params exist
    useEffect(() => {
        const code = searchParams.get('orderCode');
        const prodId = searchParams.get('productId');
        if (code) {
            setOrderCode(code.trim().toUpperCase());
        }
        if (code && prodId) {
            loadOrderAndSelect(code.trim().toUpperCase(), prodId);
        }
    }, []);

    const loadOrderAndSelect = async (code, prodId) => {
        setLookupLoading(true);
        setLookupError('');
        try {
            const res = await lookupWarrantyByOrderCode(code.toUpperCase());
            if (res?.success && res?.data) {
                setResult(res.data);
                const w = res.data.warranties.find(
                    (item) => item.product?._id === prodId || item.productId === prodId
                );
                if (w) setSelectedProduct(w);
            } else {
                setLookupError(res?.message || 'Không tìm thấy hóa đơn.');
            }
        } catch (err) {
            setLookupError(err?.response?.data?.message || 'Lỗi khi tra cứu hóa đơn.');
        } finally {
            setLookupLoading(false);
        }
    };

    const handleLogout = async () => {
        try { await logout(); toast.success('Đã đăng xuất!'); } catch { toast.error('Lỗi đăng xuất!'); }
    };

    const handleLookup = async (e) => {
        e.preventDefault();
        const code = orderCode.trim().toUpperCase();
        if (!code || code.length < 3) {
            toast.error('Vui lòng nhập mã hóa đơn (ít nhất 3 ký tự).');
            return;
        }
        setResult(null);
        setSelectedProduct(null);
        await loadOrderAndSelect(code, null);
    };

    const handleSelectProduct = (w) => {
        setSelectedProduct(w);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files || []);
        files.forEach((file) => {
            if (form.images.length >= 10) { toast.warning('Tối đa 10 ảnh.'); return; }
            if (!file.type.startsWith('image/')) { toast.error('Chỉ chấp nhận file ảnh.'); return; }
            if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name} quá lớn (tối đa 5MB).`); return; }
            const reader = new FileReader();
            reader.onload = (ev) => {
                setForm((f) => ({ ...f, images: [...f.images, { file, preview: ev.target.result }] }));
            };
            reader.readAsDataURL(file);
        });
        e.target.value = '';
    };

    const removeImage = (index) => {
        setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== index) }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedProduct) { toast.error('Vui lòng chọn sản phẩm cần bảo hành.'); return; }
        if (!policyAccepted) { toast.error('Vui lòng đọc và đồng ý với chính sách bảo hành.'); return; }
        if (!form.reason) { toast.error('Vui lòng chọn lý do bảo hành.'); return; }
        if (form.images.length < 2) { toast.error('Vui lòng upload ít nhất 2 ảnh sản phẩm thực tế.'); return; }
        if (!form.customerName.trim()) { toast.error('Vui lòng nhập họ tên.'); return; }
        if (!form.customerPhone.trim() || !/^[\d\s\-\+]{8,15}$/.test(form.customerPhone.trim())) {
            toast.error('Vui lòng nhập số điện thoại hợp lệ.');
            return;
        }

        setSubmitting(true);
        try {
            // Upload ảnh lên Cloudinary trước, lấy URL
            const files = form.images.map((img) => img.file).filter(Boolean);
            let imageUrls = [];

            if (files.length > 0) {
                toast.info('Đang tải ảnh lên server...');
                const uploadRes = await uploadWarrantyImages(files);
                if (uploadRes?.success && uploadRes?.data?.urls?.length) {
                    imageUrls = uploadRes.data.urls;
                } else {
                    // Fallback: dùng preview URL nếu upload thất bại
                    imageUrls = form.images.map((img) => img.preview);
                }
            }

            const productId = selectedProduct.product?._id || selectedProduct.productId;

            const payload = {
                orderCode: result.order.code,
                productId,
                reason: form.reason,
                description: form.description,
                images: imageUrls,
                customerName: form.customerName.trim(),
                customerPhone: form.customerPhone.trim(),
                customerAddress: form.customerAddress.trim(),
                notes: form.notes.trim(),
            };

            const res = await submitClaimFromOrder(payload);
            if (res?.success) {
                setSubmitted(true);
                toast.success(res.message || 'Yêu cầu bảo hành đã được gửi thành công!');
            } else {
                toast.error(res?.message || 'Gửi yêu cầu thất bại.');
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Lỗi khi gửi yêu cầu bảo hành.');
        } finally {
            setSubmitting(false);
        }
    };

    const isStep1 = !result;
    const isStep2 = result && !selectedProduct;
    const isStep3 = result && selectedProduct && !submitted;
    const isDone = submitted;

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
                        <h1 className="text-2xl md:text-3xl font-bold mb-2">Yêu cầu Bảo hành</h1>
                        <p className="text-blue-100 text-sm">
                            Điền đầy đủ thông tin bên dưới để gửi yêu cầu bảo hành sản phẩm đã mua
                        </p>
                    </div>
                </div>

                <div className="max-w-3xl mx-auto px-4 py-8">
                    {/* Stepper */}
                    <div className="flex items-center justify-center mb-8">
                        {[
                            { num: 1, label: 'Tra hóa đơn', active: isStep1 || isStep2 },
                            { num: 2, label: 'Chọn sản phẩm', active: isStep2 },
                            { num: 3, label: 'Điền thông tin', active: isStep3 },
                            { num: 4, label: 'Hoàn tất', active: isDone },
                        ].map((step, i) => (
                            <div key={step.num} className="flex items-center">
                                <div className="flex flex-col items-center">
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                                        step.active
                                            ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                            : i < 3
                                              ? 'bg-blue-100 border-blue-300 text-blue-600'
                                              : 'bg-emerald-100 border-emerald-400 text-emerald-700'
                                    }`}>
                                        {i < 3 && !step.active && i < ['1','2','3'].indexOf(String(step.num)) ? (
                                            <CheckCircle className="w-5 h-5" />
                                        ) : step.num}
                                    </div>
                                    <span className={`text-xs mt-1.5 font-medium ${
                                        step.active ? 'text-blue-700' : 'text-gray-400'
                                    }`}>{step.label}</span>
                                </div>
                                {i < 3 && (
                                    <div className={`h-0.5 w-12 mx-1 -mt-4 rounded ${isDone ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* ── Step 1: Tra cứu hóa đơn ── */}
                    {isStep1 && (
                        <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
                                <div className="bg-blue-900 text-white px-6 py-4">
                                    <h2 className="font-semibold flex items-center gap-2">
                                        <Search className="w-5 h-5" />
                                        Bước 1 — Tra cứu hóa đơn
                                    </h2>
                                    <p className="text-blue-200 text-xs mt-1">Nhập mã hóa đơn trên hóa đơn mua hàng để xác minh đơn hàng</p>
                                </div>
                                <div className="p-6">
                                    <form onSubmit={handleLookup} className="space-y-4">
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
                                        {lookupError && (
                                            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-2">
                                                <X className="w-4 h-4 shrink-0" />{lookupError}
                                            </div>
                                        )}
                                        <Button type="submit" className="w-full h-12 bg-blue-700 hover:bg-blue-800 text-base" disabled={lookupLoading}>
                                            {lookupLoading ? <><span className="animate-spin mr-2">⏳</span>Đang tra cứu...</> : <><Search className="w-4 h-4 mr-2" />Tra cứu ngay</>}
                                        </Button>
                                    </form>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* ── Step 2: Chọn sản phẩm ── */}
                    {isStep2 && result && (
                        <div className="space-y-4">
                            {/* Order info card */}
                            <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
                                <div className="bg-gray-50 border-b border-gray-100 px-5 py-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                                        <span className="text-sm font-semibold text-gray-800">Hóa đơn hợp lệ</span>
                                    </div>
                                    <span className="font-mono text-sm font-bold text-blue-800">{result.order.code}</span>
                                </div>
                                <div className="p-5">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div><p className="text-gray-400 text-xs">Ngày mua</p><p className="font-medium">{formatDate(result.order.purchaseDate)}</p></div>
                                        <div><p className="text-gray-400 text-xs">Tổng tiền</p><p className="font-medium text-red-700">{new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(result.order.totalAmount)}</p></div>
                                        <div><p className="text-gray-400 text-xs">Khách hàng</p><p className="font-medium">{result.order.customerName || '—'}</p></div>
                                        <div><p className="text-gray-400 text-xs">Điện thoại</p><p className="font-medium">{result.order.customerPhone || '—'}</p></div>
                                    </div>
                                </div>
                            </Card>

                            {/* Product list */}
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
                                <div className="bg-gray-50 border-b border-gray-100 px-5 py-3">
                                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                                        <Package className="w-4 h-4" />
                                        Chọn sản phẩm cần bảo hành
                                    </h3>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {result.warranties.map((w) => (
                                        <button
                                            key={w._id || w.product?._id}
                                            onClick={() => handleSelectProduct(w)}
                                            className="w-full flex items-center gap-4 p-4 hover:bg-blue-50 transition-colors text-left"
                                        >
                                            <div className="w-14 h-14 rounded-xl border border-gray-200 bg-white flex items-center justify-center shrink-0">
                                                {w.product?.image ? (
                                                    <img src={w.product.image} alt={w.product.name} className="w-full h-full object-contain p-1" />
                                                ) : (
                                                    <Package className="w-7 h-7 text-gray-300" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-gray-900 truncate">{w.product?.name || '—'}</p>
                                                {w.product?.sku && <p className="text-xs text-gray-400 font-mono">SKU: {w.product.sku}</p>}
                                                {w.warrantyText && <p className="text-xs text-blue-600 mt-0.5">Bảo hành: {w.warrantyText}</p>}
                                            </div>
                                            <div className="shrink-0">
                                                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                                                    Chọn →
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button onClick={() => { setResult(null); setSelectedProduct(null); }} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
                                <ArrowLeft className="w-4 h-4" /> Tra hóa đơn khác
                            </button>
                        </div>
                    )}

                    {/* ── Step 3: Form claim ── */}
                    {isStep3 && selectedProduct && (
                        <div className="space-y-4">
                            {/* Back button */}
                            <button onClick={() => setSelectedProduct(null)} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
                                <ArrowLeft className="w-4 h-4" /> Quay lại chọn sản phẩm khác
                            </button>

                            <form onSubmit={handleSubmit} className="space-y-4">

                                {/* Product card */}
                                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-xl border border-gray-200 bg-white flex items-center justify-center shrink-0">
                                            {selectedProduct.product?.image ? (
                                                <img src={selectedProduct.product.image} alt={selectedProduct.product.name} className="w-full h-full object-contain p-1" />
                                            ) : (
                                                <Package className="w-8 h-8 text-gray-300" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 text-lg">{selectedProduct.product?.name}</p>
                                            {selectedProduct.product?.sku && <p className="text-sm text-gray-400 font-mono">SKU: {selectedProduct.product.sku}</p>}
                                            <p className="text-sm text-blue-600 font-medium mt-1">
                                                {selectedProduct.warrantyText || `Bảo hành ${selectedProduct.warrantyMonths} tháng`}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Chính sách bảo hành */}
                                <div className="bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden">
                                    <div className="bg-blue-50 border-b border-blue-100 px-5 py-3 flex items-center gap-2">
                                        <Info className="w-4 h-4 text-blue-600" />
                                        <h3 className="font-semibold text-blue-900 text-sm">Chính sách bảo hành</h3>
                                    </div>
                                    <div className="p-4">
                                        <ul className="space-y-1.5 text-xs text-gray-700 max-h-40 overflow-y-auto">
                                            {WARRANTY_POLICY.map((p, i) => (
                                                <li key={i} className="flex gap-2"><span className="text-blue-400 shrink-0">•</span><span>{p}</span></li>
                                            ))}
                                        </ul>
                                        <label className="flex items-center gap-2 mt-3 cursor-pointer">
                                            <input type="checkbox" checked={policyAccepted} onChange={(e) => setPolicyAccepted(e.target.checked)}
                                                className="w-4 h-4 accent-blue-700 rounded" />
                                            <span className="text-sm text-gray-700">Tôi đã đọc và đồng ý với chính sách bảo hành trên</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Lý do bảo hành */}
                                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-gray-500" />
                                        Lý do bảo hành <span className="text-red-500">*</span>
                                    </h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {Object.entries(REASON_LABELS).map(([val, label]) => (
                                            <button
                                                key={val}
                                                type="button"
                                                onClick={() => setForm((f) => ({ ...f, reason: val }))}
                                                className={`px-4 py-3 rounded-xl text-sm font-medium border-2 text-left transition-all ${
                                                    form.reason === val
                                                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                                                        : 'border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50'
                                                }`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Ảnh sản phẩm */}
                                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                        <Upload className="w-4 h-4 text-gray-500" />
                                        Ảnh sản phẩm thực tế <span className="text-red-500">*</span>
                                        <span className="text-xs text-gray-400 font-normal">(ít nhất 2 ảnh)</span>
                                    </h3>
                                    <div className="flex flex-wrap gap-3">
                                        {form.images.map((img, i) => (
                                            <div key={i} className="relative group">
                                                <img src={img.preview} alt={`Ảnh ${i + 1}`}
                                                    className="w-24 h-24 rounded-xl object-cover border-2 border-gray-200" />
                                                <button type="button" onClick={() => removeImage(i)}
                                                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                        {form.images.length < 10 && (
                                            <button type="button" onClick={() => fileInputRef.current?.click()}
                                                className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-all">
                                                <Upload className="w-6 h-6" />
                                                <span className="text-[10px] mt-1">Thêm ảnh</span>
                                            </button>
                                        )}
                                    </div>
                                    <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                                    <p className="text-xs text-gray-400 mt-2">{form.images.length}/10 ảnh · Tối đa 5MB/ảnh</p>
                                </div>

                                {/* Mô tả */}
                                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                                    <h3 className="font-semibold text-gray-900 mb-2">Mô tả tình trạng sản phẩm</h3>
                                    <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                        placeholder="Mô tả chi tiết tình trạng sản phẩm, thời điểm phát sinh lỗi..."
                                        className="min-h-[80px]" maxLength={1000} />
                                    <p className="text-xs text-gray-400 mt-1 text-right">{form.description.length}/1000</p>
                                </div>

                                {/* Thông tin liên hệ */}
                                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <User className="w-4 h-4 text-gray-500" />
                                        Thông tin liên hệ
                                    </h3>
                                    <div className="space-y-3">
                                        <div>
                                            <Label>Họ tên <span className="text-red-500">*</span></Label>
                                            <Input value={form.customerName} onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
                                                placeholder="Nguyễn Văn A" className="mt-1" />
                                        </div>
                                        <div>
                                            <Label>Số điện thoại <span className="text-red-500">*</span></Label>
                                            <Input value={form.customerPhone} onChange={(e) => setForm((f) => ({ ...f, customerPhone: e.target.value }))}
                                                placeholder="0912 345 678" className="mt-1" />
                                        </div>
                                        <div>
                                            <Label><MapPin className="w-3.5 h-3.5 inline mr-1" />Địa chỉ nhận hàng (nếu cần)</Label>
                                            <Input value={form.customerAddress} onChange={(e) => setForm((f) => ({ ...f, customerAddress: e.target.value }))}
                                                placeholder="Số 123 Đường ABC, Phường X, Quận Y, TP HCM" className="mt-1" />
                                        </div>
                                        <div>
                                            <Label><Phone className="w-3.5 h-3.5 inline mr-1" />Ghi chú thêm</Label>
                                            <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                                                placeholder="Thời gian thuận tiện, yêu cầu đặc biệt..." className="mt-1" />
                                        </div>
                                    </div>
                                </div>

                                {/* Submit */}
                                <div className="flex gap-3">
                                    <Button type="button" variant="outline" onClick={() => navigate('/warranty')}
                                        className="h-12 px-6 border-gray-300">
                                        Hủy
                                    </Button>
                                    <Button type="submit" className="flex-1 h-12 bg-blue-700 hover:bg-blue-800 text-base"
                                        disabled={submitting || form.images.length < 2 || !form.reason || !form.customerName.trim() || !form.customerPhone.trim()}>
                                        {submitting ? '⏳ Đang gửi...' : 'Gửi yêu cầu bảo hành'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* ── Step 4: Thành công ── */}
                    {isDone && (
                        <div className="text-center py-8 space-y-6">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 mb-2">
                                <CheckCircle className="w-10 h-10 text-emerald-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900">Yêu cầu đã được gửi!</h2>
                            <p className="text-gray-600 max-w-md mx-auto">
                                Cảm ơn bạn đã gửi yêu cầu bảo hành. Cửa hàng sẽ liên hệ trong thời gian sớm nhất qua số điện thoại đã cung cấp.
                            </p>
                            <div className="flex gap-3 justify-center">
                                <Button variant="outline" onClick={() => navigate('/warranty')} className="h-11 px-6">
                                    Tra hóa đơn khác
                                </Button>
                                <Button onClick={() => navigate('/home')} className="h-11 px-6 bg-blue-700 hover:bg-blue-800">
                                    Về trang chủ
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
