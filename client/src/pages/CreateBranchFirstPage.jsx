import { Link } from 'react-router';
import { Building2 } from 'lucide-react';

export default function CreateBranchFirstPage() {
    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-base-200">
            <div className="max-w-md w-full bg-base-100 rounded-2xl shadow-lg p-8 text-center">
                <div className="flex justify-center mb-6">
                    <div className="rounded-full bg-primary/10 p-6">
                        <Building2 className="w-16 h-16 text-primary" />
                    </div>
                </div>
                <h1 className="text-xl font-bold text-base-content mb-2">
                    Chưa có chi nhánh nào
                </h1>
                <p className="text-base-content/70 mb-6">
                    Bạn cần tạo ít nhất một chi nhánh trước khi sử dụng các chức năng khác như sản phẩm, đơn hàng, báo cáo...
                </p>
                <Link
                    to="/admin/store-profile"
                    className="btn btn-primary gap-2"
                >
                    <Building2 className="w-5 h-5" />
                    Tạo chi nhánh đầu tiên
                </Link>
            </div>
        </div>
    );
}
