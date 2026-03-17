import { useState, useEffect, useRef } from 'react';
import { Search, ChevronUp, Pencil } from 'lucide-react';
import { getSuppliers } from '@/services/supplierService';

const SupplierSelect = ({
    value,
    onChange,
    onCreateNew,
    onEdit,
    label = 'Nhà cung cấp',
    placeholder = 'Chọn nhà cung cấp',
    refreshKey = 0,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const dropdownRef = useRef(null);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const res = await getSuppliers();
            if (res.success) {
                const itemsList = (res.data.suppliers || []).filter((s) => s.isActive !== false);
                setItems(itemsList);
                if (value) {
                    const found = itemsList.find((item) => item._id === value);
                    setSelectedItem(found || null);
                } else {
                    setSelectedItem(null);
                }
            }
        } catch (error) {
            console.error('Error fetching suppliers:', error);
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

    const filteredItems = items.filter(
        (item) =>
            item.name?.toLowerCase().includes(search.toLowerCase()) ||
            item.code?.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = (item) => {
        setSelectedItem(item);
        onChange(item._id);
        setIsOpen(false);
        setSearch('');
    };

    const handleClear = () => {
        setSelectedItem(null);
        onChange('');
        setIsOpen(false);
        setSearch('');
    };

    const handleCreateNew = () => {
        setIsOpen(false);
        setSearch('');
        if (onCreateNew) onCreateNew();
    };

    const handleEdit = (e, item) => {
        e.stopPropagation();
        setIsOpen(false);
        setSearch('');
        if (onEdit) onEdit(item);
    };

    const displayValue = selectedItem ? `${selectedItem.code} - ${selectedItem.name}` : '';

    return (
        <div className="relative" ref={dropdownRef}>
            <label className="label">
                <span className="label-text">{label}</span>
                <button type="button" className="link link-primary text-xs" onClick={handleCreateNew}>
                    Tạo mới
                </button>
            </label>
            <div className="relative">
                <input
                    type="text"
                    className="input input-bordered w-full pr-10 cursor-pointer"
                    value={displayValue}
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
                        <div className="p-2 text-sm text-base-content/60 border-b border-base-300 flex justify-between">
                            <span>Chọn nhà cung cấp</span>
                            <button type="button" className="link link-primary text-xs" onClick={handleClear}>
                                Không chọn
                            </button>
                        </div>
                        {loading ? (
                            <div className="p-4 text-center text-sm text-base-content/60">
                                Đang tải...
                            </div>
                        ) : filteredItems.length === 0 ? (
                            <div className="p-4 text-center text-sm text-base-content/60">
                                {search ? 'Không tìm thấy' : 'Chưa có nhà cung cấp'}
                            </div>
                        ) : (
                            filteredItems.map((item) => (
                                <div
                                    key={item._id}
                                    className={`flex items-center justify-between p-2 cursor-pointer hover:bg-base-200 transition-colors ${selectedItem?._id === item._id ? 'bg-base-200' : ''}`}
                                    onClick={() => handleSelect(item)}
                                >
                                    <span className="flex-1">{item.code} - {item.name}</span>
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-xs p-1 h-6 w-6 min-h-0"
                                        onClick={(e) => handleEdit(e, item)}
                                        title="Chỉnh sửa"
                                    >
                                        <Pencil className="w-3 h-3" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupplierSelect;
