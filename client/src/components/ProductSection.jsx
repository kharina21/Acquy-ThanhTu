import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router';
import axios from 'axios';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay } from 'swiper/modules';
import { ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/stores/useCartStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUserRole } from '@/hooks/useUserRole';

import 'swiper/css';
import 'swiper/css/navigation';

export function ProductSection() {
    const [carProducts, setCarProducts] = useState([]);
    const [motorProducts, setMotorProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const accessToken = useAuthStore((s) => s.accessToken);
    const { hasAnyRole } = useUserRole();
    const addToCartServer = useCartStore((s) => s.addToCartServer);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const [carRes, motorRes] = await Promise.all([
                axios.get('http://localhost:5000/api/products/car-batteries'),
                axios.get('http://localhost:5000/api/products/motorcycle-batteries'),
            ]);

            if (carRes.data.success) {
                setCarProducts(carRes.data.data.products.slice(0, 5));
            }

            if (motorRes.data.success) {
                setMotorProducts(motorRes.data.data.products.slice(0, 5));
            }
        } catch (error) {
            console.error('Lỗi lấy sản phẩm:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddToCart = async (product, goToCart = false) => {
        // Bắt buộc đăng nhập
        if (!accessToken) {
            toast.info('Vui lòng đăng nhập để mua hàng.');
            navigate('/login');
            return;
        }

        // Chỉ cho role 'user' hoặc 'Người dùng thường' được mua hàng
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
            const msg = err?.response?.data?.message || err?.message || 'Lỗi khi thêm vào giỏ hàng';
            toast.error(msg);
        }
    };

<<<<<<< HEAD
  const renderSection = (title, products, sectionKey) => (
    <div className="mb-16 relative bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between mb-8 border-b pb-4">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 uppercase tracking-wide relative">
          {title}
          <div className="absolute -bottom-[17px] left-0 w-1/3 h-1 bg-primary rounded-t-md"></div>
        </h2>
        <Link
          to="/listproduct"
          className="mt-4 sm:mt-0 text-primary font-medium hover:text-primary-focus transition-colors flex items-center gap-1 group"
        >
          Xem tất cả 
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Navigation Buttons */}
      <button
        className={`prev-${sectionKey} hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10 bg-white border border-gray-200 text-gray-600 hover:text-primary hover:border-primary shadow-md p-2 rounded-full transition-all`}
      >
        <ChevronLeft size={24} />
      </button>

      <button
        className={`next-${sectionKey} hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 bg-white border border-gray-200 text-gray-600 hover:text-primary hover:border-primary shadow-md p-2 rounded-full transition-all`}
      >
        <ChevronRight size={24} />
      </button>

      {/* Swiper */}
      <Swiper
        modules={[Navigation, Autoplay]}
        loop={true}
        slidesPerView={4}
        spaceBetween={20}
        autoplay={{
          delay: 3000,
          disableOnInteraction: false,
          pauseOnMouseEnter: true
        }}
        navigation={{
          nextEl: `.next-${sectionKey}`,
          prevEl: `.prev-${sectionKey}`,
        }}
        breakpoints={{
          0: { slidesPerView: 1 },
          640: { slidesPerView: 2 },
          1024: { slidesPerView: 4 },
        }}
      >
        {products.map((product) => (
          <SwiperSlide key={product._id} className="pb-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-4 flex flex-col h-full group">
              <Link to={`/product/${product._id}`} className="block flex-1 relative overflow-hidden rounded-lg">
                <div className="aspect-square bg-gray-50 flex items-center justify-center">
                  {(product.images?.[0] || product.image) ? (
                    <img
                      src={product.images?.[0] || product.image}
                      alt={product.name}
                      className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="text-gray-400 text-sm">
                      Không có ảnh
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <h3 className="text-sm md:text-base font-semibold text-gray-700 group-hover:text-primary transition-colors line-clamp-2 min-h-[44px]">
                    {product.name}
                  </h3>
                  
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-red-500 font-bold text-lg md:text-xl">
                      {product.price?.toLocaleString()}đ
                    </span>
                  </div>
                </div>
              </Link>

              {/* Nút Mua ngay + Thêm vào giỏ hàng */}
              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  variant="default"
                  className="flex-1 bg-primary hover:bg-primary-focus text-white font-medium cursor-pointer"
                  onClick={() => handleAddToCart(product, true)}
                >
                  Mua ngay
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-primary text-primary hover:bg-primary hover:text-white group/btn cursor-pointer"
                  onClick={() => handleAddToCart(product, false)}
                  title="Thêm vào giỏ hàng"
                >
                  <ShoppingCart className="w-5 h-5 shrink-0" />
                </Button>
              </div>
=======
    const renderSection = (title, products, sectionKey) => (
        <div className='mb-12 relative'>
            {/* Header */}
            <div className='flex items-center justify-between mb-6'>
                <h2 className='text-2xl font-bold'>{title}</h2>
                <Link
                    to='/listproduct'
                    className='text-red-500 border border-red-500 px-4 py-1 rounded hover:bg-red-500 hover:text-white transition'
                >
                    Xem tất cả →
                </Link>
>>>>>>> 3daf6586a34f366381a4e0860f1e8bd928d9245c
            </div>

<<<<<<< HEAD
  return (
    <div className="py-16 bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Section Main Title */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 inline-block relative">
            Sản Phẩm <span className="text-primary">Nổi Bật</span>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 bg-primary rounded-full"></div>
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto mt-4">
            Khám phá các dòng ắc quy chính hãng, chất lượng cao dành cho ô tô và xe máy với giá ưu đãi tốt nhất.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <span className="loading loading-spinner text-primary loading-lg"></span>
          </div>
        ) : (
          <div className="space-y-6">
            {renderSection("🚗 ẮC QUY Ô TÔ", carProducts, "car")}
            {renderSection("🏍 ẮC QUY XE MÁY", motorProducts, "motor")}
          </div>
        )}
      </div>
    </div>
  );
=======
            {/* Navigation Buttons */}
            <button className={`prev-${sectionKey} absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow p-2 rounded-full`}>
                <ChevronLeft size={20} />
            </button>

            <button className={`next-${sectionKey} absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow p-2 rounded-full`}>
                <ChevronRight size={20} />
            </button>

            {/* Swiper */}
            <Swiper
                modules={[Navigation, Autoplay]}
                loop={true}
                slidesPerView={4}
                spaceBetween={20}
                autoplay={{
                    delay: 3000,
                    disableOnInteraction: false,
                    pauseOnMouseEnter: true,
                }}
                navigation={{
                    nextEl: `.next-${sectionKey}`,
                    prevEl: `.prev-${sectionKey}`,
                }}
                breakpoints={{
                    0: { slidesPerView: 1 },
                    640: { slidesPerView: 2 },
                    1024: { slidesPerView: 4 },
                }}
            >
                {products.map((product) => (
                    <SwiperSlide key={product._id}>
                        <div className='bg-white rounded-lg shadow-sm hover:shadow-md transition p-4 flex flex-col'>
                            <Link
                                to={`/product/${product._id}`}
                                className='block'
                            >
                                <div className='aspect-square bg-gray-100 rounded mb-3 overflow-hidden flex items-center justify-center'>
                                    {product.images?.[0] || product.image ? (
                                        <img
                                            src={product.images?.[0] || product.image}
                                            alt={product.name}
                                            className='w-full h-full object-contain'
                                        />
                                    ) : (
                                        <div className='text-gray-400 text-sm'>Không có ảnh</div>
                                    )}
                                </div>

                                <h3 className='text-sm font-medium text-gray-800 line-clamp-2 min-h-[40px]'>{product.name}</h3>

                                <div className='mt-2'>
                                    <span className='text-red-600 font-bold text-lg'>{product.price?.toLocaleString()}đ</span>
                                </div>
                            </Link>

                            {/* Nút Mua ngay + Thêm vào giỏ hàng */}
                            <div className='mt-3 flex gap-2'>
                                <Button
                                    size='sm'
                                    className='flex-1 btn btn-primary btn-md'
                                    onClick={() => handleAddToCart(product, true)}
                                >
                                    Mua ngay
                                </Button>
                                <Button
                                    size='sm'
                                    variant='outline'
                                    className='flex-1'
                                    onClick={() => handleAddToCart(product, false)}
                                >
                                    <ShoppingCart className='w-4 h-4 mr-1 shrink-0' />
                                    Thêm vào giỏ hàng
                                </Button>
                            </div>
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>
        </div>
    );

    return (
        <div className='py-10 bg-gray-100'>
            <div className='container mx-auto px-4'>
                {loading ? (
                    <p>Đang tải sản phẩm...</p>
                ) : (
                    <>
                        {renderSection('🚗 ẮC QUY Ô TÔ', carProducts, 'car')}
                        {renderSection('🏍 ẮC QUY XE MÁY', motorProducts, 'motor')}
                    </>
                )}
            </div>
        </div>
    );
>>>>>>> 3daf6586a34f366381a4e0860f1e8bd928d9245c
}
