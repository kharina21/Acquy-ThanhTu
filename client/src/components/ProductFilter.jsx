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

    const handleCheckboxChange = (value, list, setList) => {
        if (list.includes(value)) {
            setList(list.filter(item => item !== value));
        } else {
            setList([...list, value]);
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
                        placeholder="Từ"
                        value={minAh}
                        onChange={(e) => setMinAh(e.target.value)}
                        className="w-full border rounded px-2 py-1"
                    />

                    <input
                        type="number"
                        placeholder="Đến"
                        value={maxAh}
                        onChange={(e) => setMaxAh(e.target.value)}
                        className="w-full border rounded px-2 py-1"
                    />
                </div>
            </div>

            {/* PRICE */}
            <div className="mb-4">
                <h3 className="font-semibold mb-2">Giá (VNĐ)</h3>

                <div className="flex gap-2">
                    <input
                        type="number"
                        placeholder="Từ"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        className="w-full border rounded px-2 py-1"
                    />

                    <input
                        type="number"
                        placeholder="Đến"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        className="w-full border rounded px-2 py-1"
                    />
                </div>
            </div>

            {/* BUTTON */}
            <button
                onClick={handleSubmit}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded"
            >
                Tìm
            </button>

        </div>
    );
}