import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { createBatteryTradeInOffline } from '@/services/batteryTradeInService';
import { getActiveLocations } from '@/services/locationService';
import { getProvinces, getDistricts, getWards } from '@/services/addressService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Save } from 'lucide-react';

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
    quantity: 1,
    manufacturingDate: '',
    expiryDate: '',
    condition: '',
    usageDuration: '',
    isWorkingWell: null,
    pricingType: 'ampe',
    remainingAmps: '',
    weightKg: '',
    preferredLocationId: '',
});

const validateTradeInName = (name) => {
    const s = (name || '').trim();
    if (!s) return 'Vui lòng nhập họ tên';
    if (s.length < 2) return 'Họ tên phải có ít nhất 2 ký tự';
    if (s.length > 30) return 'Họ tên không quá 30 ký tự';
    if (!/^[\p{L}\s.'-]+$/u.test(s)) return 'Họ tên chỉ được chứa chữ cái, dấu cách hoặc dấu chấm';
    return null;
};

const validatePhone = (phone) => {
    const s = (phone || '').trim().replace(/\s/g, '');
    if (!s) return 'Vui lòng nhập số điện thoại';
    if (!/^0[2-9][0-9]{8,9}$/.test(s)) return 'Số điện thoại không hợp lệ (ví dụ: 0901234567)';
    return null;
};

const validateGmail = (email) => {
    const s = (email || '').trim().toLowerCase();
    if (!s) return 'Vui lòng nhập email';
    if (!/^[a-z0-9]([a-z0-9._+-]*[a-z0-9])?@gmail\.com$/.test(s)) {
        return 'Vui lòng nhập đúng định dạng Gmail (ví dụ: ten@gmail.com)';
    }
    return null;
};

const parseMetric = (str) => {
    const n = parseFloat(String(str || '').replace(',', '.').trim());
    if (!Number.isFinite(n)) return null;
    return n;
};

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

export default function AdminBatteryTradeInCreatePage() {
    const navigate = useNavigate();
    const [form, setForm] = useState(emptyForm());
    const [locations, setLocations] = useState([]);
    const [provinces, setProvinces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [wards, setWards] = useState([]);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        getActiveLocations()
            .then((res) => {
                if (res.success && Array.isArray(res.data?.locations)) {
                    setLocations(res.data.locations);
                }
            })
            .catch(() => {});
        getProvinces().then(setProvinces).catch(() => setProvinces([]));
    }, []);

    useEffect(() => {
        if (!form.provinceCode) {
            setDistricts([]);
            setWards([]);
            return;
        }
        getDistricts(form.provinceCode).then(setDistricts).catch(() => setDistricts([]));
        setForm((f) => ({ ...f, districtCode: '', districtName: '', wardCode: '', wardName: '' }));
    }, [form.provinceCode]);

    useEffect(() => {
        if (!form.districtCode) {
            setWards([]);
            return;
        }
        getWards(form.districtCode).then(setWards).catch(() => setWards([]));
        setForm((f) => ({ ...f, wardCode: '', wardName: '' }));
    }, [form.districtCode]);

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

        const errName = validateTradeInName(form.name);
        const errPhone = validatePhone(form.phone);
        const errEmail = validateGmail(form.email);
        const errBatteryName = !form.batteryName.trim() ? 'Vui lòng nhập tên ắc quy' : null;
        const errPreferredLocation = !form.preferredLocationId ? 'Vui lòng chọn cơ sở tiếp nhận' : null;

        const qty = parseInt(form.quantity, 10);
        const errQuantity = !Number.isInteger(qty) || qty < 1
            ? 'Số lượng phải là số nguyên dương'
            : qty > 100 ? 'Số lượng không được vượt quá 100' : null;

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
            batteryName: errBatteryName,
            preferredLocationId: errPreferredLocation,
            quantity: errQuantity,
            manufacturingDate: errMfg,
            expiryDate: errExp,
            dateOrder: errDateOrder,
            metric: errMetric,
        };
        setErrors(newErrors);

        if (Object.values(newErrors).some(Boolean)) {
            toast.error('Vui lòng kiểm tra và sửa thông tin chưa hợp lệ');
            return;
        }

        const payload = {
            name: form.name.trim(),
            phone: form.phone.trim().replace(/\s/g, ''),
            email: form.email.trim().toLowerCase(),
            provinceCode: form.provinceCode || '',
            provinceName: form.provinceName || '',
            districtCode: form.districtCode || '',
            districtName: form.districtName || '',
            wardCode: form.wardCode || '',
            wardName: form.wardName || '',
            addressLine: form.addressLine?.trim() || '',
            note: form.note?.trim() || '',
            batteryName: form.batteryName.trim(),
            quantity: qty,
            manufacturingDate: form.manufacturingDate || undefined,
            expiryDate: form.expiryDate || undefined,
            condition: form.condition?.trim() || '',
            usageDuration: form.usageDuration?.trim() || '',
            isWorkingWell: form.isWorkingWell === true ? true : form.isWorkingWell === false ? false : undefined,
            pricingType: form.pricingType || 'ampe',
            remainingAmps: form.pricingType === 'ampe' ? String(parseMetric(form.remainingAmps)) : '',
            weightKg: form.pricingType === 'weight' ? String(parseMetric(form.weightKg)) : '',
            preferredLocationId: form.preferredLocationId,
        };

        setSubmitting(true);
        try {
            const res = await createBatteryTradeInOffline(payload);
            if (res.success) {
                toast.success('Đã tạo đơn thu cũ thành công');
                navigate('/admin/battery-trade-in');
            } else {
                toast.error(res.message || 'Lỗi khi tạo đơn thu cũ');
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Lỗi khi tạo đơn thu cũ');
        } finally {
            setSubmitting(false);
        }
    };

    const isAmpePricing = form.pricingType === 'ampe';
    const inputError = (key) => errors[key] ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200';

    return (
        <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
            <div className="bg-white border-b px-6 py-4 flex items-center gap-4 shrink-0">
                <button
                    onClick={() => navigate('/admin/battery-trade-in')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Tạo đơn thu cũ tại cửa hàng</h1>
                    <p className="text-sm text-gray-500">Dành cho khách hàng đến trực tiếp cửa hàng</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-4xl mx-auto pb-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="bg-blue-900 text-white py-4">
                            <CardTitle className="text-lg font-semibold">Thông tin khách hàng</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                        value={form.email}
                                        onChange={handleChange}
                                        placeholder="ten@gmail.com"
                                        className={`mt-1 h-10 rounded-lg ${inputError('email')}`}
                                    />
                                    {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-gray-600">Địa chỉ (nếu có)</label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                                    <select
                                        className="flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:border-blue-500"
                                        value={form.provinceCode}
                                        onChange={(e) => {
                                            const code = e.target.value;
                                            const p = provinces.find((x) => String(x.code) === code);
                                            setForm((f) => ({ ...f, provinceCode: code, provinceName: p?.name || '' }));
                                        }}
                                    >
                                        <option value="">— Tỉnh/Thành phố —</option>
                                        {provinces.map((p) => (
                                            <option key={p.code} value={p.code}>{p.name}</option>
                                        ))}
                                    </select>
                                    <select
                                        className="flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:border-blue-500"
                                        value={form.districtCode}
                                        onChange={(e) => {
                                            const code = e.target.value;
                                            const d = districts.find((x) => String(x.code) === code);
                                            setForm((f) => ({ ...f, districtCode: code, districtName: d?.name || '' }));
                                        }}
                                        disabled={!form.provinceCode}
                                    >
                                        <option value="">— Quận/Huyện —</option>
                                        {districts.map((d) => (
                                            <option key={d.code} value={d.code}>{d.name}</option>
                                        ))}
                                    </select>
                                    <select
                                        className="flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:border-blue-500"
                                        value={form.wardCode}
                                        onChange={(e) => {
                                            const code = e.target.value;
                                            const w = wards.find((x) => String(x.code) === code);
                                            setForm((f) => ({ ...f, wardCode: code, wardName: w?.name || '' }));
                                        }}
                                        disabled={!form.districtCode}
                                    >
                                        <option value="">— Phường/Xã —</option>
                                        {wards.map((w) => (
                                            <option key={w.code} value={w.code}>{w.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="mt-2">
                                    <Input
                                        name="addressLine"
                                        value={form.addressLine}
                                        onChange={handleChange}
                                        placeholder="Địa chỉ cụ thể (số nhà, tên đường...)"
                                        className="h-10 rounded-lg"
                                    />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="note" className="text-gray-700 font-medium">Ghi chú</Label>
                                <Input
                                    id="note"
                                    name="note"
                                    value={form.note}
                                    onChange={handleChange}
                                    placeholder="Thông tin bổ sung..."
                                    className="mt-1 h-10 rounded-lg"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg">
                        <CardHeader className="bg-blue-900 text-white py-4">
                            <CardTitle className="text-lg font-semibold">Thông tin ắc quy thu</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    <Label htmlFor="preferredLocationId" className="text-gray-700 font-medium">
                                        Cơ sở tiếp nhận *
                                    </Label>
                                    <select
                                        id="preferredLocationId"
                                        name="preferredLocationId"
                                        value={form.preferredLocationId}
                                        onChange={(e) => {
                                            setForm((f) => ({ ...f, preferredLocationId: e.target.value }));
                                            if (errors.preferredLocationId) setErrors((er) => ({ ...er, preferredLocationId: null }));
                                        }}
                                        className={`mt-1 flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 transition ${errors.preferredLocationId ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'}`}
                                    >
                                        <option value="">— Chọn cơ sở tiếp nhận —</option>
                                        {locations.map((loc) => (
                                            <option key={loc._id} value={loc._id}>
                                                {loc.code ? `${loc.code} - ` : ''}{loc.name}
                                                {loc.address ? ` (${loc.address})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.preferredLocationId && <p className="text-xs text-red-600 mt-1">{errors.preferredLocationId}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <Label htmlFor="quantity" className="text-gray-700 font-medium">Số lượng *</Label>
                                    <Input
                                        id="quantity"
                                        name="quantity"
                                        type="number"
                                        min={1}
                                        max={100}
                                        value={form.quantity}
                                        onChange={handleChange}
                                        className={`mt-1 h-10 rounded-lg ${inputError('quantity')}`}
                                    />
                                    {errors.quantity && <p className="text-xs text-red-600 mt-1">{errors.quantity}</p>}
                                </div>
                                <div>
                                    <Label htmlFor="manufacturingDate" className="text-gray-700 font-medium">NSX *</Label>
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
                                    <Label htmlFor="expiryDate" className="text-gray-700 font-medium">HSD *</Label>
                                    <Input
                                        id="expiryDate"
                                        name="expiryDate"
                                        type="date"
                                        value={form.expiryDate}
                                        onChange={handleChange}
                                        className={`mt-1 h-10 rounded-lg ${inputError('expiryDate')}`}
                                    />
                                    {errors.expiryDate && <p className="text-xs text-red-600 mt-1">{errors.expiryDate}</p>}
                                </div>
                                <div>
                                    <Label htmlFor="condition" className="text-gray-700 font-medium">Tình trạng</Label>
                                    <select
                                        id="condition"
                                        name="condition"
                                        value={form.condition}
                                        onChange={handleChange}
                                        className="mt-1 flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:border-blue-500"
                                    >
                                        <option value="">-- Chọn --</option>
                                        <option value="tốt">Tốt</option>
                                        <option value="trung bình">Trung bình</option>
                                        <option value="kém">Kém</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="usageDuration" className="text-gray-700 font-medium">Đã sử dụng</Label>
                                    <Input
                                        id="usageDuration"
                                        name="usageDuration"
                                        value={form.usageDuration}
                                        onChange={handleChange}
                                        placeholder="VD: 2 năm, 18 tháng..."
                                        className="mt-1 h-10 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <Label className="text-gray-700 font-medium">Hoạt động còn tốt?</Label>
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
                            {errors.dateOrder && <p className="text-xs text-red-600 mt-1">{errors.dateOrder}</p>}
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => navigate('/admin/battery-trade-in')}
                            className="px-6 py-2"
                        >
                            Hủy
                        </Button>
                        <Button
                            type="submit"
                            disabled={submitting}
                            className="bg-blue-600 hover:bg-blue-700 px-6 py-2"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {submitting ? 'Đang tạo...' : 'Tạo đơn thu cũ'}
                        </Button>
                    </div>
                </form>
            </div>
            </div>
        </div>
    );
}
