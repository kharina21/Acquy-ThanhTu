import React, { useState } from 'react';
import { Package, DollarSign, Shield, ClipboardList } from 'lucide-react';
import ProductListTab from './ProductListTab';
import PriceSettingsTab from './PriceSettingsTab';
import WarrantySettingsTab from './WarrantySettingsTab';
import StockCheckTab from './StockCheckTab';

const TABS = [
    { id: 'list', label: 'Danh sách sản phẩm', icon: Package, component: ProductListTab },
    { id: 'stock-check', label: 'Kiểm kho', icon: ClipboardList, component: StockCheckTab },
    { id: 'price', label: 'Thiết lập giá', icon: DollarSign, component: PriceSettingsTab },
    { id: 'warranty', label: 'Thiết lập bảo hành', icon: Shield, component: WarrantySettingsTab },
];

const ProductManagementPage = () => {
    const [activeTab, setActiveTab] = useState('list');
    const ActiveComponent = TABS.find((t) => t.id === activeTab)?.component || ProductListTab;

    return (
        <div className="flex-1 p-6 bg-base-200 overflow-y-auto">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-2xl font-bold text-base-content mb-6">Quản lý sản phẩm</h1>

                <div role="tablist" className="tabs tabs-boxed bg-base-100 p-1 rounded-lg mb-6 w-full max-w-2xl">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                role="tab"
                                aria-selected={activeTab === tab.id}
                                className={`tab gap-2 flex-1 md:flex-none ${activeTab === tab.id ? 'tab-active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                <div role="tabpanel">
                    <ActiveComponent />
                </div>
            </div>
        </div>
    );
};

export default ProductManagementPage;
