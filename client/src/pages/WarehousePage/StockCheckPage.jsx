import React from 'react';
import StockCheckTab from '../ProductManagementPage/StockCheckTab';

const StockCheckPage = () => {
    return (
        <div className="flex-1 p-6 bg-base-200 overflow-y-auto">
            <div className="container mx-auto">
                <h1 className="text-2xl font-bold text-base-content mb-6">Kiểm kho</h1>
                <StockCheckTab />
            </div>
        </div>
    );
};

export default StockCheckPage;
