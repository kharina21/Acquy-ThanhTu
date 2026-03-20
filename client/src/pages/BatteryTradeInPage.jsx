import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { submitBatteryTradeIn, uploadBatteryImage } from '@/services/batteryTradeInService';
import { getProducts } from '@/services/productService';
import { FileText, ImagePlus, X, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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

export default function BatteryTradeInPage() {
    const { user, accessToken, logout } = useAuthStore();
    const [products, setProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [agreedToPolicy, setAgreedToPolicy] = useState(false);
    const [hasFilledFromUser, setHasFilledFromUser] = useState(false);

    const [form, setForm] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
        note: '',
        productId: '',
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
    const [uploadingImages, setUploadingImages] = useState(false);
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);

    // Tự động điền thông tin từ profile khi đã đăng nhập
    useEffect(() => {
        if (accessToken && user && !hasFilledFromUser) {
            const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
            setForm((prev) => ({
                ...prev,
                name: fullName || prev.name,
                phone: user.phoneNumber || prev.phone,
                email: user.email || prev.email,
                address: user.address || prev.address,
            }));
            setHasFilledFromUser(true);
        }
    }, [accessToken, user, hasFilledFromUser]);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const res = await getProducts({ limit: 500 });
                if (res?.success && res?.data?.products) {
                    setProducts(res.data.products);
                }
            } catch (err) {
                console.error('Lỗi tải sản phẩm:', err);
            } finally {
                setLoadingProducts(false);
            }
        };
        fetchProducts();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!agreedToPolicy) {
            toast.error('Vui lòng xác nhận đồng ý với chính sách của cửa hàng.');
            return;
        }
        if (!form.name?.trim() || !form.phone?.trim() || !form.email?.trim()) {
            toast.error('Vui lòng điền đầy đủ họ tên, số điện thoại và email.');
            return;
        }
        const batteryName = form.productId === 'other' ? form.batteryName : '';
        const productId = form.productId && form.productId !== 'other' ? form.productId : null;
        if (!productId && !batteryName?.trim()) {
            toast.error('Vui lòng chọn loại ắc quy hoặc nhập tên ắc quy (khi chọn Khác).');
            return;
        }
        if (form.pricingType === 'ampe' && !form.remainingAmps?.trim()) {
            toast.error('Vui lòng nhập còn bao nhiêu Ampe (Ah).');
            return;
        }
        if (form.pricingType === 'weight' && !form.weightKg?.trim()) {
            toast.error('Vui lòng nhập cân nặng acquy (kg).');
            return;
        }

        setSubmitting(true);
        try {
            await submitBatteryTradeIn({
                name: form.name.trim(),
                phone: form.phone.trim(),
                email: form.email.trim(),
                address: form.address?.trim() || '',
                note: form.note?.trim() || '',
                productId: productId || undefined,
                batteryName: batteryName?.trim() || '',
                images: form.images || [],
                quantity: Math.max(1, parseInt(form.quantity, 10) || 1),
                manufacturingDate: form.manufacturingDate || undefined,
                expiryDate: form.expiryDate || undefined,
                condition: form.condition?.trim() || '',
                usageDuration: form.usageDuration?.trim() || '',
                isWorkingWell: form.isWorkingWell === true ? true : form.isWorkingWell === false ? false : undefined,
                pricingType: form.pricingType || 'ampe',
                remainingAmps: form.pricingType === 'ampe' ? form.remainingAmps?.trim() || '' : '',
                weightKg: form.pricingType === 'weight' ? form.weightKg?.trim() || '' : '',
            });
            setShowSuccessDialog(true);
            setForm({
                name: '',
                phone: '',
                email: '',
                address: '',
                note: '',
                productId: '',
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
            setAgreedToPolicy(false);
            setHasFilledFromUser(false);
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

    const isOtherBattery = form.productId === 'other';
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

    const selectClassName = "mt-1 flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition";

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header user={user} onLogout={handleLogout} />

            <main className="flex-1 container mx-auto px-4 py-8">
                <h1 className="text-2xl md:text-3xl font-bold text-blue-900 mb-8 text-center">Chương trình thu cũ ắc quy</h1>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
                    {/* Bên trái: Form điền thông tin */}
                    <div className="order-2 lg:order-1">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <Card className="border-0 shadow-lg bg-white rounded-xl overflow-hidden">
                                <CardHeader className="bg-blue-900 text-white py-4">
                                    <CardTitle className="text-lg font-semibold">Thông tin liên hệ</CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 space-y-4">
                                    <div>
                                        <Label htmlFor="name" className="text-gray-700 font-medium">Họ tên *</Label>
                                        <Input
                                            id="name"
                                            name="name"
                                            value={form.name}
                                            onChange={handleChange}
                                            placeholder="Nguyễn Văn A"
                                            required
                                            className="mt-1 h-10 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="phone" className="text-gray-700 font-medium">Số điện thoại *</Label>
                                        <Input
                                            id="phone"
                                            name="phone"
                                            type="tel"
                                            value={form.phone}
                                            onChange={handleChange}
                                            placeholder="0901234567"
                                            required
                                            className="mt-1 h-10 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="email" className="text-gray-700 font-medium">Email *</Label>
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            value={form.email}
                                            onChange={handleChange}
                                            placeholder="email@example.com"
                                            required
                                            className="mt-1 h-10 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="address" className="text-gray-700 font-medium">Địa chỉ</Label>
                                        <Input
                                            id="address"
                                            name="address"
                                            value={form.address}
                                            onChange={handleChange}
                                            placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
                                            className="mt-1 h-10 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="note" className="text-gray-700 font-medium">Ghi chú</Label>
                                        <Input
                                            id="note"
                                            name="note"
                                            value={form.note}
                                            onChange={handleChange}
                                            placeholder="Thông tin bổ sung..."
                                            className="mt-1 h-10 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-0 shadow-lg bg-white rounded-xl overflow-hidden">
                                <CardHeader className="bg-blue-900 text-white py-4">
                                    <CardTitle className="text-lg font-semibold">Thông tin ắc quy cần thu</CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 space-y-4">
                                    <div>
                                        <Label className="text-gray-700 font-medium">Loại ắc quy *</Label>
                                        <select
                                            name="productId"
                                            value={form.productId}
                                            onChange={handleChange}
                                            className={selectClassName}
                                            required
                                        >
                                            <option value="">-- Chọn ắc quy --</option>
                                            {loadingProducts ? (
                                                <option disabled>Đang tải...</option>
                                            ) : (
                                                products.map((p) => (
                                                    <option key={p._id} value={p._id}>
                                                        {p.name} {p.capacity ? `(${p.capacity})` : ''}
                                                    </option>
                                                ))
                                            )}
                                            <option value="other">Khác (nhập tên bên dưới)</option>
                                        </select>
                                    </div>

                                    {isOtherBattery && (
                                        <div>
                                            <Label htmlFor="batteryName" className="text-gray-700 font-medium">Tên ắc quy *</Label>
                                            <Input
                                                id="batteryName"
                                                name="batteryName"
                                                value={form.batteryName}
                                                onChange={handleChange}
                                                placeholder="VD: Ắc quy ABC 60Ah"
                                                className="mt-1 h-10 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <Label className="text-gray-700 font-medium">Ảnh thực tế sản phẩm</Label>
                                        <p className="text-xs text-gray-500 mt-0.5">Tối đa 5 ảnh (JPEG, PNG, WebP, GIF - 3MB/ảnh)</p>
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
                                        <Label htmlFor="quantity" className="text-gray-700 font-medium">Số lượng acquy thu cũ</Label>
                                        <Input
                                            id="quantity"
                                            name="quantity"
                                            type="number"
                                            min={1}
                                            value={form.quantity}
                                            onChange={handleChange}
                                            className="mt-1 h-10 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 w-24"
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="manufacturingDate" className="text-gray-700 font-medium">Ngày tháng sản xuất</Label>
                                        <Input
                                            id="manufacturingDate"
                                            name="manufacturingDate"
                                            type="date"
                                            value={form.manufacturingDate}
                                            onChange={handleChange}
                                            className="mt-1 h-10 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="expiryDate" className="text-gray-700 font-medium">Hạn sử dụng</Label>
                                        <Input
                                            id="expiryDate"
                                            name="expiryDate"
                                            type="date"
                                            value={form.expiryDate}
                                            onChange={handleChange}
                                            className="mt-1 h-10 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="condition" className="text-gray-700 font-medium">Tình trạng</Label>
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
                                        <Label htmlFor="usageDuration" className="text-gray-700 font-medium">Đã sử dụng bao lâu</Label>
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
                                            <Label htmlFor="remainingAmps" className="text-gray-700 font-medium">Còn bao nhiêu Ampe (Ah) *</Label>
                                            <Input
                                                id="remainingAmps"
                                                name="remainingAmps"
                                                value={form.remainingAmps}
                                                onChange={handleChange}
                                                placeholder="VD: 45, 60..."
                                                className="mt-1 h-10 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                            />
                                        </div>
                                    ) : (
                                        <div>
                                            <Label htmlFor="weightKg" className="text-gray-700 font-medium">Cân nặng acquy (kg) *</Label>
                                            <Input
                                                id="weightKg"
                                                name="weightKg"
                                                value={form.weightKg}
                                                onChange={handleChange}
                                                placeholder="VD: 12, 15..."
                                                className="mt-1 h-10 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                            />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Nút gửi + checkbox đồng ý */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-white rounded-xl shadow-lg border border-gray-100">
                                <div className="flex items-center gap-3 flex-1">
                                    <Checkbox
                                        id="policy"
                                        checked={agreedToPolicy}
                                        onCheckedChange={(checked) => setAgreedToPolicy(!!checked)}
                                        className="border-gray-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                    />
                                    <label htmlFor="policy" className="text-sm text-gray-700 cursor-pointer">Tôi đồng ý với chính sách của cửa hàng</label>
                                </div>
                                <Button
                                    type="submit"
                                    disabled={submitting}
                                    className="bg-blue-600 hover:bg-blue-700 px-8 py-6 text-base font-semibold rounded-lg shadow-md hover:shadow-lg transition"
                                >
                                    {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
                                </Button>
                            </div>
                        </form>
                    </div>

                    {/* Bên phải: Chính sách hiện full */}
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

            {/* Popup thông báo gửi yêu cầu thành công */}
            <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="flex flex-col items-center gap-4 text-center">
                            <div className="p-3 bg-green-100 rounded-full">
                                <CheckCircle className="w-12 h-12 text-green-600" />
                            </div>
                            <DialogTitle className="text-xl">Đã gửi yêu cầu thành công</DialogTitle>
                        </div>
                    </DialogHeader>
                    <div className="space-y-4 text-gray-600">
                        <p>Chuyên viên cửa hàng sẽ liên hệ để xác nhận và xử lý.</p>
                        <p>Mọi thắc mắc hay yêu cầu xin gọi về <a href="tel:0386806456" className="font-semibold text-blue-600 hover:underline">0386806456</a> để được hỗ trợ sớm nhất.</p>
                    </div>
                    <div className="flex justify-center pt-2">
                        <Button onClick={() => setShowSuccessDialog(false)} className="bg-blue-600 hover:bg-blue-700">Đóng</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
