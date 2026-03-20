import React from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUserRole } from '@/hooks/useUserRole';
import { Toaster, toast } from 'sonner'; // Thêm toast vào đây

import { Header } from '@/components/Header';
import { HeroSlider } from '@/components/HeroSlider';
import { ServiceFeatures } from '@/components/ServiceFeatures';
import { ProductSection } from '@/components/ProductSection';
import { BatteryTradeInBanner } from '@/components/BatteryTradeInBanner';
import { PartnersSection } from '@/components/PartnersSection';
import { Footer } from '@/components/Footer';

const HomePage = () => {
    const { user, logout } = useAuthStore();
    const { userRoles } = useUserRole();

    // Định nghĩa các hàm xử lý để Header không bị lỗi "undefined"
    const handleLogin = (email, password) => {
        toast.success(`Đang đăng nhập với: ${email} !`);
    };

    const handleRegister = (name, email, password) => {
        toast.success(`Đăng ký cho: ${name} !`);
    };

    const handleLogout = async () => {
        try {
            await logout(); // Gọi hàm logout của Zustand để xóa token/user
            toast.success('Đã đăng xuất thành công ! ');
        } catch (error) {
            toast.error('Lỗi khi đăng xuất !');
            console.error(error);
        }
    };

    return (
        <div className="min-h-screen bg-white">
            
            <Header
                user={user}
                onLogin={handleLogin}
                onRegister={handleRegister}
                onLogout={handleLogout}
            />
            
            <HeroSlider />
            <ServiceFeatures />
            <ProductSection />
            <BatteryTradeInBanner />
            <PartnersSection />
            <Footer />
        </div>
    );
};

export default HomePage;