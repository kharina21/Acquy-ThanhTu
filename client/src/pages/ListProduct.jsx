import React, { useEffect, useState } from 'react';
import api from '@/lib/axios';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUserRole } from '@/hooks/useUserRole';
import { useCartStore } from '@/stores/useCartStore';
import { toast } from 'sonner';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { SoldOutOverlay } from '@/components/product/SoldOutOverlay';
import { ShoppingCart } from 'lucide-react';
import { useNavigate, Link, useSearchParams } from "react-router";
import ProductFilter from '@/components/ProductFilter';
import { SurfaceCard } from '@/components/ui/surface-card';

const ListProduct = () => {

    const { user, logout } = useAuthStore();
    const { hasAnyRole } = useUserRole();
    const navigate = useNavigate();

    const [searchParams] = useSearchParams();
    const search = searchParams.get("search") || "";

    const accessToken = useAuthStore((s) => s.accessToken);
    const addToCartServer = useCartStore((s) => s.addToCartServer);

    const [products, setProducts] = useState([]);
    const pageParam = parseInt(searchParams.get("page")) || 1;
    const [page, setPage] = useState(pageParam);
    const [totalPages, setTotalPages] = useState(1);
    const [totalProducts, setTotalProducts] = useState(0);

    const limit = 15;

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
        fetchProducts();
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }, [page, searchParams]);

    useEffect(() => {
        const pageParam = parseInt(searchParams.get("page")) || 1;
        setPage(pageParam);
    }, [searchParams]);

    const fetchProducts = async () => {
        try {

            const params = new URLSearchParams(searchParams);
            params.set("page", page);
            params.set("limit", limit);

            const res = await api.get(
                `/products/filter?${params.toString()}`
            );

            setProducts(res.data.data.products);
            setTotalPages(res.data.data.totalPages);
            setTotalProducts(res.data.data.totalProducts);

        } catch (error) {
            toast.error("Lỗi khi tải sản phẩm");
            console.error(error);
        }
    };

    const handleFilter = (filters) => {

        const params = new URLSearchParams();

        Object.entries(filters).forEach(([key, value]) => {
            if (value && value !== "") {
                params.set(key, value);
            }
        });

        params.set("page", 1); // Reset về trang 1 khi thay đổi bộ lọc
        navigate(`/listproduct?${params.toString()}`);
    };

    const handleSort = (sortValue) => {

        const params = new URLSearchParams(searchParams);

        if (sortValue) {
            params.set("sort", sortValue);
        } else {
            params.delete("sort");
        }

        params.set("page", 1);

        navigate(`/listproduct?${params.toString()}`);
    };

    const getPageNumbers = () => {

        const pages = [];

        if (totalPages <= 7) {

            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }

        } else {

            pages.push(1);

            if (page > 3) pages.push("...");

            const start = Math.max(2, page - 1);
            const end = Math.min(totalPages - 1, page + 1);

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (page < totalPages - 2) pages.push("...");

            pages.push(totalPages);
        }

        return pages;
    };

    const handleLogout = async () => {
        try {
            await logout();
            toast.success('Đã đăng xuất thành công!');
        } catch (error) {
            toast.error('Lỗi khi đăng xuất!');
        }
    };

    const handleAddToCart = async (product, goToCart = false) => {

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

            await addToCartServer(product._id, 1);

            toast.success('Đã thêm vào giỏ hàng');

            if (goToCart) {
                navigate('/cart');
            }

        } catch (err) {

            const msg =
                err?.response?.data?.message ||
                err?.message ||
                'Lỗi khi thêm vào giỏ hàng';

            toast.error(msg);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-base-200/40 to-base-200/70 flex flex-col">
            <Header user={user} onLogout={handleLogout} />

            <div className="flex-1 w-full max-w-[1600px] mx-auto px-6 py-8">
                <div className="flex flex-col lg:flex-row gap-8 items-start">
                    {/* FILTER - Sticky khi lăn chuột, dính dưới header */}
                    <aside className="lg:w-72 shrink-0">
                        <div className="lg:sticky lg:top-28 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
                            <ProductFilter
                                categories={categories}
                                brands={brands}
                                usageDevices={usageDevices}
                                onFilter={handleFilter}
                                searchParams={searchParams}
                            />
                        </div>
                    </aside>

                    {/* PRODUCT LIST */}
                    <div className="flex-1 min-w-0">
                        <SurfaceCard className="p-6">
                            {/* Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-base-200">
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-bold text-base-content relative inline-block">
                                        Sản phẩm
                                        <span className="absolute -bottom-1 left-0 w-12 h-0.5 bg-primary rounded-full" />
                                    </h1>
                                    {search && (
                                        <p className="text-sm text-base-content/60 mt-2">
                                            Kết quả tìm kiếm:{' '}
                                            <span className="font-medium text-base-content">{search}</span>
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <span className="text-sm text-base-content/55">
                                        {products.length} / {totalProducts} sản phẩm
                                    </span>
                                    <select
                                        value={searchParams.get("sort") || ""}
                                        onChange={(e) => handleSort(e.target.value)}
                                        className="select select-bordered select-sm w-44"
                                    >
                                        <option value="">Mặc định</option>
                                        <option value="price_asc">Giá thấp → cao</option>
                                        <option value="price_desc">Giá cao → thấp</option>
                                        <option value="ah_asc">Ah nhỏ → lớn</option>
                                        <option value="ah_desc">Ah lớn → nhỏ</option>
                                    </select>
                                </div>
                            </div>

                            {/* Grid */}
                            {products.length === 0 ? (
                                <div className="text-center py-16 rounded-xl bg-base-200/40 border border-base-200/80">
                                    <p className="text-base-content/70 text-lg">Không có sản phẩm nào</p>
                                    <p className="text-sm text-base-content/50 mt-1">
                                        Thử điều chỉnh bộ lọc để xem thêm kết quả
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                                    {products.map((p) => {
                                        const isSoldOut = (p.totalStock ?? 0) <= 0;
                                        return (
                                            <div
                                                key={p._id}
                                                className={`relative bg-base-100 rounded-xl border border-base-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-4 flex flex-col h-full group ${isSoldOut ? 'opacity-75' : ''}`}
                                            >
                                                {isSoldOut && <SoldOutOverlay className="rounded-xl" />}
                                                <Link
                                                    to={`/product/${p._id}`}
                                                    className="flex-1 flex flex-col"
                                                >
                                                    <div className="aspect-square bg-base-200/50 rounded-lg flex items-center justify-center overflow-hidden mb-4 border border-base-200/60">
                                                        {(p.images?.[0] || p.image) ? (
                                                            <img
                                                                src={p.images?.[0] || p.image}
                                                                alt={p.name}
                                                                className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                                                            />
                                                        ) : (
                                                            <span className="text-base-content/45 text-sm">Không có ảnh</span>
                                                        )}
                                                    </div>
                                                    <h3 className="text-sm font-semibold text-base-content line-clamp-2 min-h-[40px] group-hover:text-primary transition-colors">
                                                        {p.name}
                                                    </h3>
                                                    <p className="mt-2 text-primary font-bold text-lg">
                                                        {p.price?.toLocaleString()}đ
                                                    </p>
                                                </Link>
                                                <div className='mt-4 flex gap-2'>
                                                    {isSoldOut ? (
                                                        <Button
                                                            size="sm"
                                                            className="flex-1"
                                                            onClick={() => navigate('/contact')}
                                                        >
                                                            Liên hệ
                                                        </Button>
                                                    ) : (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                className="flex-1"
                                                                onClick={() => handleAddToCart(p, true)}
                                                                disabled={isSoldOut}
                                                            >
                                                                Mua ngay
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="flex-1"
                                                                onClick={() => handleAddToCart(p)}
                                                                disabled={isSoldOut}
                                                            >
                                                                <ShoppingCart className="w-4 h-4 mr-1 shrink-0" />
                                                                Thêm
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex justify-center items-center mt-8 pt-6 border-t border-base-200 gap-2 flex-wrap">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={page === 1}
                                        onClick={() => setPage(page - 1)}
                                    >
                                        ← Trước
                                    </Button>
                                    {getPageNumbers().map((p, index) =>
                                        p === "..." ? (
                                            <span key={index} className="px-3 py-1.5 text-sm text-base-content/50">...</span>
                                        ) : (
                                            <Button
                                                key={index}
                                                variant={page === p ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setPage(p)}
                                            >
                                                {p}
                                            </Button>
                                        )
                                    )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={page === totalPages}
                                        onClick={() => setPage(page + 1)}
                                    >
                                        Sau →
                                    </Button>
                                </div>
                            )}
                        </SurfaceCard>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
};

export default ListProduct;