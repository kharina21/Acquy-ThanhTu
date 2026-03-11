import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUserRole } from '@/hooks/useUserRole';
import { useCartStore } from '@/stores/useCartStore';
import { toast } from 'sonner';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { useNavigate, Link, useSearchParams } from "react-router";
import ProductFilter from '@/components/ProductFilter';

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
            const res = await axios.get("http://localhost:5000/api/products/filter-options");

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

            const res = await axios.get(
                `http://localhost:5000/api/products/filter?${params.toString()}`
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

        if (!hasAnyRole('user', 'Người dùng thường')) {
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
        <div className="min-h-screen bg-gray-100">

            <Header
                user={user}
                onLogout={handleLogout}
            />

            <div className="container mx-auto px-4 py-8 flex gap-8 items-start">

                {/* FILTER */}
                <ProductFilter
                    categories={categories}
                    brands={brands}
                    usageDevices={usageDevices}
                    onFilter={handleFilter}
                    searchParams={searchParams}
                />

                {/* PRODUCT LIST */}
                <div className="flex-1">

                    {/* TITLE */}
                    <div className="flex items-center justify-between mb-4">

                        <h2 className="text-2xl font-bold">
                            Sản phẩm
                        </h2>

                        <span className="text-sm text-gray-500">
                            Hiển thị {products.length} / {totalProducts} sản phẩm
                        </span>

                    </div>

                    {/* SEARCH RESULT */}
                    {search && (
                        <p className="text-sm text-gray-500 mb-4">
                            Kết quả tìm kiếm cho: <b>{search}</b>
                        </p>
                    )}

                    {/* GRID */}
                    {products.length === 0 ? (

                        <div className="text-center text-gray-500 py-20 text-lg">
                            Không có sản phẩm nào
                        </div>

                    ) : (

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

                            {products.map((p) => (

                                <div
                                    key={p._id}
                                    className="bg-white rounded-xl shadow-sm hover:shadow-lg transition p-4 text-center flex flex-col"
                                >

                                    <Link
                                        to={`/product/${p._id}`}
                                        className="block flex-1"
                                    >

                                        <img
                                            src={p.images?.[0]}
                                            alt={p.name}
                                            className="h-44 mx-auto object-contain mb-4 transition-transform hover:scale-105"
                                        />

                                        <h3 className="text-sm font-medium mb-2 hover:text-red-600 line-clamp-2">
                                            {p.name}
                                        </h3>

                                        <p className="text-red-600 font-bold">
                                            {p.price?.toLocaleString()} đ
                                        </p>

                                    </Link>

                                    <div className="mt-3 flex gap-2">

                                        <Button
                                            size="sm"
                                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                                            onClick={() => handleAddToCart(p, true)}
                                        >
                                            Mua ngay
                                        </Button>

                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() => handleAddToCart(p)}
                                        >
                                            <ShoppingCart className="w-4 h-4 mr-1 shrink-0" />
                                            Thêm
                                        </Button>

                                    </div>

                                </div>

                            ))}

                        </div>
                    )}

                    {/* PAGINATION */}
                    <div className="flex justify-center items-center mt-10 gap-2 flex-wrap">

                        <button
                            disabled={page === 1}
                            onClick={() => setPage(page - 1)}
                            className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-100 disabled:opacity-50"
                        >
                            ← Trước
                        </button>

                        {getPageNumbers().map((p, index) => (

                            <button
                                key={index}
                                disabled={p === "..."}
                                onClick={() => typeof p === "number" && setPage(p)}
                                className={`
                                px-4 py-2 rounded-lg border
                                ${page === p
                                        ? "bg-red-600 text-white border-red-600"
                                        : "bg-white hover:bg-gray-100"}
                                ${p === "..." ? "border-none bg-transparent" : ""}
                            `}
                            >
                                {p}
                            </button>

                        ))}

                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage(page + 1)}
                            className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-100 disabled:opacity-50"
                        >
                            Sau →
                        </button>

                    </div>

                </div>

            </div>

            <Footer />

        </div>
    );
};

export default ListProduct;