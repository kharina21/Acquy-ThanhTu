import { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { useBranchStore } from '@/stores/useBranchStore';
import { getProducts } from '@/services/productService';
import { getActiveLocations } from '@/services/locationService';
import { getBankAccountsByLocation } from '@/services/bankAccountService';
import { getProductStocks } from '@/services/productStockService';
import { createOrderFromItems, generateVietQR } from '@/services/orderService';
import { searchCustomersByPhone, createCustomer, restoreCustomer } from '@/services/customerService';
import { getMemberPolicies } from '@/services/memberPolicyService';
import { getUsers } from '@/services/userService';
import { useUserRole } from '@/hooks/useUserRole';
import { getInitials, getPrimaryRole, getCustomerTier, getCustomerPolicy } from '@/lib/utils';
import { toast } from 'sonner';
import { Search, Plus, Minus, Trash2, ArrowLeftRight, X, ScanBarcode, MoreVertical, Pencil, ChevronDown, LogOut, UserRoundPen, UserPlus } from 'lucide-react';
import CustomerModal from '@/pages/CustomersPage/CustomerModal';
import ConfirmationModal from '@/components/common/ConfirmationModal';

const TAB_TYPES = { INVOICE: 'invoice', ORDER: 'order' };
const PAYMENT_METHODS = [
    { value: 'cash', label: 'Tiền mặt' },
    { value: 'transfer', label: 'Chuyển khoản (VietQR)' },
];

export default function CreateInvoicePage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const accessToken = useAuthStore((s) => s.accessToken);
    const user = useAuthStore((s) => s.user);
    const logout = useAuthStore((s) => s.logout);

    const handleLogout = async () => {
        useBranchStore.getState().reset();
        await logout();
        navigate('/home', { replace: true });
    };
    const { hasAnyRole } = useUserRole();
    const { currentLocationId: storeLocationId, setCurrentLocationId } = useBranchStore();
    const canSelectSeller = hasAnyRole('admin', 'manager');
    const searchInputRef = useRef(null);

    const [tabs, setTabs] = useState([{ id: 1, type: TAB_TYPES.INVOICE, label: 'Hóa đơn 1', items: [] }]);
    const [activeTabId, setActiveTabId] = useState(1);
    const [bankAccounts, setBankAccounts] = useState([]);

    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [locations, setLocations] = useState([]);
    const [customerPaid, setCustomerPaid] = useState('');
    const [stocksByProduct, setStocksByProduct] = useState({});
    const [hoverProductId, setHoverProductId] = useState(null);
    const [form, setForm] = useState({
        locationId: '',
        paymentMethod: 'cash',
        note: '',
        discount: 0,
    });
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerSearch, setCustomerSearch] = useState('');
    const [customerSearchResults, setCustomerSearchResults] = useState([]);
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [sellers, setSellers] = useState([]);
    const [selectedSeller, setSelectedSeller] = useState(null);
    const [sellerSearch, setSellerSearch] = useState('');
    const [memberPolicies, setMemberPolicies] = useState([]);
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [customerModalSubmitting, setCustomerModalSubmitting] = useState(false);
    const [restoreConfirm, setRestoreConfirm] = useState({ show: false, customerId: null, message: '' });
    const [vietQRModal, setVietQRModal] = useState({ show: false, qrDataURL: '', order: null, bankAccount: null, checkoutUrl: null });

    const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
    const items = activeTab?.items || [];
    const currentLocation = locations.find((l) => l._id === form.locationId);

    useEffect(() => {
        if (!accessToken) {
            navigate('/login?redirect=/sales', { replace: true });
            return;
        }
        const init = async () => {
            setLoading(true);
            try {
                const [prodRes, locRes] = await Promise.all([getProducts({ page: 1, limit: 200, search: '' }), getActiveLocations()]);
                const prods = prodRes?.data?.products || prodRes?.products || [];
                setProducts(prods.filter((p) => !p.isDeleted));
                const locs = locRes?.data?.locations || [];
                setLocations(locs);
                if (locs.length > 0) {
                    const fromUrl = searchParams.get('locationId');
                    const fromStore = storeLocationId;
                    const valid = (id) => locs.some((l) => l._id === id);
                    const chosen = (fromUrl && valid(fromUrl) && fromUrl) || (fromStore && valid(fromStore) && fromStore) || locs[0]._id;
                    setForm((f) => ({ ...f, locationId: chosen }));
                }
            } catch (e) {
                console.error(e);
                toast.error('Lỗi khi tải dữ liệu');
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [accessToken, navigate, searchParams, storeLocationId]);

    useEffect(() => {
        if (form.locationId) {
            getBankAccountsByLocation(form.locationId)
                .then((res) => setBankAccounts(res?.data?.accounts || []))
                .catch(() => setBankAccounts([]));
            getProductStocks({ locationId: form.locationId })
                .then((res) => {
                    const map = {};
                    (res?.data?.stocks || []).forEach((s) => {
                        const pid = (s.product?._id ?? s.product)?.toString?.();
                        if (pid) map[pid] = s.quantity ?? 0;
                    });
                    setStocksByProduct(map);
                })
                .catch(() => setStocksByProduct({}));
        } else {
            setBankAccounts([]);
            setStocksByProduct({});
        }
    }, [form.locationId]);

    useEffect(() => {
        if (form.locationId && form.locationId !== storeLocationId) {
            setCurrentLocationId(form.locationId);
        }
    }, [form.locationId, storeLocationId, setCurrentLocationId]);

    const searchProducts = useCallback(
        async (q) => {
            if (!q?.trim()) {
                setSearchResults(products.slice(0, 20));
                return;
            }
            try {
                const res = await getProducts({ page: 1, limit: 30, search: q.trim() });
                const prods = res?.data?.products || res?.products || [];
                setSearchResults(prods.filter((p) => !p.isDeleted));
            } catch {
                setSearchResults([]);
            }
        },
        [products],
    );

    useEffect(() => {
        const t = setTimeout(() => searchProducts(search), 200);
        return () => clearTimeout(t);
    }, [search, searchProducts]);

    useEffect(() => {
        if (!customerSearch?.trim()) {
            setCustomerSearchResults([]);
            return;
        }
        const t = setTimeout(() => {
            searchCustomersByPhone(customerSearch.trim())
                .then((res) => setCustomerSearchResults(res?.data?.customers || []))
                .catch(() => setCustomerSearchResults([]));
        }, 250);
        return () => clearTimeout(t);
    }, [customerSearch]);

    useEffect(() => {
        if (user) {
            setSelectedSeller(user);
        }
    }, [user]);

    useEffect(() => {
        getMemberPolicies()
            .then((res) => {
                const list = res?.data?.policies || [];
                setMemberPolicies(list.sort((a, b) => (a.minTotalSpent ?? 0) - (b.minTotalSpent ?? 0)));
            })
            .catch(() => setMemberPolicies([]));
    }, []);

    useEffect(() => {
        if (canSelectSeller && accessToken) {
            getUsers({ kindFilter: 'staff', limit: 100 })
                .then((res) => {
                    const list = res?.data?.users || [];
                    const sellerList = list.filter((u) => u.roles?.some((r) => r?.name === 'seller'));
                    setSellers(sellerList);
                })
                .catch(() => setSellers([]));
        }
    }, [canSelectSeller, accessToken]);

    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key === 'F3') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    const updateActiveTabItems = (updater) => {
        setTabs((prev) => prev.map((t) => (t.id === activeTabId ? { ...t, items: updater(t.items) } : t)));
    };

    const addTab = () => {
        const newId = Math.max(0, ...tabs.map((t) => t.id)) + 1;
        const newType = activeTab?.type === TAB_TYPES.INVOICE ? TAB_TYPES.ORDER : TAB_TYPES.INVOICE;
        setTabs((prev) => [
            ...prev,
            {
                id: newId,
                type: newType,
                label: `${newType === TAB_TYPES.INVOICE ? 'Hóa đơn' : 'Đặt hàng'} ${newId}`,
                items: [],
            },
        ]);
        setActiveTabId(newId);
    };

    const removeTab = (id) => {
        if (tabs.length <= 1) return;
        setTabs((prev) => prev.filter((t) => t.id !== id));
        if (activeTabId === id) {
            const remaining = tabs.filter((t) => t.id !== id);
            setActiveTabId(remaining[0]?.id ?? 1);
        }
    };

    const switchTabType = (id) => {
        setTabs((prev) =>
            prev.map((t) =>
                t.id === id
                    ? {
                          ...t,
                          type: t.type === TAB_TYPES.INVOICE ? TAB_TYPES.ORDER : TAB_TYPES.INVOICE,
                          label: t.type === TAB_TYPES.INVOICE ? `Đặt hàng ${t.id}` : `Hóa đơn ${t.id}`,
                      }
                    : t,
            ),
        );
    };

    const handleAddProduct = (product) => {
        const id = product._id?.toString?.() || product._id;
        updateActiveTabItems((prev) => {
            const existing = prev.find((i) => i.productId === id);
            if (existing) {
                return prev.map((i) => (i.productId === id ? { ...i, quantity: i.quantity + 1 } : i));
            }
            return [
                ...prev,
                {
                    productId: id,
                    sku: product.sku ?? '',
                    name: product.name ?? '',
                    price: Number(product.price) || 0,
                    quantity: 1,
                },
            ];
        });
        setSearch('');
        setShowSearchDropdown(false);
        searchInputRef.current?.blur();
    };

    const handleRemoveItem = (productId) => {
        updateActiveTabItems((prev) => prev.filter((i) => i.productId !== productId?.toString?.()));
    };

    const handleUpdateQty = (productId, qty) => {
        if (qty < 1) {
            handleRemoveItem(productId);
            return;
        }
        updateActiveTabItems((prev) => prev.map((i) => (i.productId === productId?.toString?.() ? { ...i, quantity: qty } : i)));
    };

    const subtotal = items.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0);
    const totalQty = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);

    const hasTierDiscount =
        selectedCustomer && selectedCustomer.type !== 'walkin' && getCustomerPolicy(selectedCustomer.accumulatedAmount, memberPolicies);
    const tierPolicy = hasTierDiscount ? getCustomerPolicy(selectedCustomer.accumulatedAmount, memberPolicies) : null;
    const tierDiscountAmount = tierPolicy?.discountPercent
        ? Math.round((subtotal * (tierPolicy.discountPercent || 0)) / 100)
        : 0;
    const discount = hasTierDiscount ? tierDiscountAmount : (Number(form.discount) || 0);
    const total = Math.max(0, subtotal - discount);

    const handleSubmit = async () => {
        if (!form.locationId) {
            toast.error('Vui lòng chọn chi nhánh');
            return;
        }
        if (items.length === 0) {
            toast.error('Hóa đơn trống. Vui lòng thêm sản phẩm.');
            return;
        }
        const outOfStock = items.filter((i) => {
            const stock = stocksByProduct[i.productId] ?? 0;
            return stock === 0;
        });
        if (outOfStock.length > 0) {
            const names = outOfStock.map((i) => i.name).join(', ');
            toast.error(`Không còn sản phẩm: ${names}`);
            return;
        }
        const method = form.paymentMethod === 'transfer' ? 'transfer' : 'cash';
        if (method === 'transfer' && bankAccounts.length === 0) {
            toast.error('Hãy thêm tài khoản ngân hàng để nhận chuyển khoản. Vào Hồ sơ cửa hàng → Tài khoản ngân hàng.');
            return;
        }
        setSubmitting(true);
        try {
            const payload = {
                items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
                locationId: form.locationId,
                paymentMethod: method,
                note: form.note.trim(),
                discount,
                isPreOrder: activeTab?.type === TAB_TYPES.ORDER,
                customerId: selectedCustomer?._id || undefined,
            };
            if (canSelectSeller && selectedSeller?._id && selectedSeller._id !== user?._id) {
                payload.createdBy = selectedSeller._id;
            }
            const res = await createOrderFromItems(payload);
            const order = res?.data?.order;
            if (order) {
                if (method === 'transfer') {
                    try {
                        const qrRes = await generateVietQR(order._id);
                        const qrData = qrRes?.data;
                        if (qrData?.checkoutUrl || qrData?.qrDataURL) {
                            setVietQRModal({
                                show: true,
                                qrDataURL: qrData.qrDataURL,
                                order: qrData.order,
                                bankAccount: qrData.bankAccount,
                                checkoutUrl: qrData.checkoutUrl,
                            });
                        } else {
                            toast.success('Đơn hàng đã tạo. Không thể tạo mã QR.');
                        }
                    } catch (qrErr) {
                        toast.warning(qrErr.response?.data?.message || 'Đơn đã tạo nhưng không tạo được mã QR');
                    }
                } else {
                    toast.success('Thanh toán thành công!');
                }
                setTabs((prev) => prev.map((t) => (t.id === activeTabId ? { ...t, items: [] } : t)));
                setCustomerPaid('');
                setForm((f) => ({ ...f, note: '', discount: 0 }));
                setSelectedCustomer(null);
            } else {
                toast.error(res?.message || 'Thanh toán thất bại');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lỗi khi thanh toán');
        } finally {
            setSubmitting(false);
        }
    };

    const setQuickAmount = (amount) => {
        setCustomerPaid(String(amount));
    };

    if (!accessToken) return null;

    const needsBankAccount = form.paymentMethod === 'transfer' && bankAccounts.length === 0;

    return (
        <div className='flex h-full flex-col'>
            {/* Header xanh */}
            <header className='shrink-0 flex items-center gap-4 bg-primary px-4 py-2 text-primary-content'>
                <div className='relative flex-1 max-w-xl'>
                    <div className='flex items-center rounded-lg border-2 border-primary bg-white overflow-hidden'>
                        <Search className='ml-3 size-4 text-base-content/50 shrink-0' />
                        <input
                            ref={searchInputRef}
                            type='text'
                            placeholder='Tìm hàng hóa (F3)'
                            className='input input-ghost input-sm flex-1 min-w-0 border-0 focus:outline-none text-base-content placeholder:opacity-60 py-2'
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setShowSearchDropdown(true);
                            }}
                            onFocus={() => setShowSearchDropdown(true)}
                            onBlur={() => setTimeout(() => setShowSearchDropdown(false), 150)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && searchResults.length > 0) {
                                    handleAddProduct(searchResults[0]);
                                }
                            }}
                        />
                        <button
                            type='button'
                            className='p-2 hover:bg-base-200 text-base-content/60'
                            aria-label='Quét mã vạch'
                        >
                            <ScanBarcode className='size-4' />
                        </button>
                    </div>
                    {showSearchDropdown && (
                        <div className='absolute top-full left-0 right-0 mt-1 rounded-lg border border-base-300 bg-base-100 shadow-lg z-50 overflow-hidden'>
                            {currentLocation && (
                                <div className='px-3 py-1.5 text-xs text-base-content/70 bg-base-200 border-b border-base-300'>
                                    Tồn tại: <span className='font-medium text-base-content'>{currentLocation.name}</span>
                                </div>
                            )}
                            <div className='max-h-80 overflow-y-auto'>
                                {search.trim() && searchResults.length === 0 ? (
                                    <div className='p-4 text-sm text-base-content/60 text-center'>Không tìm thấy sản phẩm</div>
                                ) : (
                                    (search.trim() ? searchResults : products.slice(0, 20)).map((p) => {
                                        const pid = p._id?.toString?.() || p._id;
                                        const stock = stocksByProduct[pid] ?? null;
                                        const isHover = hoverProductId === pid;
                                        return (
                                            <button
                                                key={p._id}
                                                type='button'
                                                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left border-b border-base-200 last:border-b-0 transition-colors ${
                                                    isHover ? 'bg-primary/10' : 'hover:bg-primary/5'
                                                }`}
                                                onClick={() => handleAddProduct(p)}
                                                onMouseEnter={() => setHoverProductId(pid)}
                                                onMouseLeave={() => setHoverProductId(null)}
                                            >
                                                <div className='size-12 shrink-0 rounded-lg border border-base-200 overflow-hidden bg-base-200'>
                                                    {p.image || p.images?.[0] ? (
                                                        <img
                                                            src={p.image || p.images?.[0]}
                                                            alt=''
                                                            className='size-full object-cover'
                                                        />
                                                    ) : (
                                                        <div className='size-full flex items-center justify-center text-base-content/30 text-xs'>—</div>
                                                    )}
                                                </div>
                                                <div className='flex-1 min-w-0'>
                                                    <div className='font-bold text-base text-base-content truncate'>{p.name}</div>
                                                    <div className='text-sm text-base-content/60'>{p.sku || '—'}</div>
                                                    <div className='text-xs text-base-content/50'>Tồn: {stock !== null ? stock : '—'} | KH đặt: 0</div>
                                                </div>
                                                <div className='font-bold text-primary shrink-0'>{(p.price || 0).toLocaleString()}đ</div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                            <Link
                                to='/admin/products'
                                className='flex items-center justify-center gap-2 py-2.5 text-sm text-primary hover:bg-primary/5 font-medium'
                            >
                                <Plus className='size-4' />
                                Thêm mới hàng hóa
                            </Link>
                        </div>
                    )}
                </div>

                <div className='flex items-center gap-1 flex-1 min-w-0 overflow-x-auto overflow-y-hidden'>
                    {tabs.map((t) => (
                        <div
                            key={t.id}
                            className={`flex items-center gap-1 rounded px-2 py-1 cursor-pointer transition-colors shrink-0 ${
                                activeTabId === t.id ? 'bg-white/25' : 'hover:bg-white/15'
                            }`}
                        >
                            <button
                                type='button'
                                className='text-sm font-medium whitespace-nowrap'
                                onClick={() => setActiveTabId(t.id)}
                            >
                                {t.label}
                            </button>
                            <button
                                type='button'
                                className='p-0.5 hover:bg-white/20 rounded shrink-0'
                                onClick={() => switchTabType(t.id)}
                                title='Chuyển loại'
                            >
                                <ArrowLeftRight className='size-3.5' />
                            </button>
                            {tabs.length > 1 && (
                                <button
                                    type='button'
                                    className='p-0.5 hover:bg-white/20 rounded shrink-0'
                                    onClick={() => removeTab(t.id)}
                                    aria-label='Đóng tab'
                                >
                                    <X className='size-3.5' />
                                </button>
                            )}
                        </div>
                    ))}
                    <button
                        type='button'
                        className='btn btn-ghost btn-sm btn-square text-primary-content hover:bg-white/20 shrink-0'
                        onClick={addTab}
                        title='Thêm hóa đơn'
                    >
                        <Plus className='size-5' />
                    </button>
                </div>

                <div className='flex items-center gap-2 shrink-0'>
                    <span className='text-sm opacity-90'>{currentLocation?.phone || '—'}</span>
                </div>

                {user && (
                    <div className='dropdown dropdown-end shrink-0 ml-auto'>
                        <label
                            tabIndex={0}
                            className='btn btn-ghost btn-sm gap-2 text-primary-content hover:bg-white/20 min-h-0 h-9'
                        >
                            <div className='avatar'>
                                <div className='bg-white/30 text-primary-content rounded-full size-8 flex items-center justify-center text-xs font-semibold'>
                                    {getInitials(user)}
                                </div>
                            </div>
                            <span className='text-sm font-medium hidden sm:inline'>{[user.firstName, user.lastName].filter(Boolean).join(' ') || user.username}</span>
                            <span className='badge badge-sm badge-ghost bg-white/20 text-primary-content border-0'>{getPrimaryRole(user)}</span>
                        </label>
                        <ul
                            tabIndex={0}
                            className='dropdown-content menu bg-base-100 rounded-box z-50 w-52 p-2 border border-base-300 shadow-lg mt-2 text-base-content'
                        >
                            <li>
                                <Link to='/profile'>
                                    <UserRoundPen className='size-4' />
                                    Xem hồ sơ
                                </Link>
                            </li>
                            <li>
                                <button
                                    type='button'
                                    onClick={handleLogout}
                                    className='w-full text-left'
                                >
                                    <LogOut className='size-4' />
                                    Đăng xuất
                                </button>
                            </li>
                        </ul>
                    </div>
                )}
            </header>

            {/* Nội dung chính */}
            <div className='flex flex-1 min-h-0 overflow-hidden'>
                {/* Bảng sản phẩm trong đơn */}
                <div className='flex-1 flex flex-col min-w-0 bg-base-100'>
                    <div className='flex-1 overflow-auto'>
                        <table className='table table-pin-rows'>
                            <thead>
                                <tr>
                                    <th className='w-10'>#</th>
                                    <th className='w-10'></th>
                                    <th className='w-24'>Mã</th>
                                    <th>Tên sản phẩm</th>
                                    <th className='w-24 text-right'>SL</th>
                                    <th className='w-28 text-right'>Đơn giá</th>
                                    <th className='w-28 text-right'>Thành tiền</th>
                                    <th className='w-10'></th>
                                    <th className='w-10'></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={9}
                                            className='text-center text-base-content/50 py-12'
                                        >
                                            Chưa có sản phẩm. Gõ tìm kiếm (F3) để thêm.
                                        </td>
                                    </tr>
                                ) : (
                                    items.map((item, idx) => (
                                        <tr
                                            key={item.productId}
                                            className='hover'
                                        >
                                            <td>{idx + 1}</td>
                                            <td>
                                                <button
                                                    type='button'
                                                    className='btn btn-ghost btn-xs btn-square text-error'
                                                    onClick={() => handleRemoveItem(item.productId)}
                                                    aria-label='Xóa'
                                                >
                                                    <Trash2 className='size-4' />
                                                </button>
                                            </td>
                                            <td className='font-mono text-sm'>{item.sku || '—'}</td>
                                            <td>{item.name}</td>
                                            <td>
                                                <input
                                                    type='number'
                                                    min={1}
                                                    className={`input input-bordered input-sm w-16 text-right ${(stocksByProduct[item.productId] ?? 0) === 0 ? 'input-error' : ''}`}
                                                    value={item.quantity}
                                                    onChange={(e) => handleUpdateQty(item.productId, Math.max(1, parseInt(e.target.value, 10) || 1))}
                                                    title={(stocksByProduct[item.productId] ?? 0) === 0 ? 'Hết hàng' : ''}
                                                />
                                            </td>
                                            <td className='text-right'>{(item.price || 0).toLocaleString()}đ</td>
                                            <td className='text-right font-medium text-primary'>{((item.price || 0) * (item.quantity || 1)).toLocaleString()}đ</td>
                                            <td>
                                                <button
                                                    type='button'
                                                    className='btn btn-ghost btn-xs btn-square'
                                                    onClick={() => handleUpdateQty(item.productId, (item.quantity || 1) + 1)}
                                                    aria-label='Thêm 1'
                                                >
                                                    <Plus className='size-4' />
                                                </button>
                                            </td>
                                            <td>
                                                <button
                                                    type='button'
                                                    className='btn btn-ghost btn-xs btn-square'
                                                    aria-label='Thêm'
                                                >
                                                    <MoreVertical className='size-4' />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className='shrink-0 p-3 border-t border-base-200'>
                        <div className='flex items-center gap-2'>
                            <Pencil className='size-4 text-base-content/50' />
                            <input
                                type='text'
                                className='input input-ghost input-sm flex-1'
                                placeholder='Ghi chú đơn hàng'
                                value={form.note}
                                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                            />
                        </div>
                    </div>
                </div>

                {/* Sidebar thanh toán */}
                <aside className='w-80 shrink-0 flex flex-col bg-base-200/80 border-l border-base-300'>
                    <div className='p-4 space-y-4 flex-1 overflow-auto'>
                        <div>
                            <label className='label py-0 text-xs'>Người bán hàng</label>
                            {canSelectSeller ? (
                                <div className='dropdown dropdown-bottom w-full'>
                                    <label
                                        tabIndex={0}
                                        className='btn btn-sm btn-outline w-full justify-between bg-base-100'
                                    >
                                        {selectedSeller
                                            ? [selectedSeller.firstName, selectedSeller.lastName].filter(Boolean).join(' ') || selectedSeller.username
                                            : 'Chọn người bán'}
                                        <ChevronDown className='size-4' />
                                    </label>
                                    <ul
                                        tabIndex={0}
                                        className='dropdown-content menu bg-base-100 rounded-box z-50 w-full p-2 shadow-lg border border-base-300 mt-1 max-h-60 overflow-y-auto'
                                    >
                                        <li className='menu-title px-2 py-1'>
                                            <input
                                                type='text'
                                                placeholder='Tìm người bán'
                                                className='input input-sm input-bordered w-full'
                                                value={sellerSearch}
                                                onChange={(e) => setSellerSearch(e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                onKeyDown={(e) => e.stopPropagation()}
                                            />
                                        </li>
                                        {sellers
                                            .filter((s) => {
                                                const q = sellerSearch.trim().toLowerCase();
                                                if (!q) return true;
                                                const name = [s.firstName, s.lastName].filter(Boolean).join(' ').toLowerCase();
                                                return name.includes(q) || (s.username || '').toLowerCase().includes(q);
                                            })
                                            .map((s) => (
                                                <li key={s._id}>
                                                    <button
                                                        type='button'
                                                        onClick={() => {
                                                            setSelectedSeller(s);
                                                            setSellerSearch('');
                                                        }}
                                                        className={selectedSeller?._id === s._id ? 'active' : ''}
                                                    >
                                                        {[s.firstName, s.lastName].filter(Boolean).join(' ') || s.username}
                                                    </button>
                                                </li>
                                            ))}
                                    </ul>
                                </div>
                            ) : (
                                <div className='px-3 py-2 rounded-lg bg-base-100 border border-base-300 text-sm'>
                                    {selectedSeller ? [selectedSeller.firstName, selectedSeller.lastName].filter(Boolean).join(' ') || selectedSeller.username : '—'}
                                </div>
                            )}
                        </div>
                        <div className='relative'>
                            <label className='label py-0 text-xs'>Khách hàng</label>
                            <div className='flex gap-2'>
                                <div className='relative flex-1'>
                                    <input
                                        type='text'
                                        placeholder='Tìm theo tên, SĐT...'
                                        className='input input-bordered input-sm w-full bg-base-100'
                                        value={
                                            selectedCustomer
                                                ? `${selectedCustomer.name}${selectedCustomer.phone ? ` (${selectedCustomer.phone})` : ''} · ${getCustomerTier(selectedCustomer.accumulatedAmount, memberPolicies) || 'Chưa có hạng'}`
                                                : customerSearch
                                        }
                                        onChange={(e) => {
                                            setCustomerSearch(e.target.value);
                                            setSelectedCustomer(null);
                                            setShowCustomerDropdown(true);
                                        }}
                                        onFocus={() => setShowCustomerDropdown(true)}
                                        onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 150)}
                                    />
                                    {showCustomerDropdown && (customerSearch || !selectedCustomer) && (
                                        <div className='absolute top-full left-0 right-0 mt-1 rounded-lg border border-base-300 bg-base-100 shadow-lg z-50 max-h-40 overflow-y-auto'>
                                            {customerSearchResults.length === 0 ? (
                                                <div className='p-3 text-sm text-base-content/60'>{customerSearch.trim() ? 'Không tìm thấy' : 'Gõ tên hoặc SĐT để tìm'}</div>
                                            ) : (
                                                customerSearchResults.map((c) => {
                                                    const tier = getCustomerTier(c.accumulatedAmount, memberPolicies) || 'Chưa có hạng';
                                                    return (
                                                        <button
                                                            key={c._id}
                                                            type='button'
                                                            className='w-full text-left px-3 py-2 hover:bg-base-200 border-b border-base-200 last:border-0'
                                                            onClick={() => {
                                                                setSelectedCustomer(c);
                                                                setCustomerSearch('');
                                                                setShowCustomerDropdown(false);
                                                            }}
                                                        >
                                                            <span className='font-medium'>{c.name}</span>
                                                            {c.phone && <span className='text-base-content/60 ml-1'>({c.phone})</span>}
                                                            <span className='ml-1 badge badge-sm badge-ghost'>{tier}</span>
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    )}
                                </div>
                                <button
                                    type='button'
                                    className='btn btn-ghost btn-sm btn-square'
                                    onClick={() => setShowCustomerModal(true)}
                                    title='Thêm khách hàng mới'
                                >
                                    <UserPlus className='size-4' />
                                </button>
                                <button
                                    type='button'
                                    className='btn btn-ghost btn-sm btn-square'
                                    onClick={() => {
                                        setSelectedCustomer(null);
                                        setCustomerSearch('');
                                    }}
                                    title='Chọn Khách vãng lai'
                                >
                                    <X className='size-4' />
                                </button>
                            </div>
                            {showCustomerModal && (
                                <CustomerModal
                                    customer={null}
                                    onClose={() => setShowCustomerModal(false)}
                                    onSubmit={async (formData) => {
                                        setCustomerModalSubmitting(true);
                                        try {
                                            const res = await createCustomer({
                                                name: formData.name.trim(),
                                                phone: formData.phone?.trim() || '',
                                                type: formData.type || 'retail',
                                            });
                                            if (res.success && res.data?.customer) {
                                                setSelectedCustomer(res.data.customer);
                                                setCustomerSearch('');
                                                setShowCustomerModal(false);
                                                toast.success('Đã thêm khách hàng');
                                            } else {
                                                toast.error(res?.message || 'Lỗi khi thêm khách hàng');
                                            }
                                        } catch (err) {
                                            const data = err?.response?.data;
                                            if (err?.response?.status === 409 && data?.code === 'CUSTOMER_SOFT_DELETED') {
                                                setRestoreConfirm({
                                                    show: true,
                                                    customerId: data.customerId,
                                                    message: data?.message || 'Khách hàng này đã bị xóa. Bạn có muốn thêm lại?',
                                                });
                                            } else {
                                                toast.error(data?.message || 'Lỗi khi thêm khách hàng');
                                            }
                                        } finally {
                                            setCustomerModalSubmitting(false);
                                        }
                                    }}
                                    submitting={customerModalSubmitting}
                                />
                            )}
                            <p className='text-xs text-base-content/50 mt-1'>Để trống = Khách vãng lai</p>
                        </div>
                        <div className='text-right text-sm text-base-content/60'>{new Date().toLocaleString('vi-VN')}</div>

                        <div className='space-y-2 pt-2 border-t border-base-300'>
                            <div className='flex justify-between text-sm'>
                                <span>Tổng tiền hàng</span>
                                <span>
                                    {totalQty} · {(subtotal || 0).toLocaleString()}đ
                                </span>
                            </div>
                            <div className='flex justify-between items-center text-sm gap-2'>
                                <span>
                                    {hasTierDiscount
                                        ? `Giảm theo hạng ${tierPolicy?.name || ''} (${tierPolicy?.discountPercent ?? 0}%)`
                                        : 'Giảm giá'}
                                </span>
                                {hasTierDiscount ? (
                                    <span className='font-medium text-primary'>{(discount || 0).toLocaleString()}đ</span>
                                ) : (
                                    <input
                                        type='number'
                                        min={0}
                                        className='input input-bordered input-sm w-24 text-right'
                                        value={form.discount || ''}
                                        onChange={(e) => setForm((f) => ({ ...f, discount: e.target.value ? Number(e.target.value) : 0 }))}
                                    />
                                )}
                            </div>
                            <div className='flex justify-between font-bold text-primary text-lg'>
                                <span>Khách cần trả</span>
                                <span>{(total || 0).toLocaleString()}đ</span>
                            </div>
                            <div>
                                <label className='label py-0 text-xs'>Khách thanh toán</label>
                                <input
                                    type='text'
                                    className='input input-bordered w-full text-right'
                                    placeholder='0'
                                    value={customerPaid}
                                    onChange={(e) => setCustomerPaid(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className='label py-0 text-xs'>Hình thức thanh toán</label>
                            <div className='flex flex-wrap gap-2'>
                                {PAYMENT_METHODS.map((pm) => (
                                    <label
                                        key={pm.value}
                                        className='label cursor-pointer gap-2'
                                    >
                                        <input
                                            type='radio'
                                            name='payment'
                                            className='radio radio-primary radio-sm'
                                            checked={form.paymentMethod === pm.value}
                                            onChange={() => setForm((f) => ({ ...f, paymentMethod: pm.value }))}
                                        />
                                        <span className='label-text text-sm'>{pm.label}</span>
                                    </label>
                                ))}
                            </div>
                            {needsBankAccount && (
                                <div className='mt-2 p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-xs'>
                                    Chưa cấu hình tài khoản.{' '}
                                    <Link
                                        to='/admin/store-profile'
                                        className='link link-primary'
                                    >
                                        Cấu hình
                                    </Link>
                                </div>
                            )}
                        </div>

                        <div className='flex gap-2 flex-wrap'>
                            <button
                                type='button'
                                className='btn btn-sm'
                                onClick={() => setQuickAmount(total)}
                            >
                                {(total || 0).toLocaleString()}
                            </button>
                            <button
                                type='button'
                                className='btn btn-sm'
                                onClick={() => setQuickAmount(Math.ceil(total / 1000) * 1000)}
                            >
                                {(Math.ceil((total || 0) / 1000) * 1000 || 0).toLocaleString()}
                            </button>
                            <button
                                type='button'
                                className='btn btn-sm'
                                onClick={() => setQuickAmount(Math.ceil(total / 100000) * 100000)}
                            >
                                {(Math.ceil((total || 0) / 100000) * 100000 || 0).toLocaleString()}
                            </button>
                        </div>
                    </div>

                    <div className='p-4 border-t border-base-300'>
                        <select
                            className='select select-bordered select-sm w-full mb-2'
                            value={form.locationId}
                            onChange={(e) => setForm((f) => ({ ...f, locationId: e.target.value }))}
                        >
                            <option value=''>-- Chi nhánh --</option>
                            {locations.map((loc) => (
                                <option
                                    key={loc._id}
                                    value={loc._id}
                                >
                                    {loc.name}
                                </option>
                            ))}
                        </select>
                        <button
                            type='button'
                            className='btn btn-primary w-full btn-lg'
                            onClick={handleSubmit}
                            disabled={submitting || items.length === 0}
                        >
                            {submitting ? 'Đang xử lý...' : 'THANH TOÁN'}
                        </button>
                    </div>
                </aside>
            </div>

            {vietQRModal.show && (
                <dialog className='modal modal-open' open>
                    <div className='modal-box max-w-md'>
                        <h3 className='font-bold text-lg'>Thanh toán chuyển khoản</h3>
                        <p className='text-sm text-base-content/70 mt-1'>
                            Mã đơn: <span className='font-mono font-medium'>{vietQRModal.order?.code}</span> •{' '}
                            {(vietQRModal.order?.totalAmount || 0).toLocaleString()}đ
                        </p>
                        {vietQRModal.checkoutUrl && (
                            <a
                                href={vietQRModal.checkoutUrl}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='btn btn-primary w-full my-4'
                            >
                                Thanh toán qua PayOS
                            </a>
                        )}
                        <div className='modal-action'>
                            <button
                                type='button'
                                className='btn'
                                onClick={() => setVietQRModal({ show: false, qrDataURL: '', order: null, bankAccount: null, checkoutUrl: null })}
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                    <form method='dialog' className='modal-backdrop'>
                        <button
                            type='button'
                            onClick={() => setVietQRModal({ show: false, qrDataURL: '', order: null, bankAccount: null, checkoutUrl: null })}
                        >
                            đóng
                        </button>
                    </form>
                </dialog>
            )}

            {restoreConfirm.show && (
                <ConfirmationModal
                    isOpen={restoreConfirm.show}
                    onClose={() => setRestoreConfirm({ show: false, customerId: null, message: '' })}
                    onConfirm={async () => {
                        try {
                            const res = await restoreCustomer(restoreConfirm.customerId);
                            if (res.success && res.data?.customer) {
                                setSelectedCustomer(res.data.customer);
                                setCustomerSearch('');
                                setShowCustomerModal(false);
                                toast.success('Đã khôi phục khách hàng');
                            }
                        } catch (err) {
                            toast.error(err?.response?.data?.message || 'Lỗi khi khôi phục');
                        }
                        setRestoreConfirm({ show: false, customerId: null, message: '' });
                    }}
                    title='Khách hàng đã bị xóa'
                    message={restoreConfirm.message}
                    confirmText='Thêm lại'
                    cancelText='Không'
                    variant='warning'
                />
            )}
        </div>
    );
}
