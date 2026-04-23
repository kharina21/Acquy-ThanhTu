import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { ShoppingCart, Check, RefreshCcw, ShieldCheck } from 'lucide-react';
import { useCartStore } from '@/stores/useCartStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUserRole } from '@/hooks/useUserRole';

import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import ProductFilter from '@/components/ProductFilter';
import { labelBatteryType, formatDimensionsMm, formatWeightKg, formatVoltageV } from '@/utils/productDetailDisplay';

const ProductDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const { user, logout } = useAuthStore();
    const accessToken = useAuthStore((s) => s.accessToken);
    const { hasAnyRole } = useUserRole();
    const addToCartServer = useCartStore((s) => s.addToCartServer);

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [mainImage, setMainImage] = useState('');
    const [relatedProducts, setRelatedProducts] = useState([]);

    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [usageDevices, setUsageDevices] = useState([]);

    const fetchFilterOptions = async () => {
        try {
            const res = await api.get("/products/filter-options");
            setCategories(res.data.data.categories);
            setBrands(res.data.data.brands);
            setUsageDevices(res.data.data.usageDevices);
        } catch (error) {
            console.error("Lỗi khi tải bộ lọc", error);
        }
    };

    useEffect(() => {
        fetchFilterOptions();
    }, []);

    useEffect(() => {
        fetchProductDetails();
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }, [id]);

    const fetchProductDetails = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/products/${id}`);
            const relatedRes = await api.get(`/products/${id}/related?limit=4`);

            const data = res.data?.data?.product || res.data?.product || res.data;
            setProduct(data);

            if (relatedRes.data?.success) {
                setRelatedProducts(relatedRes.data.data.products);
            }

            if (data.images && data.images.length > 0) {
                setMainImage(data.images[0]);
            } else if (data.image) {
                setMainImage(data.image);
            }
        } catch (error) {
            console.error('Lỗi khi tải chi tiết sản phẩm', error);
            toast.error('Không tìm thấy sản phẩm!');
            navigate('/listproduct');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            toast.success('Đã đăng xuất thành công!');
        } catch (error) {
            toast.error('Lỗi khi đăng xuất!');
        }
    };

    const handleAddToCart = async (goToCart = false) => {
        if (!accessToken) {
            toast.info('Vui lòng đăng nhập để mua hàng.');
            navigate('/login');
            return;
        }

        if (!hasAnyRole('user', 'customer')) {
            toast.error('Tài khoản hiện tại không có quyền mua hàng.');
            return;
        }

        try {
            await addToCartServer(product._id, quantity);
            toast.success('Đã thêm vào giỏ hàng');
            if (goToCart) {
                navigate('/cart');
            }
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || 'Lỗi khi thêm vào giỏ hàng';
            toast.error(msg);
        }
    };

    const handleFilter = (filters) => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value && value !== "") {
                params.set(key, value);
            }
        });
        navigate(`/listproduct?${params.toString()}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <Header user={user} onLogout={handleLogout} />
                <div className="flex-1 flex justify-center items-center">
                    <div className="text-xl text-gray-500">Đang tải sản phẩm...</div>
                </div>
                <Footer />
            </div>
        );
    }

    if (!product) {
        return null; // Will redirect via error handler
    }

    const formatPrice = (price) => {
        return price ? price.toLocaleString() + ' đ' : 'Liên hệ';
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header user={user} onLogout={handleLogout} />

            <div className="container mx-auto px-4 py-8 flex-1">
                {/* BREADCRUMB */}
                <div className="text-sm text-gray-500 mb-6 flex gap-2">
                    <span className="hover:text-red-500 cursor-pointer" onClick={() => navigate('/')}>Trang chủ</span>
                    <span>/</span>
                    <span className="hover:text-red-500 cursor-pointer" onClick={() => navigate('/listproduct')}>Sản phẩm</span>
                    <span>/</span>
                    <span className="text-gray-900 font-medium truncate max-w-xs sm:max-w-none">{product.name}</span>
                </div>

                <div className="flex gap-8 items-start">
                    {/* FILTER SIDEBAR */}
                    <div className="hidden lg:block w-64 flex-shrink-0">
                        <ProductFilter
                            categories={categories}
                            brands={brands}
                            usageDevices={usageDevices}
                            onFilter={handleFilter}
                            searchParams={new URLSearchParams()}
                        />
                    </div>

                    {/* MAIN CONTENT */}
                    <div className="flex-1 w-full min-w-0">
                        <div className="bg-white rounded-2xl shadow-sm p-6 lg:p-10 mb-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

                                {/* LEFT: IMAGES */}
                                <div className="flex flex-col gap-4">
                                    {/* Main Image */}
                                    <div className="relative aspect-square bg-white border rounded-xl flex items-center justify-center p-4 overflow-hidden">
                                        {mainImage ? (
                                            <img src={mainImage} alt={product.name} className={`w-full h-full object-contain ${(product.totalStock ?? 0) <= 0 ? 'opacity-60' : ''}`} />
                                        ) : (
                                            <div className="text-gray-400">Không có ảnh</div>
                                        )}
                                        {(product.totalStock ?? 0) <= 0 && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl">
                                                <img src="/assets/sold_out.png" alt="Hết hàng" className="max-w-[70%] max-h-[60%] object-contain drop-shadow-lg" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Thumbnails */}
                                    {(product.images?.length > 1) && (
                                        <div className="flex gap-4 overflow-x-auto pb-2">
                                            {product.images.map((img, idx) => (
                                                <button
                                                    key={idx}
                                                    className={`flex-shrink-0 w-20 h-20 border rounded-lg p-1 overflow-hidden transition-all ${mainImage === img ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200 hover:border-gray-300'}`}
                                                    onClick={() => setMainImage(img)}
                                                >
                                                    <img src={img} alt={`Thumbnail ${idx}`} className="w-full h-full object-contain" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* RIGHT: PRODUCT INFO */}
                                <div className="flex flex-col">
                                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4 leading-tight">
                                        {product.name}
                                    </h1>

                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="text-3xl font-bold text-red-600">
                                            {formatPrice(product.price)}
                                        </div>
                                        {product.oldPrice && (
                                            <div className="text-lg text-gray-400 line-through">
                                                {formatPrice(product.oldPrice)}
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-gray-50 rounded-xl p-5 mb-8 space-y-4 border border-gray-100">
                                        <h3 className="font-semibold text-gray-900 text-lg border-b pb-2">Thông số kỹ thuật</h3>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
                                            <div className="flex flex-col">
                                                <span className="text-gray-500">Mã sản phẩm</span>
                                                <span className="font-medium text-gray-900">{product.sku || 'N/A'}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-gray-500">Dung lượng (Ah)</span>
                                                <span className="font-medium text-gray-900">{product.capacity || 'N/A'}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-gray-500">Thương hiệu</span>
                                                <span className="font-medium text-gray-900">{product.brandName || (typeof product.brand === 'object' ? product.brand?.name : product.brand) || 'N/A'}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-gray-500">Loại Bình</span>
                                                <span className="font-medium text-gray-900">{typeof product.category === 'object' ? product.category?.name : product.category || 'N/A'}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-gray-500">Thiết bị sử dụng</span>
                                                <span className="font-medium text-gray-900">{product.usageDeviceName || (typeof product.usageDevice === 'object' ? product.usageDevice?.name : product.usageDevice) || 'N/A'}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-gray-500">Bảo hành</span>
                                                <span className="font-medium text-gray-900">{product.warrantyText || 'N/A'}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-gray-500">Kiểu ắc quy</span>
                                                <span className="font-medium text-gray-900">{labelBatteryType(product.batteryType, 'N/A')}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-gray-500">Kích thước (Dài × Rộng × Cao)</span>
                                                <span className="font-medium text-gray-900">{formatDimensionsMm(product, 'N/A')}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-gray-500">Trọng lượng</span>
                                                <span className="font-medium text-gray-900">{formatWeightKg(product.weightKg, 'N/A')}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-gray-500">Điện áp</span>
                                                <span className="font-medium text-gray-900">{formatVoltageV(product.voltageV, 'N/A')}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-gray-500">Xuất xứ</span>
                                                <span className="font-medium text-gray-900">
                                                    {product.originCountry?.trim() || 'N/A'}
                                                </span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-gray-500">Dung tích nhớt</span>
                                                <span className="font-medium text-gray-900">
                                                    {product.oilCapacityText?.trim() || 'N/A'}
                                                </span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-gray-500">Đời xe</span>
                                                <span className="font-medium text-gray-900">
                                                    {product.vehicleModelText?.trim() || 'N/A'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* QUANTITY & ACTIONS */}
                                    {(() => {
                                        const isSoldOut = (product.totalStock ?? 0) <= 0;
                                        return (
                                            <div className={`mb-8 ${isSoldOut ? 'opacity-75 pointer-events-none' : ''}`}>
                                                <div className="flex items-center gap-4 mb-6">
                                                    <span className="text-gray-700 font-medium">Số lượng:</span>
                                                    <div className="flex items-stretch rounded-lg border border-base-300 overflow-hidden bg-base-100">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            className="h-10 w-10 min-w-10 p-0 rounded-none border-0 border-r border-base-300 hover:bg-base-200"
                                                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                                            disabled={quantity <= 1 || isSoldOut}
                                                        >
                                                            −
                                                        </Button>
                                                        <input
                                                            type="number"
                                                            className="w-14 h-10 text-center text-base font-medium border-0 border-x border-base-300 bg-base-200 focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                            value={quantity}
                                                            onChange={(e) => {
                                                                const val = parseInt(e.target.value);
                                                                if (!isNaN(val) && val >= 1) setQuantity(val);
                                                            }}
                                                            min="1"
                                                            readOnly={isSoldOut}
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            className="h-10 w-10 min-w-10 p-0 rounded-none border-0 border-l border-base-300 hover:bg-base-200"
                                                            onClick={() => setQuantity(quantity + 1)}
                                                            disabled={isSoldOut}
                                                        >
                                                            +
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col sm:flex-row gap-4">
                                                    <Button size="lg" className="flex-1" onClick={() => handleAddToCart(true)} disabled={isSoldOut}>
                                                        MUA NGAY
                                                    </Button>

                                                    <Button variant="outline" size="lg" className="flex-1" onClick={() => handleAddToCart(false)} disabled={isSoldOut}>
                                                        <ShoppingCart className="w-5 h-5 mr-2" />
                                                        THÊM VÀO GIỎ
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* DESCRIPTION TAB */}
                        {product.description && (
                            <div className="bg-white rounded-2xl shadow-sm p-6 lg:p-10 mt-8">
                                <h2 className="text-xl font-bold text-gray-900 mb-6 pb-2 border-b inline-block">Mô tả sản phẩm</h2>
                                <div
                                    className="prose max-w-none text-gray-700"
                                    dangerouslySetInnerHTML={{ __html: product.description.replace(/\n/g, '<br/>') }}
                                />
                            </div>
                        )}
                    </div>

                    {/* RIGHT: SERVICE INFO */}
                    <div className="hidden xl:flex flex-col gap-4 border border-gray-100 rounded-xl p-5 bg-white shadow-sm w-[280px] flex-shrink-0 h-fit">

                        <div className="flex items-start gap-3 border-b border-gray-200 pb-4">
                            <div className="mt-1">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-500">
                                    <path d="M1 13H5.5L8.5 7H14.5L16 10H19L23 15V19H17C16.5 17.3 15 16 13.5 16C12 16 10.5 17.3 10 19H7.5C7 17.3 5.5 16 4 16C2.5 16 1 17.3 0 19V13H1Z" fill="currentColor" />
                                    <circle cx="4" cy="19" r="2" fill="currentColor" />
                                    <circle cx="13.5" cy="19" r="2" fill="currentColor" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-gray-700 font-medium">Giao hàng Và lắp đặt trong</p>
                                <p className="text-gray-700 font-medium">vòng 24H</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 border-b border-gray-200 py-3">
                            <div className="mt-1">
                                <ShieldCheck className="w-8 h-8 text-gray-500" />
                            </div>
                            <div>
                                <p className="text-gray-700 font-medium">Cứu hộ xe hỏng Ắc quy</p>
                                <p className="text-gray-700 font-medium text-sm mt-1">Trong nội thành Hà Nội</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 border-b border-gray-200 py-3">
                            <div className="mt-1">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-500">
                                    <path d="M21 15C21 18.3 18.3 21 15 21H9C5.7 21 3 18.3 3 15C3 11.7 5.7 9 9 9H15C18.3 9 21 11.7 21 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M12 9V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M9 15H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M15 12V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M9 12V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-gray-700 font-medium">Hỗ trợ 24/7</p>
                                <p className="text-gray-700 font-medium">Hotline: 0988 567 837</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 pt-3">
                            <div className="mt-1">
                                <Check className="w-7 h-7 text-gray-500 bg-gray-200 rounded-full p-1" />
                            </div>
                            <div>
                                <p className="text-gray-700 font-medium">Sản phẩm chính hãng 100%</p>
                                <p className="text-gray-700 font-medium">Sửa chữa – Thu mua hàng</p>
                                <p className="text-gray-700 font-medium">cũ giá cao</p>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* RELATED PRODUCTS SECTION */}
            {relatedProducts && relatedProducts.length > 0 && (
                <div className="container mx-auto px-4 pb-12">
                    <div className="bg-white rounded-2xl shadow-sm p-6 lg:p-10 mb-8">
                        <div className="flex items-center justify-between mb-8 border-b pb-4">
                            <h2 className="text-2xl font-bold text-gray-900 border-l-4 border-red-600 pl-4">Sản phẩm tương tự</h2>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {relatedProducts.map((p) => {
                                const isSoldOut = (p.totalStock ?? 0) <= 0;
                                return (
                                    <div
                                        key={p._id}
                                        className={`relative bg-white rounded-xl border border-gray-100 hover:shadow-lg transition-all p-4 flex flex-col group ${isSoldOut ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'}`}
                                        onClick={() => !isSoldOut && navigate(`/product/${p._id}`)}
                                    >
                                        {isSoldOut && (
                                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 rounded-xl pointer-events-auto">
                                                <img
                                                    src="/assets/sold_out.png"
                                                    alt="Hết hàng"
                                                    className="max-w-[80%] max-h-[60%] object-contain drop-shadow-lg"
                                                />
                                            </div>
                                        )}
                                        <div className="aspect-square bg-gray-50 rounded-lg mb-4 overflow-hidden flex items-center justify-center p-2 relative">
                                            {(p.images?.[0] || p.image) ? (
                                                <img
                                                    src={p.images?.[0] || p.image}
                                                    alt={p.name}
                                                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                                                />
                                            ) : (
                                                <div className="text-gray-400 text-sm">Không có ảnh</div>
                                            )}

                                            {p.price > 0 && p.oldPrice > p.price && (
                                                <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                                                    -{Math.round((1 - p.price / p.oldPrice) * 100)}%
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 flex flex-col">
                                            <h3 className="text-sm font-medium text-gray-800 line-clamp-2 min-h-[40px] group-hover:text-red-600 transition-colors">
                                                {p.name}
                                            </h3>

                                            <div className="mt-auto pt-3">
                                                <div className="flex items-end gap-2">
                                                    <span className="text-red-600 font-bold text-lg">
                                                        {formatPrice(p.price)}
                                                    </span>
                                                    {p.oldPrice && (
                                                        <span className="text-xs text-gray-400 line-through mb-1">
                                                            {formatPrice(p.oldPrice)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
};

export default ProductDetailPage;
