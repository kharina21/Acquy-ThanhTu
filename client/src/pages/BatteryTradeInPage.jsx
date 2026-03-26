import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
    submitBatteryTradeIn,
    uploadBatteryImage,
    getBatteryTradeInPrefill,
    updateBatteryTradeInByLookup,
} from '@/services/batteryTradeInService';
import { getProvinces, getDistricts, getWards } from '@/services/addressService';
import { FileText, ImagePlus, X, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Họ tên: 2–30 ký tự, chữ (Unicode), dấu cách, dấu chấm
const validateTradeInName = (name) => {
    const s = (name || '').trim();
    if (!s) return 'Vui lòng nhập họ tên';
    if (s.length < 2) return 'Họ tên phải có ít nhất 2 ký tự';
    if (s.length > 30) return 'Họ tên không quá 30 ký tự';
    if (!/^[\p{L}\s.'-]+$/u.test(s)) return 'Họ tên chỉ được chứa chữ cái, dấu cách hoặc dấu chấm';
    return null;
};

// SĐT Việt Nam: 10–11 số, bắt đầu 03/05/07/08/09/02
const validatePhone = (phone) => {
    const s = (phone || '').trim().replace(/\s/g, '');
    if (!s) return 'Vui lòng nhập số điện thoại';
    if (!/^0[2-9][0-9]{8,9}$/.test(s)) return 'Số điện thoại không hợp lệ (ví dụ: 0901234567)';
    return null;
};

// Gmail đúng định dạng @gmail.com
const validateGmail = (email) => {
    const s = (email || '').trim().toLowerCase();
    if (!s) return 'Vui lòng nhập email';
    if (!/^[a-z0-9]([a-z0-9._+-]*[a-z0-9])?@gmail\.com$/.test(s)) {
        return 'Vui lòng nhập đúng định dạng Gmail (ví dụ: ten@gmail.com)';
    }
    return null;
};

const validateAddressLine = (addr) => {
    const s = (addr || '').trim();
    if (!s) return 'Vui lòng nhập địa chỉ cụ thể (số nhà, tên đường...)';
    if (s.length < 10) return 'Địa chỉ phải có ít nhất 10 ký tự';
    if (s.length > 200) return 'Địa chỉ không quá 200 ký tự';
    return null;
};

const validateNote = (note) => {
    const s = (note || '').trim();
    if (s.length > 500) return 'Ghi chú không quá 500 ký tự';
    return null;
};

const parseMetric = (str) => {
    const n = parseFloat(String(str || '').replace(',', '.').trim());
    if (!Number.isFinite(n)) return null;
    return n;
};

const toDateInput = (d) => {
    if (!d) return '';
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return '';
    return x.toISOString().slice(0, 10);
};

/** Chỉ cho phép chữ số và tối đa một dấu phân thập phân (`,` hoặc `.`) */
const filterMetricInput = (value) => {
    let out = '';
    let hasSep = false;
    for (const c of String(value)) {
        if (c >= '0' && c <= '9') {
            out += c;
        } else if ((c === '.' || c === ',') && !hasSep) {
            hasSep = true;
            out += c;
        }
    }
    return out;
};

const POLICY_SECTIONS = [
    {
        title: 'I. Mục đích và Phạm vi áp dụng',
        content: (
            <>
                <p className="font-medium text-blue-900">Mục đích:</p>
                <p className="mb-2 text-gray-600">Hỗ trợ khách hàng tiết kiệm chi phí khi thay thế ắc quy mới, đồng thời thu hồi các sản phẩm cũ đạt chất lượng để tối ưu hóa vòng đời sản phẩm.</p>
                <p className="font-medium text-blue-900">Phạm vi:</p>
                <p className="text-gray-600">Áp dụng cho tất cả khách hàng mang ắc quy đến giao dịch trực tiếp tại cửa hàng hoặc gửi yêu cầu cho cửa hàng. Chỉ áp dụng cho các dòng ắc quy Ô tô / Xe máy / Xe điện.</p>
            </>
        ),
    },
    {
        title: 'II. Điều kiện tiếp nhận (Tiêu chuẩn thu cũ)',
        content: (
            <>
                <p className="mb-2 text-gray-600">Sản phẩm ắc quy cũ sẽ được tiếp nhận và định giá nếu thỏa mãn toàn bộ các điều kiện sau:</p>
                <p className="font-medium text-blue-900 mt-3">Về tuổi thọ và niên hạn:</p>
                <ul className="list-disc pl-5 mb-2 text-gray-600 space-y-1">
                    <li>Ắc quy có năm sản xuất từ sau năm 2022 trở lại đây.</li>
                    <li>Hoặc ắc quy còn ít nhất 2 năm niên hạn sử dụng theo tiêu chuẩn khuyến cáo của nhà sản xuất.</li>
                </ul>
                <p className="font-medium text-blue-900 mt-3">Về tình trạng kỹ thuật:</p>
                <ul className="list-disc pl-5 mb-2 text-gray-600 space-y-1">
                    <li>Ắc quy vẫn còn khả năng tích điện và hoạt động ổn định.</li>
                    <li>Tuyệt đối không có hiện tượng rò rỉ dung dịch (axit/kiềm), chảy nước ở các cọc bình hay viền nắp.</li>
                </ul>
                <p className="font-medium text-blue-900 mt-3">Về ngoại hình:</p>
                <ul className="list-disc pl-5 text-gray-600 space-y-1">
                    <li>Vỏ bình nguyên vẹn, không móp méo, nứt vỡ và không bị phồng rộp.</li>
                    <li>Sản phẩm không có dấu hiệu bị cạy mở, tháo rời, đấu nối sai quy cách hoặc đã qua can thiệp sửa chữa từ bên thứ ba.</li>
                </ul>
            </>
        ),
    },
    {
        title: 'III. Khung định giá và Chính sách trợ giá',
        content: (
            <>
                <p className="mb-2 text-gray-600">Giá trị thu lại của ắc quy cũ sẽ được xác định dựa trên thương hiệu, dung lượng (Ah), khối lượng và tỷ lệ hao mòn thực tế sau khi kiểm tra.</p>
                <p className="font-medium text-blue-900">Trợ giá đặc biệt:</p>
                <p className="text-gray-600">Khách hàng sẽ được thu mua với mức giá cao hơn mức định giá tiêu chuẩn nếu cung cấp được Hóa đơn mua hàng hợp lệ (hóa đơn giấy hoặc điện tử) từ các cửa hàng cũ/đại lý trước đó, chứng minh được nguồn gốc và thời gian sử dụng thực tế của bình.</p>
            </>
        ),
    },
    {
        title: 'IV. Quy trình thực hiện',
        content: (
            <ol className="list-decimal pl-5 space-y-2 text-gray-600">
                <li><strong className="text-blue-900">Tiếp nhận:</strong> Nhân viên tiếp nhận ắc quy và ghi nhận thông tin ban đầu, liên hệ và  kiểm tra các chứng từ liên quan (nếu có).</li>
                <li><strong className="text-blue-900">Thẩm định:</strong> Khách hàng mang bình đến cửa hàng sẽ được Kỹ thuật viên kiểm tra ngoại quan và sử dụng thiết bị đo lường để đánh giá tình trạng cell pin/dung dịch bên trong.</li>
                <li><strong className="text-blue-900">Báo giá:</strong> Cửa hàng thông báo mức giá thu lại cho khách hàng dựa trên tình trạng thực tế.</li>
                <li><strong className="text-blue-900">Thanh toán/Khấu trừ:</strong> Số tiền thu cũ sẽ được thanh toán trực tiếp hoặc trừ trực tiếp vào hóa đơn mua ắc quy mới của khách hàng tại cửa hàng.</li>
            </ol>
        ),
    },
    {
        title: 'V. Các trường hợp từ chối thu cũ',
        content: (
            <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>Ắc quy giả, nhái các thương hiệu lớn hoặc không rõ nguồn gốc xuất xứ.</li>
                <li>Sản phẩm có dấu hiệu cố tình thay đổi/tẩy xóa ngày tháng năm sản xuất trên vỏ bình.</li>
                <li>Ắc quy đã chết hoàn toàn, chập mạch, đứt cell hoặc biến dạng nặng có nguy cơ cháy nổ.</li>
            </ul>
        ),
    },
];

const emptyForm = () => ({
    name: '',
    phone: '',
    email: '',
    provinceCode: '',
    provinceName: '',
    districtCode: '',
    districtName: '',
    wardCode: '',
    wardName: '',
    addressLine: '',
    note: '',
    batteryName: '',
    images: [],
    quantity: 1,
    manufacturingDate: '',
    expiryDate: '',
    condition: '',
    usageDuration: '',
    isWorkingWell: null,
    pricingType: 'ampe',
    remainingAmps: '',
    weightKg: '',
});

export default function BatteryTradeInPage() {
    const { user, accessToken, logout } = useAuthStore();
    const [searchParams] = useSearchParams();
    /** Bỏ qua reset quận/xã khi điền prefill (2 bước: province + district effect) */
    const skipAddrCascadeRef = useRef(0);
    const [submitting, setSubmitting] = useState(false);
    const [prefillLoading, setPrefillLoading] = useState(false);
    const [editLookup, setEditLookup] = useState({ code: '', email: '' });
    const [agreedToPolicy, setAgreedToPolicy] = useState(false);
    const [hasFilledFromUser, setHasFilledFromUser] = useState(false);

    const [form, setForm] = useState(emptyForm);
    const [uploadingImages, setUploadingImages] = useState(false);
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [lastRequestCode, setLastRequestCode] = useState('');
    const [successIsEdit, setSuccessIsEdit] = useState(false);

    const isEditMode = Boolean(editLookup.code && editLookup.email);

    const [provinces, setProvinces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [wards, setWards] = useState([]);
    const [errors, setErrors] = useState({});

    // Tự động điền thông tin từ profile khi đã đăng nhập
    useEffect(() => {
        if (accessToken && user && !hasFilledFromUser) {
            const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
            setForm((prev) => ({
                ...prev,
                name: fullName || prev.name,
                phone: user.phoneNumber || prev.phone,
                email: user.email || prev.email,
                addressLine: user.address ? String(user.address).trim() : prev.addressLine,
            }));
            setHasFilledFromUser(true);
        }
    }, [accessToken, user, hasFilledFromUser]);

    useEffect(() => {
        getProvinces().then(setProvinces).catch(() => setProvinces([]));
    }, []);

    useEffect(() => {
        if (skipAddrCascadeRef.current > 0) {
            skipAddrCascadeRef.current -= 1;
            return;
        }
        if (!form.provinceCode) {
            setDistricts([]);
            setWards([]);
            return;
        }
        getDistricts(form.provinceCode).then(setDistricts).catch(() => setDistricts([]));
        setForm((f) => ({ ...f, districtCode: '', districtName: '', wardCode: '', wardName: '' }));
    }, [form.provinceCode]);

    useEffect(() => {
        if (skipAddrCascadeRef.current > 0) {
            skipAddrCascadeRef.current -= 1;
            return;
        }
        if (!form.districtCode) {
            setWards([]);
            return;
        }
        getWards(form.districtCode).then(setWards).catch(() => setWards([]));
        setForm((f) => ({ ...f, wardCode: '', wardName: '' }));
    }, [form.districtCode]);

    useEffect(() => {
        const edit = searchParams.get('edit');
        const code = searchParams.get('code')?.trim().toUpperCase();
        const email = searchParams.get('email')?.trim().toLowerCase();
        if (edit !== '1' || !code || !email) {
            setEditLookup({ code: '', email: '' });
            return;
        }
        let cancelled = false;
        (async () => {
            setPrefillLoading(true);
            try {
                const res = await getBatteryTradeInPrefill({ code, email });
                const d = res?.data;
                if (cancelled) return;
                if (!res?.success || !d) {
                    toast.error(res?.message || 'Không tải được dữ liệu để sửa.');
                    setEditLookup({ code: '', email: '' });
                    return;
                }
                const pc = d.provinceCode || '';
                const dc = d.districtCode || '';
                const dList = pc ? await getDistricts(pc).catch(() => []) : [];
                const wList = dc ? await getWards(dc).catch(() => []) : [];
                if (cancelled) return;
                if (pc && dc) skipAddrCascadeRef.current = 2;
                else if (pc) skipAddrCascadeRef.current = 1;
                else skipAddrCascadeRef.current = 0;
                setDistricts(dList);
                setWards(wList);
                setForm({
                    name: d.name || '',
                    phone: d.phone || '',
                    email: d.email || '',
                    provinceCode: pc,
                    provinceName: d.provinceName || '',
                    districtCode: dc,
                    districtName: d.districtName || '',
                    wardCode: d.wardCode || '',
                    wardName: d.wardName || '',
                    addressLine: d.addressLine || '',
                    note: d.note || '',
                    batteryName: d.batteryName || '',
                    images: Array.isArray(d.images) ? d.images : [],
                    quantity: d.quantity ?? 1,
                    manufacturingDate: toDateInput(d.manufacturingDate),
                    expiryDate: toDateInput(d.expiryDate),
                    condition: d.condition || '',
                    usageDuration: d.usageDuration || '',
                    isWorkingWell: d.isWorkingWell === true ? true : d.isWorkingWell === false ? false : null,
                    pricingType: d.pricingType === 'weight' ? 'weight' : 'ampe',
                    remainingAmps: d.remainingAmps != null ? String(d.remainingAmps) : '',
                    weightKg: d.weightKg != null ? String(d.weightKg) : '',
                });
                setEditLookup({ code, email });
                setAgreedToPolicy(true);
                setHasFilledFromUser(true);
            } catch (err) {
                if (!cancelled) {
                    toast.error(err?.response?.data?.message || 'Không tải được dữ liệu để sửa.');
                    setEditLookup({ code: '', email: '' });
                }
            } finally {
                if (!cancelled) setPrefillLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [searchParams]);

    const buildShippingAddress = () => {
        const parts = [
            form.addressLine?.trim(),
            form.wardName,
            form.districtName,
            form.provinceName,
        ].filter(Boolean);
        return parts.join(', ');
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors((er) => ({ ...er, [name]: null }));
    };

    const handleMetricChange = (field) => (e) => {
        const v = filterMetricInput(e.target.value);
        setForm((prev) => ({ ...prev, [field]: v }));
        if (errors.metric) setErrors((er) => ({ ...er, metric: null }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!agreedToPolicy) {
            toast.error('Vui lòng xác nhận đồng ý với chính sách của cửa hàng.');
            return;
        }

        const errName = validateTradeInName(form.name);
        const errPhone = validatePhone(form.phone);
        const errEmail = validateGmail(form.email);
        const errProvince = !form.provinceCode ? 'Vui lòng chọn Tỉnh/Thành phố' : null;
        const errDistrict = !form.districtCode ? 'Vui lòng chọn Quận/Huyện' : null;
        const errWard = !form.wardCode ? 'Vui lòng chọn Phường/Xã' : null;
        const errAddressLine = validateAddressLine(form.addressLine);
        const errNote = validateNote(form.note);

        const bn = (form.batteryName || '').trim();
        const errBatteryName = !bn ? 'Vui lòng nhập tên ắc quy' : null;

        const imgs = form.images || [];
        const errImages = imgs.length < 2 ? 'Vui lòng tải ít nhất 2 ảnh ắc quy cũ' : null;

        const qty = parseInt(form.quantity, 10);
        const errQuantity =
            !Number.isInteger(qty) || qty < 1 ? 'Số lượng phải là số nguyên dương (tối thiểu 1)' : null;

        const errMfg = !form.manufacturingDate ? 'Vui lòng chọn ngày sản xuất' : null;
        const errExp = !form.expiryDate ? 'Vui lòng chọn hạn sử dụng' : null;
        let errDateOrder = null;
        if (form.manufacturingDate && form.expiryDate) {
            const m = new Date(`${form.manufacturingDate}T00:00:00`);
            const ex = new Date(`${form.expiryDate}T00:00:00`);
            if (ex <= m) errDateOrder = 'Hạn sử dụng phải sau ngày sản xuất';
        }

        let errMetric = null;
        if (form.pricingType === 'ampe') {
            const v = parseMetric(form.remainingAmps);
            if (v == null) errMetric = 'Vui lòng nhập số Ampe (Ah)';
            else if (v <= 0 || v >= 200) errMetric = 'Số Ampe phải lớn hơn 0 và nhỏ hơn 200';
        } else {
            const v = parseMetric(form.weightKg);
            if (v == null) errMetric = 'Vui lòng nhập cân nặng (kg)';
            else if (v <= 0 || v >= 200) errMetric = 'Cân nặng phải lớn hơn 0 và nhỏ hơn 200 (kg)';
        }

        const newErrors = {
            name: errName,
            phone: errPhone,
            email: errEmail,
            provinceCode: errProvince,
            districtCode: errDistrict,
            wardCode: errWard,
            addressLine: errAddressLine,
            note: errNote,
            batteryName: errBatteryName,
            images: errImages,
            quantity: errQuantity,
            manufacturingDate: errMfg,
            expiryDate: errExp,
            dateOrder: errDateOrder,
            metric: errMetric,
        };
        setErrors(newErrors);

        const hasError = Object.values(newErrors).some(Boolean);
        if (hasError) {
            toast.error('Vui lòng kiểm tra và sửa thông tin chưa hợp lệ');
            return;
        }

        const payload = {
            name: form.name.trim(),
            phone: form.phone.trim().replace(/\s/g, ''),
            email: form.email.trim().toLowerCase(),
            provinceCode: form.provinceCode,
            provinceName: form.provinceName,
            districtCode: form.districtCode,
            districtName: form.districtName,
            wardCode: form.wardCode,
            wardName: form.wardName,
            addressLine: form.addressLine?.trim() || '',
            note: form.note?.trim() || '',
            batteryName: bn,
            images: imgs,
            quantity: qty,
            manufacturingDate: form.manufacturingDate || undefined,
            expiryDate: form.expiryDate || undefined,
            condition: form.condition?.trim() || '',
            usageDuration: form.usageDuration?.trim() || '',
            isWorkingWell: form.isWorkingWell === true ? true : form.isWorkingWell === false ? false : undefined,
            pricingType: form.pricingType || 'ampe',
            remainingAmps: form.pricingType === 'ampe' ? String(parseMetric(form.remainingAmps)) : '',
            weightKg: form.pricingType === 'weight' ? String(parseMetric(form.weightKg)) : '',
        };

        setSubmitting(true);
        try {
            if (isEditMode) {
                const submitRes = await updateBatteryTradeInByLookup({
                    code: editLookup.code,
                    email: editLookup.email,
                    ...payload,
                });
                const reqCode = submitRes?.data?.request?.requestCode;
                setLastRequestCode(typeof reqCode === 'string' ? reqCode : editLookup.code);
                setSuccessIsEdit(true);
                setShowSuccessDialog(true);
                setErrors({});
            } else {
                const submitRes = await submitBatteryTradeIn(payload);
                const reqCode = submitRes?.data?.request?.requestCode;
                setLastRequestCode(typeof reqCode === 'string' ? reqCode : '');
                setSuccessIsEdit(false);
                setShowSuccessDialog(true);
                setForm(emptyForm());
                setAgreedToPolicy(false);
                setHasFilledFromUser(false);
                setErrors({});
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Lỗi khi gửi yêu cầu. Vui lòng thử lại.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            toast.success('Đã đăng xuất thành công !');
        } catch {
            toast.error('Lỗi khi đăng xuất !');
        }
    };

    const isAmpePricing = form.pricingType === 'ampe';

    const handleImageUpload = async (e) => {
        const files = e.target.files;
        if (!files?.length) return;
        const total = (form.images?.length || 0) + files.length;
        if (total > 5) {
            toast.error('Tối đa 5 ảnh.');
            return;
        }
        setUploadingImages(true);
        try {
            const res = await uploadBatteryImage(Array.from(files));
            if (res?.success && res?.data?.urls) {
                setForm((prev) => ({ ...prev, images: [...(prev.images || []), ...res.data.urls] }));
                if (errors.images) setErrors((er) => ({ ...er, images: null }));
                toast.success('Đã tải ảnh lên.');
            } else {
                toast.error('Lỗi khi tải ảnh.');
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Lỗi khi tải ảnh.');
        } finally {
            setUploadingImages(false);
        }
    };

    const removeImage = (index) => {
        setForm((prev) => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index),
        }));
    };

    const selectClassName =
        'mt-1 flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition';

    const inputError = (key) => (errors[key] ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200');

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header user={user} onLogout={handleLogout} />

            <main className="flex-1 container mx-auto px-4 py-8">
                <h1 className="text-2xl md:text-3xl font-bold text-blue-900 mb-2 text-center">
                    {isEditMode ? 'Sửa yêu cầu thu cũ' : 'Chương trình thu cũ ắc quy'}
                </h1>
                <p className="text-center text-sm text-gray-600 mb-8">
                    {isEditMode ? (
                        <>
                            Mã <span className="font-mono font-semibold text-blue-900">{editLookup.code}</span> —{' '}
                            <Link to="/battery-trade-in/tra-cuu" className="text-blue-700 hover:underline font-medium">
                                Quay lại tra cứu
                            </Link>
                        </>
                    ) : (
                        <Link to="/battery-trade-in/tra-cuu" className="text-blue-700 hover:underline font-medium">
                            Tra cứu yêu cầu đã gửi (mã + Gmail)
                        </Link>
                    )}
                </p>
                {prefillLoading && (
                    <p className="text-center text-sm text-blue-800 mb-4">Đang tải dữ liệu đơn...</p>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
                    <div className="order-2 lg:order-1">
                        <form onSubmit={handleSubmit} className={`space-y-6 ${prefillLoading ? 'opacity-60 pointer-events-none' : ''}`}>
                            <Card className="border-0 shadow-lg bg-white rounded-xl overflow-hidden">
                                <CardHeader className="bg-blue-900 text-white py-4">
                                    <CardTitle className="text-lg font-semibold">Thông tin liên hệ</CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 space-y-4">
                                    <div>
                                        <Label htmlFor="name" className="text-gray-700 font-medium">
                                            Họ tên *
                                        </Label>
                                        <Input
                                            id="name"
                                            name="name"
                                            value={form.name}
                                            onChange={handleChange}
                                            placeholder="Nguyễn Văn A"
                                            className={`mt-1 h-10 rounded-lg ${inputError('name')}`}
                                        />
                                        {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
                                    </div>
                                    <div>
                                        <Label htmlFor="phone" className="text-gray-700 font-medium">
                                            Số điện thoại *
                                        </Label>
                                        <Input
                                            id="phone"
                                            name="phone"
                                            type="tel"
                                            value={form.phone}
                                            onChange={handleChange}
                                            placeholder="0901234567"
                                            className={`mt-1 h-10 rounded-lg ${inputError('phone')}`}
                                        />
                                        {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
                                    </div>
                                    <div>
                                        <Label htmlFor="email" className="text-gray-700 font-medium">
                                            Gmail *
                                        </Label>
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            value={form.email}
                                            onChange={handleChange}
                                            placeholder="ten@gmail.com"
                                            readOnly={isEditMode}
                                            className={`mt-1 h-10 rounded-lg ${inputError('email')} ${isEditMode ? 'bg-gray-100' : ''}`}
                                        />
                                        {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
                                    </div>

                                    <div className="pt-2 border-t border-gray-100 space-y-3">
                                        <p className="text-sm font-medium text-gray-800">Địa chỉ (giống đặt hàng)</p>
                                        <div>
                                            <label className="text-xs text-gray-600">Tỉnh / Thành phố *</label>
                                            <select
                                                className={`select select-bordered select-sm w-full mt-1 ${errors.provinceCode ? 'select-error' : ''}`}
                                                value={form.provinceCode}
                                                onChange={(e) => {
                                                    const code = e.target.value;
                                                    const p = provinces.find((x) => String(x.code) === code);
                                                    setForm((f) => ({
                                                        ...f,
                                                        provinceCode: code,
                                                        provinceName: p?.name || '',
                                                    }));
                                                    if (errors.provinceCode) setErrors((er) => ({ ...er, provinceCode: null }));
                                                }}
                                            >
                                                <option value="">— Chọn Tỉnh/Thành phố —</option>
                                                {provinces.map((p) => (
                                                    <option key={p.code} value={p.code}>
                                                        {p.name}
                                                    </option>
                                                ))}
                                            </select>
                                            {errors.provinceCode && <p className="text-xs text-red-600 mt-1">{errors.provinceCode}</p>}
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-600">Quận / Huyện *</label>
                                            <select
                                                className={`select select-bordered select-sm w-full mt-1 ${errors.districtCode ? 'select-error' : ''}`}
                                                value={form.districtCode}
                                                onChange={(e) => {
                                                    const code = e.target.value;
                                                    const d = districts.find((x) => String(x.code) === code);
                                                    setForm((f) => ({
                                                        ...f,
                                                        districtCode: code,
                                                        districtName: d?.name || '',
                                                    }));
                                                    if (errors.districtCode) setErrors((er) => ({ ...er, districtCode: null }));
                                                }}
                                                disabled={!form.provinceCode}
                                            >
                                                <option value="">— Chọn Quận/Huyện —</option>
                                                {districts.map((d) => (
                                                    <option key={d.code} value={d.code}>
                                                        {d.name}
                                                    </option>
                                                ))}
                                            </select>
                                            {errors.districtCode && <p className="text-xs text-red-600 mt-1">{errors.districtCode}</p>}
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-600">Phường / Xã / Thị trấn *</label>
                                            <select
                                                className={`select select-bordered select-sm w-full mt-1 ${errors.wardCode ? 'select-error' : ''}`}
                                                value={form.wardCode}
                                                onChange={(e) => {
                                                    const code = e.target.value;
                                                    const w = wards.find((x) => String(x.code) === code);
                                                    setForm((f) => ({
                                                        ...f,
                                                        wardCode: code,
                                                        wardName: w?.name || '',
                                                    }));
                                                    if (errors.wardCode) setErrors((er) => ({ ...er, wardCode: null }));
                                                }}
                                                disabled={!form.districtCode}
                                            >
                                                <option value="">— Chọn Phường/Xã/Thị trấn —</option>
                                                {wards.map((w) => (
                                                    <option key={w.code} value={w.code}>
                                                        {w.name}
                                                    </option>
                                                ))}
                                            </select>
                                            {errors.wardCode && <p className="text-xs text-red-600 mt-1">{errors.wardCode}</p>}
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-600">Địa chỉ cụ thể (số nhà, tên đường...) *</label>
                                            <input
                                                type="text"
                                                name="addressLine"
                                                className={`input input-bordered input-sm w-full mt-1 ${errors.addressLine ? 'input-error' : ''}`}
                                                placeholder="Ví dụ: Số 123, đường ABC"
                                                value={form.addressLine}
                                                onChange={(e) => {
                                                    setForm((f) => ({ ...f, addressLine: e.target.value }));
                                                    if (errors.addressLine) setErrors((er) => ({ ...er, addressLine: null }));
                                                }}
                                            />
                                            {errors.addressLine && <p className="text-xs text-red-600 mt-1">{errors.addressLine}</p>}
                                        </div>
                                    </div>

                                    <div>
                                        <Label htmlFor="note" className="text-gray-700 font-medium">
                                            Ghi chú
                                        </Label>
                                        <Input
                                            id="note"
                                            name="note"
                                            value={form.note}
                                            onChange={handleChange}
                                            placeholder="Thông tin bổ sung..."
                                            className={`mt-1 h-10 rounded-lg ${inputError('note')}`}
                                        />
                                        {errors.note && <p className="text-xs text-red-600 mt-1">{errors.note}</p>}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-0 shadow-lg bg-white rounded-xl overflow-hidden">
                                <CardHeader className="bg-blue-900 text-white py-4">
                                    <CardTitle className="text-lg font-semibold">Thông tin ắc quy cần thu</CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 space-y-4">
                                    <div>
                                        <Label htmlFor="batteryName" className="text-gray-700 font-medium">
                                            Tên ắc quy *
                                        </Label>
                                        <Input
                                            id="batteryName"
                                            name="batteryName"
                                            value={form.batteryName}
                                            onChange={handleChange}
                                            placeholder="VD: Ắc quy ABC 60Ah"
                                            className={`mt-1 h-10 rounded-lg ${inputError('batteryName')}`}
                                        />
                                        {errors.batteryName && <p className="text-xs text-red-600 mt-1">{errors.batteryName}</p>}
                                    </div>

                                    <div>
                                        <Label className="text-gray-700 font-medium">Ảnh thực tế sản phẩm *</Label>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            Ít nhất 2 ảnh, tối đa 5 ảnh (JPEG, PNG, WebP, GIF - 3MB/ảnh)
                                        </p>
                                        {errors.images && <p className="text-xs text-red-600 mt-1">{errors.images}</p>}
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {form.images?.map((url, i) => (
                                                <div key={i} className="relative group">
                                                    <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeImage(i)}
                                                        className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                            {form.images?.length < 5 && (
                                                <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition">
                                                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={uploadingImages} />
                                                    {uploadingImages ? (
                                                        <span className="text-xs text-gray-500">Đang tải...</span>
                                                    ) : (
                                                        <ImagePlus className="w-6 h-6 text-gray-400" />
                                                    )}
                                                </label>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <Label htmlFor="quantity" className="text-gray-700 font-medium">
                                            Số lượng acquy thu cũ *
                                        </Label>
                                        <Input
                                            id="quantity"
                                            name="quantity"
                                            type="number"
                                            min={1}
                                            step={1}
                                            value={form.quantity}
                                            onChange={handleChange}
                                            className={`mt-1 h-10 rounded-lg w-24 ${inputError('quantity')}`}
                                        />
                                        {errors.quantity && <p className="text-xs text-red-600 mt-1">{errors.quantity}</p>}
                                    </div>

                                    <div>
                                        <Label htmlFor="manufacturingDate" className="text-gray-700 font-medium">
                                            Ngày sản xuất *
                                        </Label>
                                        <Input
                                            id="manufacturingDate"
                                            name="manufacturingDate"
                                            type="date"
                                            value={form.manufacturingDate}
                                            onChange={handleChange}
                                            className={`mt-1 h-10 rounded-lg ${inputError('manufacturingDate')}`}
                                        />
                                        {errors.manufacturingDate && <p className="text-xs text-red-600 mt-1">{errors.manufacturingDate}</p>}
                                    </div>
                                    <div>
                                        <Label htmlFor="expiryDate" className="text-gray-700 font-medium">
                                            Hạn sử dụng *
                                        </Label>
                                        <Input
                                            id="expiryDate"
                                            name="expiryDate"
                                            type="date"
                                            value={form.expiryDate}
                                            onChange={handleChange}
                                            className={`mt-1 h-10 rounded-lg ${inputError('expiryDate')}`}
                                        />
                                        {errors.expiryDate && <p className="text-xs text-red-600 mt-1">{errors.expiryDate}</p>}
                                        {errors.dateOrder && <p className="text-xs text-red-600 mt-1">{errors.dateOrder}</p>}
                                    </div>
                                    <div>
                                        <Label htmlFor="condition" className="text-gray-700 font-medium">
                                            Tình trạng
                                        </Label>
                                        <select
                                            id="condition"
                                            name="condition"
                                            value={form.condition}
                                            onChange={handleChange}
                                            className={selectClassName}
                                        >
                                            <option value="">-- Chọn --</option>
                                            <option value="tốt">Tốt</option>
                                            <option value="trung bình">Trung bình</option>
                                            <option value="kém">Kém</option>
                                        </select>
                                    </div>
                                    <div>
                                        <Label htmlFor="usageDuration" className="text-gray-700 font-medium">
                                            Đã sử dụng bao lâu
                                        </Label>
                                        <Input
                                            id="usageDuration"
                                            name="usageDuration"
                                            value={form.usageDuration}
                                            onChange={handleChange}
                                            placeholder="VD: 2 năm, 18 tháng..."
                                            className="mt-1 h-10 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-gray-700 font-medium">Hoạt động còn tốt không?</Label>
                                        <div className="flex gap-6 mt-2">
                                            <label className="flex items-center gap-2 cursor-pointer text-gray-600">
                                                <input
                                                    type="radio"
                                                    name="isWorkingWell"
                                                    checked={form.isWorkingWell === true}
                                                    onChange={() => setForm((p) => ({ ...p, isWorkingWell: true }))}
                                                    className="text-blue-600 focus:ring-blue-500"
                                                />
                                                Có
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer text-gray-600">
                                                <input
                                                    type="radio"
                                                    name="isWorkingWell"
                                                    checked={form.isWorkingWell === false}
                                                    onChange={() => setForm((p) => ({ ...p, isWorkingWell: false }))}
                                                    className="text-blue-600 focus:ring-blue-500"
                                                />
                                                Không
                                            </label>
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-gray-700 font-medium">Định giá theo</Label>
                                        <div className="flex gap-6 mt-2">
                                            <label className="flex items-center gap-2 cursor-pointer text-gray-600">
                                                <input
                                                    type="radio"
                                                    name="pricingType"
                                                    checked={form.pricingType === 'ampe'}
                                                    onChange={() => setForm((p) => ({ ...p, pricingType: 'ampe', weightKg: '' }))}
                                                    className="text-blue-600 focus:ring-blue-500"
                                                />
                                                Theo Ampe (Ah)
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer text-gray-600">
                                                <input
                                                    type="radio"
                                                    name="pricingType"
                                                    checked={form.pricingType === 'weight'}
                                                    onChange={() => setForm((p) => ({ ...p, pricingType: 'weight', remainingAmps: '' }))}
                                                    className="text-blue-600 focus:ring-blue-500"
                                                />
                                                Theo cân nặng (kg)
                                            </label>
                                        </div>
                                    </div>
                                    {isAmpePricing ? (
                                        <div>
                                            <Label htmlFor="remainingAmps" className="text-gray-700 font-medium">
                                                Còn bao nhiêu Ampe (Ah) * (0 &lt; Ah &lt; 200)
                                            </Label>
                                            <Input
                                                id="remainingAmps"
                                                name="remainingAmps"
                                                type="text"
                                                inputMode="decimal"
                                                autoComplete="off"
                                                value={form.remainingAmps}
                                                onChange={handleMetricChange('remainingAmps')}
                                                placeholder="VD: 45, 60..."
                                                className={`mt-1 h-10 rounded-lg ${inputError('metric')}`}
                                            />
                                            {errors.metric && isAmpePricing && (
                                                <p className="text-xs text-red-600 mt-1">{errors.metric}</p>
                                            )}
                                        </div>
                                    ) : (
                                        <div>
                                            <Label htmlFor="weightKg" className="text-gray-700 font-medium">
                                                Cân nặng acquy (kg) * (0 &lt; kg &lt; 200)
                                            </Label>
                                            <Input
                                                id="weightKg"
                                                name="weightKg"
                                                type="text"
                                                inputMode="decimal"
                                                autoComplete="off"
                                                value={form.weightKg}
                                                onChange={handleMetricChange('weightKg')}
                                                placeholder="VD: 12, 15..."
                                                className={`mt-1 h-10 rounded-lg ${inputError('metric')}`}
                                            />
                                            {errors.metric && !isAmpePricing && (
                                                <p className="text-xs text-red-600 mt-1">{errors.metric}</p>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-white rounded-xl shadow-lg border border-gray-100">
                                <div className="flex items-center gap-3 flex-1">
                                    <Checkbox
                                        id="policy"
                                        checked={agreedToPolicy}
                                        onCheckedChange={(checked) => setAgreedToPolicy(!!checked)}
                                        className="border-gray-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                    />
                                    <label htmlFor="policy" className="text-sm text-gray-700 cursor-pointer">
                                        Tôi đồng ý với chính sách của cửa hàng
                                    </label>
                                </div>
                                <Button
                                    type="submit"
                                    disabled={submitting || prefillLoading}
                                    className="bg-blue-600 hover:bg-blue-700 px-8 py-6 text-base font-semibold rounded-lg shadow-md hover:shadow-lg transition"
                                >
                                    {submitting
                                        ? isEditMode
                                            ? 'Đang lưu...'
                                            : 'Đang gửi...'
                                        : isEditMode
                                          ? 'Lưu thay đổi'
                                          : 'Gửi yêu cầu'}
                                </Button>
                            </div>
                        </form>
                    </div>

                    <div className="order-1 lg:order-2">
                        <Card className="border-0 shadow-lg bg-white rounded-xl overflow-hidden sticky top-4">
                            <CardHeader className="bg-blue-900 text-white py-4 flex flex-row items-center gap-2">
                                <FileText className="w-5 h-5" />
                                <CardTitle className="text-lg font-semibold">Chính sách và quy định thu cũ đổi mới ắc quy</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 max-h-[calc(100vh-12rem)] overflow-y-auto">
                                <div className="space-y-6">
                                    {POLICY_SECTIONS.map((section, i) => (
                                        <div key={i} className="pb-6 border-b border-gray-100 last:border-0 last:pb-0">
                                            <h3 className="font-semibold text-blue-900 mb-3 text-base">{section.title}</h3>
                                            <div className="leading-relaxed text-sm">{section.content}</div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>

            <Footer />

            <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="flex flex-col items-center gap-4 text-center">
                            <div className="p-3 bg-green-100 rounded-full">
                                <CheckCircle className="w-12 h-12 text-green-600" />
                            </div>
                            <DialogTitle className="text-xl">
                                {successIsEdit ? 'Đã lưu thay đổi' : 'Đã gửi yêu cầu thành công'}
                            </DialogTitle>
                        </div>
                    </DialogHeader>
                    <div className="space-y-4 text-gray-600">
                        {lastRequestCode && (
                            <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-left">
                                <p className="text-xs text-blue-800 font-medium mb-1">Mã yêu cầu của bạn</p>
                                <p className="font-mono text-lg font-bold text-blue-900 tracking-wide">{lastRequestCode}</p>
                                <p className="text-xs text-blue-700 mt-2">
                                    Đã gửi kèm email. Bạn có thể{' '}
                                    <Link to="/battery-trade-in/tra-cuu" className="underline font-medium">
                                        tra cứu trạng thái
                                    </Link>{' '}
                                    bằng mã và Gmail.
                                </p>
                            </div>
                        )}
                        {!successIsEdit && <p>Chuyên viên cửa hàng sẽ liên hệ để xác nhận và xử lý.</p>}
                        {successIsEdit && (
                            <p>Thông tin yêu cầu đã được cập nhật. Bạn có thể tra cứu lại bằng mã và Gmail.</p>
                        )}
                        <p>
                            Mọi thắc mắc hay yêu cầu xin gọi về{' '}
                            <a href="tel:0386806456" className="font-semibold text-blue-600 hover:underline">
                                0386806456
                            </a>{' '}
                            để được hỗ trợ sớm nhất.
                        </p>
                    </div>
                    <div className="flex justify-center pt-2">
                        <Button onClick={() => setShowSuccessDialog(false)} className="bg-blue-600 hover:bg-blue-700">
                            Đóng
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
