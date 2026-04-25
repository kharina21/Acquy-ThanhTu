import React, { useState } from 'react';
import { Package, DollarSign } from 'lucide-react';
import ProductListTab from './ProductListTab';
import PriceSettingsTab from './PriceSettingsTab';

const TABS = [
    { id: 'list', label: 'Danh sách sản phẩm', icon: Package, component: ProductListTab },
    { id: 'price', label: 'Thiết lập giá', icon: DollarSign, component: PriceSettingsTab },
];

const ProductManagementPage = ({ initialTab = 'list' } = {}) => {
    const [activeTab, setActiveTab] = useState(initialTab);
    const ActiveComponent = TABS.find((t) => t.id === activeTab)?.component || ProductListTab;

    return (
        <div className="flex-1 p-6 bg-base-200 overflow-y-auto">
            <div className="container mx-auto max-w-7xl">
                <h1 className="text-2xl font-bold text-base-content tracking-tight mb-6">Quản lý sản phẩm</h1>

                <div
                    role="tablist"
                    aria-label="Khu vực quản lý sản phẩm"
                    className="mb-6 flex w-full max-w-2xl rounded-2xl border border-base-300/90 bg-base-100 p-1.5 shadow-sm"
                >
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                role="tab"
                                aria-selected={isActive}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5
                                    text-sm font-medium transition-all duration-200
                                    focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2
                                    ${
                                        isActive
                                            ? 'bg-primary text-primary-content shadow-md'
                                            : 'text-base-content/50 hover:bg-base-200/80 hover:text-base-content'
                                    }
                                `}
                            >
                                <Icon
                                    className={`h-4 w-4 shrink-0 ${isActive ? 'opacity-100' : 'opacity-70'}`}
                                    strokeWidth={isActive ? 2.25 : 1.75}
                                />
                                <span className="whitespace-nowrap max-sm:text-xs">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                <div role="tabpanel" className="min-h-[40vh]">
                    <ActiveComponent />
                </div>
            </div>
        </div>
    );
};

export default ProductManagementPage;
