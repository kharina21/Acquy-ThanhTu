import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";

export default function ProductFilter({
    categories = [],
    brands = [],
    usageDevices = [],
    onFilter,
    searchParams
}) {

    const [selectedCategories, setSelectedCategories] = useState([]);
    const [selectedBrands, setSelectedBrands] = useState([]);
    const [selectedUsageDevices, setSelectedUsageDevices] = useState([]);

    const [minAh, setMinAh] = useState("");
    const [maxAh, setMaxAh] = useState("");

    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");

    const [errorAh, setErrorAh] = useState("");
    const [errorPrice, setErrorPrice] = useState("");

    const showError = (type) => {
        if (type === 'ah') {
            setErrorAh("Không thể điền số âm");
            setTimeout(() => setErrorAh(""), 5000);
        } else if (type === 'price') {
            setErrorPrice("Không thể điền số âm");
            setTimeout(() => setErrorPrice(""), 5000);
        }
    };

    const handleCheckboxChange = (value, list, setList) => {
        if (list.includes(value)) {
            setList(list.filter(item => item !== value));
        } else {
            setList([...list, value]);
        }
    };

    const handleNumberChange = (e, setter, type) => {
        const val = e.target.value;
        if (val === "") {
            setter(val);
        } else if (Number(val) < 0) {
            showError(type);
        } else {
            setter(val);
        }
    };

    const formatCurrency = (value) => {
        if (!value) return "";
        // Remove all non-digit characters
        const numberValue = value.toString().replace(/\D/g, '');
        // Format with commas
        return numberValue.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };

    const handlePriceChange = (e, setter, type) => {
        const rawVal = e.target.value;
        if (rawVal.includes('-')) {
            showError(type);
            return;
        }

        const val = rawVal.replace(/\D/g, ''); // Extract only numbers
        if (val === "" || Number(val) >= 0) {
            setter(val); // Keep raw string of numbers in state
        }
    };

    const handleRangeBlur = (minVal, maxVal, setMax) => {
        const minNum = Number(minVal.toString().replace(/\D/g, ''));
        const maxNum = Number(maxVal.toString().replace(/\D/g, ''));

        if (minVal !== "" && maxVal !== "") {
            if (maxNum < minNum) {
                setMax(minVal);
            }
        }
    };

    const handleSubmit = () => {

        const filters = {};

        if (selectedCategories.length)
            filters.category = selectedCategories.join(",");

        if (selectedBrands.length)
            filters.brand = selectedBrands.join(",");

        if (selectedUsageDevices.length)
            filters.usageDevice = selectedUsageDevices.join(",");

        if (minAh) filters.minAh = minAh;
        if (maxAh) filters.maxAh = maxAh;

        if (minPrice) filters.minPrice = minPrice;
        if (maxPrice) filters.maxPrice = maxPrice;

        onFilter(filters);
    };

    useEffect(() => {

        if (!searchParams || searchParams.toString() === "") {

            setSelectedCategories([]);
            setSelectedBrands([]);
            setSelectedUsageDevices([]);

            setMinAh("");
            setMaxAh("");

            setMinPrice("");
            setMaxPrice("");
        }

    }, [searchParams]);

    return (
        <SurfaceCard className="p-6 w-full">

            <h3 className="font-semibold text-base-content mb-4 pb-2 border-b border-base-200">Bộ lọc</h3>

            {/* CATEGORY */}
            <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Loại hàng</h4>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {categories.map(cat => (
                        <label key={cat._id} className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
                            <input
                                type="checkbox"
                                className="checkbox checkbox-sm checkbox-primary"
                                value={cat._id}
                                checked={selectedCategories.includes(cat._id)}
                                onChange={() =>
                                    handleCheckboxChange(cat._id, selectedCategories, setSelectedCategories)
                                }
                            />
                            <span className="text-sm">{cat.name}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* USAGE DEVICE */}
            <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Thiết bị sử dụng</h4>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {usageDevices.map(device => (
                        <label key={device._id} className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
                            <input
                                type="checkbox"
                                className="checkbox checkbox-sm checkbox-primary"
                                value={device._id}
                                checked={selectedUsageDevices.includes(device._id)}
                                onChange={() =>
                                    handleCheckboxChange(device._id, selectedUsageDevices, setSelectedUsageDevices)
                                }
                            />
                            <span className="text-sm">{device.name}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* BRAND */}
            <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Thương hiệu</h4>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {brands.map(brand => (
                        <label key={brand._id} className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
                            <input
                                type="checkbox"
                                className="checkbox checkbox-sm checkbox-primary"
                                value={brand._id}
                                checked={selectedBrands.includes(brand._id)}
                                onChange={() =>
                                    handleCheckboxChange(brand._id, selectedBrands, setSelectedBrands)
                                }
                            />
                            <span className="text-sm">{brand.name}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* CAPACITY */}
            <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Dung lượng (Ah)</h4>
                <div className="flex gap-2">
                    <input
                        type="number"
                        min="0"
                        placeholder="Từ"
                        value={minAh}
                        onChange={(e) => handleNumberChange(e, setMinAh, 'ah')}
                        onBlur={() => handleRangeBlur(minAh, maxAh, setMaxAh)}
                        className="input input-bordered input-sm w-full"
                    />
                    <input
                        type="number"
                        min="0"
                        placeholder="Đến"
                        value={maxAh}
                        onChange={(e) => handleNumberChange(e, setMaxAh, 'ah')}
                        onBlur={() => handleRangeBlur(minAh, maxAh, setMaxAh)}
                        className="input input-bordered input-sm w-full"
                    />
                </div>
                {errorAh && <p className="text-error text-xs mt-1">{errorAh}</p>}
            </div>

            {/* PRICE */}
            <div className="mb-5">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Giá (VNĐ)</h4>
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Từ"
                        value={formatCurrency(minPrice)}
                        onChange={(e) => handlePriceChange(e, setMinPrice, 'price')}
                        onBlur={() => handleRangeBlur(minPrice, maxPrice, setMaxPrice)}
                        className="input input-bordered input-sm w-full"
                    />
                    <input
                        type="text"
                        placeholder="Đến"
                        value={formatCurrency(maxPrice)}
                        onChange={(e) => handlePriceChange(e, setMaxPrice, 'price')}
                        onBlur={() => handleRangeBlur(minPrice, maxPrice, setMaxPrice)}
                        className="input input-bordered input-sm w-full"
                    />
                </div>
                {errorPrice && <p className="text-error text-xs mt-1">{errorPrice}</p>}
            </div>

            <Button onClick={handleSubmit} className="w-full rounded-xl">
                Áp dụng bộ lọc
            </Button>

        </SurfaceCard>
    );
}