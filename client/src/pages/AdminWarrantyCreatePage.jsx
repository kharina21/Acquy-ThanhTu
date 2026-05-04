import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { createWarrantyClaim, lookupWarrantyByOrderCode, getMyLocation, getActiveLocations } from '@/services/warrantyService';
import { getProvinces, getDistricts, getWards } from '@/services/addressService';
import { useUserRole } from '@/hooks/useUserRole';
import {
    Shield,
    Search,
    Package,
    ArrowLeft,
    CheckCircle,
    User,
    Phone,
    Mail,
    MapPin,
    FileText,
    X,
    ChevronDown,
    Lock,
    Building2,
    RefreshCw,
} from 'lucide-react';

const REASON_LABELS = {
    product_damage: 'Sản phẩm bị hư hỏng',
    product_defect: 'Lỗi từ nhà sản xuất',
    battery_leak: 'Ắc quy bị chảy nước',
    charging_issue: 'Không sạc được / sạc yếu',
    other: 'Lý do khác',
};

const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function AdminWarrantyCreatePage() {
    const navigate = useNavigate();
    const { isAdmin } = useUserRole();

    const [step, setStep] = useState(1);
    const [orderCode, setOrderCode] = useState('');
    const [lookupLoading, setLookupLoading] = useState(false);
    const [lookupError, setLookupError] = useState('');
    const [orderData, setOrderData] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [result, setResult] = useState(null);

    // Cơ sở bảo hành
    const [locations, setLocations] = useState([]);
    const [selectedLocationId, setSelectedLocationId] = useState('');
    const [myLocation, setMyLocation] = useState(null);
    const [loadingLocation, setLoadingLocation] = useState(true);

    // Địa chỉ
    const [provinces, setProvinces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [wards, setWards] = useState([]);
    const [loadingAddress, setLoadingAddress] = useState(false);

    const [form, setForm] = useState({
        reason: '',
        description: '',
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        provinceCode: '',
        provinceName: '',
        districtCode: '',
        districtName: '',
        wardCode: '',
        wardName: '',
        addressLine: '',
        notes: '',
    });

    // Load provinces khi mount
    useEffect(() => {
        getProvinces().then((data) => setProvinces(data || [])).catch(() => {});
    }, []);

    // Load cơ sở bảo hành
    useEffect(() => {
        const loadLocations = async () => {
            setLoadingLocation(true);
            try {
                if (isAdmin) {
                    // Admin: lấy tất cả chi nhánh active để chọn
                    const res = await getActiveLocations();
                    if (res?.success) {
                        setLocations(res.data?.locations || []);
                    }
                } else {
                    // Manager/Seller: lấy cơ sở mặc định của mình
                    const res = await getMyLocation();
                    if (res?.success && res.data?.location) {
                        setMyLocation(res.data.location);
                        setSelectedLocationId(res.data.location._id);
                    }
                }
            } catch (err) {
                console.error('Error loading locations:', err);
            } finally {
                setLoadingLocation(false);
            }
        };
        loadLocations();
    }, [isAdmin]);

    // Auto-fill khi chọn sản phẩm
    const handleSelectProduct = (w) => {
        setSelectedProduct(w);

        // Lấy thông tin từ order
        const order = orderData?.order;

        // Auto-fill từ order (khách hàng trong hệ thống)
        let name = order?.customerName || '';
        let phone = order?.customerPhone || '';
        let email = '';
        let provinceCode = '';
        let provinceName = '';
        let districtCode = '';
        let districtName = '';
        let wardCode = '';
        let wardName = '';
        let addressLine = '';

        // Nếu có thông tin địa chỉ từ order
        if (order?.shippingAddress || order?.addressLine) {
            addressLine = order?.addressLine || '';
            provinceCode = order?.provinceCode || '';
            provinceName = order?.provinceName || '';
            districtCode = order?.districtCode || '';
            districtName = order?.districtName || '';
            wardCode = order?.wardCode || '';
            wardName = order?.wardName || '';
        }

        // Nếu order có customerProfile (khách hàng trong hệ thống)
        if (orderData?.customerProfile) {
            const cp = orderData.customerProfile;
            name = cp.name || name;
            phone = cp.phone || phone;
            email = cp.email || email;
        }

        setForm((f) => ({
            ...f,
            customerName: name,
            customerPhone: phone,
            customerEmail: email,
            provinceCode,
            provinceName,
            districtCode,
            districtName,
            wardCode,
            wardName,
            addressLine,
        }));

        // Load districts nếu có provinceCode
        if (provinceCode) {
            loadDistricts(provinceCode);
        }
        if (districtCode) {
            loadWards(districtCode);
        }

        setStep(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const loadDistricts = async (provinceCode) => {
        if (!provinceCode) { setDistricts([]); return; }
        setLoadingAddress(true);
        try {
            const data = await getDistricts(provinceCode);
            setDistricts(data || []);
        } catch { setDistricts([]); }
        setLoadingAddress(false);
    };

    const loadWards = async (districtCode) => {
        if (!districtCode) { setWards([]); return; }
        setLoadingAddress(true);
        try {
            const data = await getWards(districtCode);
            setWards(data || []);
        } catch { setWards([]); }
        setLoadingAddress(false);
    };

    const handleProvinceChange = (code) => {
        const p = provinces.find((x) => String(x.code) === code);
        setForm((f) => ({
            ...f,
            provinceCode: code,
            provinceName: p?.name || '',
            districtCode: '',
            districtName: '',
            wardCode: '',
            wardName: '',
        }));
        setDistricts([]);
        setWards([]);
        if (code) loadDistricts(code);
    };

    const handleDistrictChange = (code) => {
        const d = districts.find((x) => String(x.code) === code);
        setForm((f) => ({
            ...f,
            districtCode: code,
            districtName: d?.name || '',
            wardCode: '',
            wardName: '',
        }));
        setWards([]);
        if (code) loadWards(code);
    };

    const handleWardChange = (code) => {
        const w = wards.find((x) => String(x.code) === code);
        setForm((f) => ({
            ...f,
            wardCode: code,
            wardName: w?.name || '',
        }));
    };

    // Build full address
    const buildAddress = () => {
        const parts = [];
        if (form.wardName) parts.push(form.wardName);
        if (form.districtName) parts.push(form.districtName);
        if (form.provinceName) parts.push(form.provinceName);
        if (form.addressLine) parts.push(form.addressLine);
        return parts.join(', ');
    };

    const loadOrderAndSelect = async (code, prodId = null) => {
        setLookupLoading(true);
        setLookupError('');
        try {
            const res = await lookupWarrantyByOrderCode(code.toUpperCase());
            if (res?.success && res?.data) {
                setOrderData(res.data);
                if (prodId) {
                    const w = res.data.warranties.find(
                        (item) => item.product?._id === prodId || item.productId === prodId
                    );
                    if (w) handleSelectProduct(w);
                }
            } else {
                setLookupError(res?.message || 'Không tìm thấy hóa đơn.');
            }
        } catch (err) {
            setLookupError(err?.response?.data?.message || 'Lỗi khi tra cứu hóa đơn.');
        } finally {
            setLookupLoading(false);
        }
    };

    const handleLookup = async (e) => {
        e.preventDefault();
        const code = orderCode.trim().toUpperCase();
        if (!code || code.length < 3) {
            toast.error('Vui lòng nhập mã hóa đơn (ít nhất 3 ký tự).');
            return;
        }
        setOrderData(null);
        setSelectedProduct(null);
        await loadOrderAndSelect(code, null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedProduct) { toast.error('Vui lòng chọn sản phẩm cần bảo hành.'); return; }
        if (!form.reason) { toast.error('Vui lòng chọn lý do bảo hành.'); return; }

        // Kiểm tra cơ sở bảo hành
        if (isAdmin && !selectedLocationId) {
            toast.error('Vui lòng chọn cơ sở bảo hành.');
            return;
        }
        if (!isAdmin && !selectedLocationId) {
            toast.error('Không xác định được cơ sở bảo hành. Vui lòng liên hệ quản lý.');
            return;
        }

        if (!form.customerName.trim()) { toast.error('Vui lòng nhập họ tên.'); return; }
        if (!form.customerPhone.trim() || !/^[\d\s\-\+]{8,15}$/.test(form.customerPhone.trim())) {
            toast.error('Vui lòng nhập số điện thoại hợp lệ.');
            return;
        }

        setSubmitting(true);
        try {
            const productId = selectedProduct.product?._id || selectedProduct.productId;
            const customerAddress = buildAddress();

            const payload = {
                orderCode: orderData.order.code,
                productId,
                reason: form.reason,
                description: form.description,
                customerName: form.customerName.trim(),
                customerPhone: form.customerPhone.trim(),
                customerEmail: form.customerEmail.trim(),
                customerAddress,
                notes: form.notes.trim(),
                locationId: selectedLocationId,
            };

            const res = await createWarrantyClaim(payload);
            if (res?.success) {
                setResult(res.data);
                setSubmitted(true);
                toast.success('Tạo phiếu bảo hành thành công!');
            } else {
                toast.error(res?.message || 'Tạo phiếu thất bại.');
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Lỗi khi tạo phiếu bảo hành.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleBack = () => {
        setStep(1);
        setSelectedProduct(null);
    };

    const handleNew = () => {
        setStep(1);
        setOrderCode('');
        setOrderData(null);
        setSelectedProduct(null);
        setSubmitted(false);
        setResult(null);
        setForm({
            reason: '',
            description: '',
            customerName: '',
            customerPhone: '',
            customerEmail: '',
            provinceCode: '',
            provinceName: '',
            districtCode: '',
            districtName: '',
            wardCode: '',
            wardName: '',
            addressLine: '',
            notes: '',
        });
        setDistricts([]);
        setWards([]);
    };

    return (
        <div className="h-full flex flex-col bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 shrink-0">
                <div className="px-4 sm:px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center">
                                <Shield className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-gray-900">Tạo phiếu Bảo hành</h1>
                                <p className="text-xs text-gray-500">Admin tạo phiếu bảo hành cho khách hàng</p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/admin/warranties')}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Quay lại
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-4">
                {/* Stepper */}
                <div className="flex items-center justify-center mb-6">
                    {[
                        { num: 1, label: 'Tra hóa đơn', active: step === 1 },
                        { num: 2, label: 'Điền thông tin', active: step === 2 },
                        { num: 3, label: 'Hoàn tất', active: submitted },
                    ].map((s, i) => (
                        <div key={s.num} className="flex items-center">
                            <div className="flex flex-col items-center">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                                    s.active
                                        ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                        : i < 2 && submitted
                                          ? 'bg-emerald-100 border-emerald-400 text-emerald-700'
                                          : 'bg-blue-100 border-blue-300 text-blue-600'
                                }`}>
                                    {i < 2 && submitted ? (
                                        <CheckCircle className="w-5 h-5" />
                                    ) : s.num}
                                </div>
                                <span className={`text-xs mt-1.5 font-medium ${
                                    s.active ? 'text-blue-700' : 'text-gray-400'
                                }`}>{s.label}</span>
                            </div>
                            {i < 2 && (
                                <div className={`h-0.5 w-16 mx-1 -mt-4 rounded ${submitted ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                            )}
                        </div>
                    ))}
                </div>

                {/* ── Step 1: Tra hóa đơn ── */}
                {step === 1 && (
                    <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
                            <div className="bg-blue-900 text-white px-6 py-4">
                                <h2 className="font-semibold flex items-center gap-2">
                                    <Search className="w-5 h-5" />
                                    Bước 1 — Tra cứu hóa đơn
                                </h2>
                                <p className="text-blue-200 text-xs mt-1">Nhập mã hóa đơn để tìm đơn hàng cần tạo phiếu bảo hành</p>
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

                {/* ── Step 1b: Chọn sản phẩm ── */}
                {step === 1 && orderData && (
                    <div className="space-y-4">
                        <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
                            <div className="bg-gray-50 border-b border-gray-100 px-5 py-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                                    <span className="text-sm font-semibold text-gray-800">Hóa đơn hợp lệ</span>
                                </div>
                                <span className="font-mono text-sm font-bold text-blue-800">{orderData.order.code}</span>
                            </div>
                            <div className="p-5">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div><p className="text-gray-400 text-xs">Ngày mua</p><p className="font-medium">{formatDate(orderData.order.purchaseDate)}</p></div>
                                    <div><p className="text-gray-400 text-xs">Tổng tiền</p><p className="font-medium text-red-700">{new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(orderData.order.totalAmount)}</p></div>
                                    <div><p className="text-gray-400 text-xs">Khách hàng</p><p className="font-medium">{orderData.order.customerName || '—'}</p></div>
                                    <div><p className="text-gray-400 text-xs">Điện thoại</p><p className="font-medium">{orderData.order.customerPhone || '—'}</p></div>
                                </div>
                            </div>
                        </Card>

                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
                            <div className="bg-gray-50 border-b border-gray-100 px-5 py-3">
                                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                                    <Package className="w-4 h-4" />
                                    Chọn sản phẩm cần bảo hành
                                </h3>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {orderData.warranties.map((w) => (
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

                        <button onClick={handleNew} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
                            <ArrowLeft className="w-4 h-4" /> Tra hóa đơn khác
                        </button>
                    </div>
                )}

                {/* ── Step 2: Form tạo phiếu BH ── */}
                {step === 2 && selectedProduct && (
                    <div className="space-y-4">
                        <button onClick={handleBack} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
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

                            {/* Cơ sở bảo hành */}
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-gray-500" />
                                    Cơ sở bảo hành
                                    {!isAdmin && <span className="text-xs font-normal text-gray-400 ml-1">(được phân công)</span>}
                                </h3>

                                {loadingLocation ? (
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <RefreshCw className="w-4 h-4 animate-spin" /> Đang tải cơ sở...
                                    </div>
                                ) : !locations.length && isAdmin ? (
                                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                                        <p className="font-medium">Chưa có chi nhánh nào được thiết lập.</p>
                                        <p className="text-xs mt-1">Vui lòng thêm chi nhánh trong phần Quản lý Cửa hàng trước.</p>
                                    </div>
                                ) : isAdmin ? (
                                    /* Admin: dropdown chọn cơ sở */
                                    <div className="relative">
                                        <select
                                            value={selectedLocationId}
                                            onChange={(e) => setSelectedLocationId(e.target.value)}
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white font-medium"
                                        >
                                            <option value="">-- Chọn cơ sở bảo hành --</option>
                                            {locations.map((loc) => (
                                                <option key={loc._id} value={loc._id}>
                                                    {loc.code} - {loc.name}
                                                    {loc.address ? ` (${loc.address})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                        {!selectedLocationId && (
                                            <p className="text-xs text-red-500 mt-1">* Vui lòng chọn cơ sở bảo hành</p>
                                        )}
                                    </div>
                                ) : (
                                    /* Manager/Seller: hiển thị cơ sở được phân (disabled) */
                                    <div>
                                        <div className="flex items-center gap-3 px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg">
                                            <Lock className="w-4 h-4 text-gray-400 shrink-0" />
                                            <div className="flex-1">
                                                {myLocation ? (
                                                    <>
                                                        <p className="font-medium text-gray-800">
                                                            {myLocation.code} - {myLocation.name}
                                                        </p>
                                                        {myLocation.address && (
                                                            <p className="text-sm text-gray-500">{myLocation.address}</p>
                                                        )}
                                                    </>
                                                ) : (
                                                    <p className="text-gray-500 italic">Không xác định được cơ sở</p>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                                            <Lock className="w-3 h-3" />
                                            Bạn chỉ có thể tạo phiếu bảo hành tại cơ sở được phân công
                                        </p>
                                    </div>
                                )}
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

                            {/* Mô tả */}
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                                <h3 className="font-semibold text-gray-900 mb-2">Mô tả tình trạng sản phẩm</h3>
                                <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                    placeholder="Mô tả chi tiết tình trạng sản phẩm, thời điểm phát sinh lỗi..."
                                    className="min-h-[80px]" maxLength={1000} />
                                <p className="text-xs text-gray-400 mt-1 text-right">{form.description.length}/1000</p>
                            </div>

                            {/* Thông tin khách hàng */}
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <User className="w-4 h-4 text-gray-500" />
                                    Thông tin khách hàng
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="sm:col-span-2">
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
                                        <Label><Mail className="w-3.5 h-3.5 inline mr-1" />Email</Label>
                                        <Input type="email" value={form.customerEmail} onChange={(e) => setForm((f) => ({ ...f, customerEmail: e.target.value }))}
                                            placeholder="email@example.com" className="mt-1" />
                                    </div>
                                </div>
                            </div>

                            {/* Địa chỉ */}
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-gray-500" />
                                    Địa chỉ
                                </h3>
                                <div className="space-y-3">
                                    {/* Tỉnh/Thành phố */}
                                    <div className="relative">
                                        <Label>Tỉnh/TP</Label>
                                        <div className="relative mt-1">
                                            <select
                                                value={form.provinceCode}
                                                onChange={(e) => handleProvinceChange(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                                            >
                                                <option value="">Chọn Tỉnh/TP</option>
                                                {provinces.map((p) => (
                                                    <option key={p.code} value={p.code}>{p.name}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* Quận/Huyện */}
                                    <div className="relative">
                                        <Label>Quận/Huyện</Label>
                                        <div className="relative mt-1">
                                            <select
                                                value={form.districtCode}
                                                onChange={(e) => handleDistrictChange(e.target.value)}
                                                disabled={!form.provinceCode || loadingAddress}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white disabled:bg-gray-100"
                                            >
                                                <option value="">Chọn Quận/Huyện</option>
                                                {districts.map((d) => (
                                                    <option key={d.code} value={d.code}>{d.name}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* Phường/Xã */}
                                    <div className="relative">
                                        <Label>Phường/Xã</Label>
                                        <div className="relative mt-1">
                                            <select
                                                value={form.wardCode}
                                                onChange={(e) => handleWardChange(e.target.value)}
                                                disabled={!form.districtCode || loadingAddress}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white disabled:bg-gray-100"
                                            >
                                                <option value="">Chọn Phường/Xã</option>
                                                {wards.map((w) => (
                                                    <option key={w.code} value={w.code}>{w.name}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* Địa chỉ chi tiết */}
                                    <div>
                                        <Label>Địa chỉ chi tiết</Label>
                                        <Input value={form.addressLine} onChange={(e) => setForm((f) => ({ ...f, addressLine: e.target.value }))}
                                            placeholder="Số nhà, đường,..." className="mt-1" />
                                    </div>

                                    {/* Preview */}
                                    {buildAddress() && (
                                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800">
                                            <p className="font-medium mb-1">Địa chỉ đầy đủ:</p>
                                            <p>{buildAddress()}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Ghi chú */}
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                                <Label><Phone className="w-3.5 h-3.5 inline mr-1" />Ghi chú thêm</Label>
                                <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                                    placeholder="Yêu cầu đặc biệt..." className="mt-1" />
                            </div>

                            {/* Submit */}
                            <div className="flex gap-3">
                                <Button type="button" variant="outline" onClick={handleBack}
                                    className="h-12 px-6 border-gray-300">
                                    Hủy
                                </Button>
                                <Button type="submit" className="flex-1 h-12 bg-blue-700 hover:bg-blue-800 text-base"
                                    disabled={submitting || !form.reason || !form.customerName.trim() || !form.customerPhone.trim()}>
                                    {submitting ? '⏳ Đang tạo...' : 'Tạo phiếu bảo hành'}
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

                {/* ── Step 3: Thành công ── */}
                {submitted && result && (
                    <div className="text-center py-8 space-y-6">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 mb-2">
                            <CheckCircle className="w-10 h-10 text-emerald-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">Tạo phiếu thành công!</h2>
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 max-w-md mx-auto">
                            <div className="space-y-3 text-left">
                                <div className="flex justify-between">
                                    <span className="text-gray-500 text-sm">Mã phiếu BH:</span>
                                    <span className="font-mono font-semibold text-blue-800">{result.claimCode}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 text-sm">Mã bảo hành:</span>
                                    <span className="font-mono font-semibold text-gray-800">{result.warrantyCode}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 text-sm">Sản phẩm:</span>
                                    <span className="font-medium text-gray-800">{selectedProduct?.product?.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 text-sm">Trạng thái:</span>
                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">Chờ xử lý</span>
                                </div>
                            </div>
                        </div>
                        <p className="text-gray-600 max-w-md mx-auto">
                            Phiếu bảo hành đã được tạo. Vui lòng xử lý tại trang <strong>Quản lý Bảo hành</strong>.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <Button variant="outline" onClick={handleNew} className="h-11 px-6">
                                Tạo phiếu mới
                            </Button>
                            <Button onClick={() => navigate('/admin/warranties')} className="h-11 px-6 bg-blue-700 hover:bg-blue-800">
                                Xem danh sách BH
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
