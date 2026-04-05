import React from 'react';
import StockCheckTab from '../ProductManagementPage/StockCheckTab';

const StockCheckPage = () => {
    return (
        <div className="flex-1 p-6 bg-base-200 overflow-y-auto">
            <div className="container mx-auto">
                <h1 className="text-2xl font-bold text-base-content mb-2">Kiểm kho</h1>
                <p className="text-sm text-base-content/65 mb-6 max-w-3xl">
                    Phiếu kiểm kho ghi nhận tồn trên sổ tại thời điểm tạo; sau khi kiểm thực tế, cập nhật số đếm trong chi tiết phiếu (nháp) rồi xác nhận để đồng bộ tồn kho.
                </p>
                <StockCheckTab />
            </div>
        </div>
    );
};

export default StockCheckPage;
