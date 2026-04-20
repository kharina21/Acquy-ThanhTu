import { toast } from 'sonner';
import { Phone, Mail, MapPin, Clock3, MessageCircle, ShieldCheck, BadgeCheck, RefreshCcw } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useAuthStore } from '@/stores/useAuthStore';

const GOOGLE_MAP_EMBED =
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3723.8966453621434!2d105.7725833!3d21.0368144!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x313454b322307567%3A0x6a0a09c258674d81!2zMjc4IEjhu5MgVMO5bmcgTeG6rXUsIFBow7ogRGnhu4VuLCBC4bqvYyBU4burIExpw6ptLCBIw6AgTuG7mWksIFZpZXRuYW0!5e0!3m2!1svi!2s!4v1715000000000!5m2!1svi!2s';

export default function ContactPage() {
    const { user, logout } = useAuthStore();

    const handleLogout = async () => {
        try {
            await logout();
            toast.success('Đã đăng xuất thành công!');
        } catch (error) {
            toast.error('Lỗi khi đăng xuất!');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header user={user} onLogout={handleLogout} />

            <main className="flex-1">
                <section className="bg-white border-b border-gray-100">
                    <div className="container mx-auto px-4 lg:px-6 py-10 md:py-14">
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Liên hệ với chúng tôi</h1>
                        <p className="mt-3 text-gray-600 max-w-2xl">
                            Cần tư vấn ắc quy hoặc hỗ trợ đơn hàng? Gửi thông tin nhanh bên dưới, hoặc liên hệ trực tiếp qua hotline và kênh chat.
                        </p>
                    </div>
                </section>

                <section className="container mx-auto px-4 lg:px-6 py-8 md:py-10">
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        <article className="xl:col-span-1 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-5">
                            <h2 className="text-xl font-semibold text-gray-900">Thông tin liên hệ</h2>

                            <div className="space-y-4 text-gray-700">
                                <p className="flex items-start gap-3">
                                    <Phone className="w-5 h-5 text-primary mt-0.5" />
                                    <span>Hotline: 0386806456</span>
                                </p>
                                <p className="flex items-start gap-3">
                                    <Mail className="w-5 h-5 text-primary mt-0.5" />
                                    <span>Email: vuthanhtu070378@gmail.com</span>
                                </p>
                                <p className="flex items-start gap-3">
                                    <MapPin className="w-5 h-5 text-primary mt-0.5" />
                                    <span>278 Hồ Tùng Mậu, Bắc Từ Liêm, Hà Nội</span>
                                </p>
                                <p className="flex items-start gap-3">
                                    <Clock3 className="w-5 h-5 text-primary mt-0.5" />
                                    <span>Giờ làm việc: 08:00 - 21:00 (T2 - CN)</span>
                                </p>
                            </div>

                            <div className="pt-2 space-y-3">
                                <a
                                    href="tel:0386806456"
                                    className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-primary-content font-medium hover:opacity-90 transition-opacity"
                                >
                                    Gọi ngay
                                </a>
                                <a
                                    href="https://zalo.me/0386806456"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex w-full items-center justify-center rounded-xl border border-primary/30 text-primary px-4 py-2.5 font-medium hover:bg-primary/5 transition-colors"
                                >
                                    <MessageCircle className="w-4 h-4 mr-2" />
                                    Chat Zalo
                                </a>
                            </div>
                        </article>

                        <article className="xl:col-span-2 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                            <h2 className="text-xl font-semibold text-gray-900">Giới thiệu cửa hàng</h2>
                            <p className="mt-3 text-gray-700 leading-relaxed">
                                Ắc Quy Thanh Tú là đại lý chuyên cung cấp ắc quy chính hãng cho ô tô, xe máy và nhiều dòng xe chuyên dụng.
                                Chúng tôi tập trung vào chất lượng sản phẩm, tư vấn đúng nhu cầu sử dụng và hỗ trợ nhanh chóng trong suốt quá trình mua hàng.
                            </p>
                            <p className="mt-3 text-gray-700 leading-relaxed">
                                Khách hàng có thể liên hệ trực tiếp qua hotline hoặc Zalo để được tư vấn chọn bình phù hợp, kiểm tra tồn kho, báo giá
                                và hỗ trợ xử lý các vấn đề sau bán.
                            </p>

                            <div className="mt-6 pt-6 border-t border-gray-100">
                                <h3 className="text-lg font-semibold text-gray-900">Chính sách hỗ trợ</h3>
                                <div className="mt-4 space-y-3">
                                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                                        <p className="font-medium text-gray-900 flex items-center gap-2">
                                            <BadgeCheck className="w-4 h-4 text-primary" />
                                            Sản phẩm chính hãng
                                        </p>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Cam kết phân phối ắc quy chính hãng, nguồn gốc rõ ràng và thông tin minh bạch.
                                        </p>
                                    </div>

                                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                                        <p className="font-medium text-gray-900 flex items-center gap-2">
                                            <ShieldCheck className="w-4 h-4 text-primary" />
                                            Chính sách bảo hành
                                        </p>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Hỗ trợ kiểm tra điều kiện bảo hành và hướng dẫn xử lý nhanh theo quy định của hãng.
                                        </p>
                                    </div>

                                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                                        <p className="font-medium text-gray-900 flex items-center gap-2">
                                            <RefreshCcw className="w-4 h-4 text-primary" />
                                            Hỗ trợ đổi trả
                                        </p>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Tiếp nhận và xử lý các trường hợp lỗi kỹ thuật theo chính sách hiện hành của cửa hàng.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </article>
                    </div>
                </section>

                <section className="container mx-auto px-4 lg:px-6 pb-10 md:pb-12">
                    <div className="bg-white border border-gray-100 rounded-2xl p-4 md:p-6 shadow-sm">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Bản đồ cửa hàng</h2>
                        <div className="w-full h-[320px] rounded-xl overflow-hidden border border-gray-100">
                            <iframe
                                src={GOOGLE_MAP_EMBED}
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                allowFullScreen=""
                                loading="lazy"
                                title="Bản đồ cửa hàng Ắc Quy Thanh Tú"
                            />
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
