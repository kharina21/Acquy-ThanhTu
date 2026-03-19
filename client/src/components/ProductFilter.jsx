import { useState, useEffect } from "react";

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
        <div className="p-4 border rounded-lg bg-white w-64">

            {/* CATEGORY */}
            <div className="mb-4">
                <h3 className="font-semibold mb-2">Loại hàng</h3>

                {categories.map(cat => (
                    <label key={cat._id} className="block">
                        <input
                            type="checkbox"
                            value={cat._id}
                            checked={selectedCategories.includes(cat._id)}
                            onChange={() =>
                                handleCheckboxChange(cat._id, selectedCategories, setSelectedCategories)
                            }
                        />
                        <span className="ml-2">{cat.name}</span>
                    </label>
                ))}
            </div>

            {/* USAGE DEVICE */}
            <div className="mb-4">
                <h3 className="font-semibold mb-2">Thiết bị sử dụng</h3>

                {usageDevices.map(device => (
                    <label key={device._id} className="block">
                        <input
                            type="checkbox"
                            value={device._id}
                            checked={selectedUsageDevices.includes(device._id)}
                            onChange={() =>
                                handleCheckboxChange(device._id, selectedUsageDevices, setSelectedUsageDevices)
                            }
                        />
                        <span className="ml-2">{device.name}</span>
                    </label>
                ))}
            </div>

            {/* BRAND */}
            <div className="mb-4">
                <h3 className="font-semibold mb-2">Thương hiệu</h3>

                {brands.map(brand => (
                    <label key={brand._id} className="block">
                        <input
                            type="checkbox"
                            value={brand._id}
                            checked={selectedBrands.includes(brand._id)}
                            onChange={() =>
                                handleCheckboxChange(brand._id, selectedBrands, setSelectedBrands)
                            }
                        />
                        <span className="ml-2">{brand.name}</span>
                    </label>
                ))}
            </div>

            {/* CAPACITY */}
            <div className="mb-4">
                <h3 className="font-semibold mb-2">Dung lượng (Ah)</h3>

                <div className="flex gap-2">
                    <input
                        type="number"
                        min="0"
                        placeholder="Từ"
                        value={minAh}
                        onChange={(e) => handleNumberChange(e, setMinAh, 'ah')}
                        onBlur={() => handleRangeBlur(minAh, maxAh, setMaxAh)}
                        className="w-full border rounded px-2 py-1"
                    />

                    <input
                        type="number"
                        min="0"
                        placeholder="Đến"
                        value={maxAh}
                        onChange={(e) => handleNumberChange(e, setMaxAh, 'ah')}
                        onBlur={() => handleRangeBlur(minAh, maxAh, setMaxAh)}
                        className="w-full border rounded px-2 py-1"
                    />
                </div>
                {errorAh && <p className="text-red-500 text-xs mt-1 animate-fade-in">{errorAh}</p>}
            </div>

            {/* PRICE */}
            <div className="mb-4">
                <h3 className="font-semibold mb-2">Giá (VNĐ)</h3>

                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Từ"
                        value={formatCurrency(minPrice)}
                        onChange={(e) => handlePriceChange(e, setMinPrice, 'price')}
                        onBlur={() => handleRangeBlur(minPrice, maxPrice, setMaxPrice)}
                        className="w-full border rounded px-2 py-1"
                    />

                    <input
                        type="text"
                        placeholder="Đến"
                        value={formatCurrency(maxPrice)}
                        onChange={(e) => handlePriceChange(e, setMaxPrice, 'price')}
                        onBlur={() => handleRangeBlur(minPrice, maxPrice, setMaxPrice)}
                        className="w-full border rounded px-2 py-1"
                    />
                </div>
                {errorPrice && <p className="text-red-500 text-xs mt-1 animate-fade-in">{errorPrice}</p>}
            </div>

            {/* BUTTON */}
            <button
                onClick={handleSubmit}
                className="btn btn-primary w-full"
            >
                Tìm
            </button>

        </div>
    );
}