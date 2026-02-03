import { useState, useEffect, useRef } from 'react';
import { Search, ChevronUp, Pencil } from 'lucide-react';
import { getCategories, createCategory, updateCategory } from '@/services/categoryService';
import { getBrands, createBrand, updateBrand } from '@/services/brandService';

const CategoryBrandSelect = ({
    type, // 'category' hoặc 'brand'
    value, // ID hiện tại
    onChange, // (id, name) => void
    onCreateNew, // () => void - callback khi click "Tạo mới"
    onEdit, // (item) => void - callback khi click edit
    label,
    placeholder = 'Chọn...',
    refreshKey = 0, // thay đổi để force reload danh sách
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const dropdownRef = useRef(null);

    const service = type === 'category'
        ? { get: getCategories, create: createCategory, update: updateCategory }
        : { get: getBrands, create: createBrand, update: updateBrand };

    const fetchItems = async () => {
        setLoading(true);
        try {
            const res = await service.get();
            if (res.success) {
                const itemsList = res.data[type === 'category' ? 'categories' : 'brands'] || [];
                setItems(itemsList);

                // Tìm selected item
                if (value) {
                    const found = itemsList.find(item => item._id === value);
                    setSelectedItem(found || null);
                } else {
                    setSelectedItem(null);
                }
            }
        } catch (error) {
            console.error(`Error fetching ${type}s:`, error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, [value, refreshKey]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = (item) => {
        setSelectedItem(item);
        onChange(item._id, item.name);
        setIsOpen(false);
        setSearch('');
    };

    const handleCreateNew = () => {
        setIsOpen(false);
        setSearch('');
        if (onCreateNew) {
            onCreateNew();
        }
    };

    const handleEdit = (e, item) => {
        e.stopPropagation();
        setIsOpen(false);
        setSearch('');
        if (onEdit) {
            onEdit(item);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <label className="label">
                <span className="label-text">{label}</span>
                <button
                    type="button"
                    className="link link-primary text-xs"
                    onClick={handleCreateNew}
                >
                    Tạo mới
                </button>
            </label>
            <div className="relative">
                <input
                    type="text"
                    className="input input-bordered w-full pr-10 cursor-pointer"
                    value={selectedItem?.name || ''}
                    placeholder={placeholder}
                    readOnly
                    onClick={() => setIsOpen(!isOpen)}
                />
                <ChevronUp
                    className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/40 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-base-100 border border-base-300 rounded-lg shadow-lg">
                    <div className="p-2 border-b border-base-300">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
                            <input
                                type="text"
                                className="input input-sm w-full pl-9"
                                placeholder="Tìm kiếm..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                        {loading ? (
                            <div className="p-4 text-center text-sm text-base-content/60">
                                Đang tải...
                            </div>
                        ) : filteredItems.length === 0 ? (
                            <div className="p-4 text-center text-sm text-base-content/60">
                                {search ? 'Không tìm thấy' : 'Chưa có dữ liệu'}
                            </div>
                        ) : (
                            <>
                                {!search && (
                                    <div className="p-2 text-sm text-base-content/60 border-b border-base-300">
                                        Chọn {type === 'category' ? 'loại hàng' : 'thương hiệu'}
                                    </div>
                                )}
                                {filteredItems.map((item) => (
                                    <div
                                        key={item._id}
                                        className={`flex items-center justify-between p-2 cursor-pointer hover:bg-base-200 transition-colors ${selectedItem?._id === item._id ? 'bg-base-200' : ''
                                            }`}
                                        onClick={() => handleSelect(item)}
                                    >
                                        <span className="flex-1">{item.name}</span>
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-xs p-1 h-6 w-6 min-h-0"
                                            onClick={(e) => handleEdit(e, item)}
                                            title="Chỉnh sửa"
                                        >
                                            <Pencil className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CategoryBrandSelect;

