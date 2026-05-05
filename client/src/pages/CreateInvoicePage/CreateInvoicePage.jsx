import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { getStoreSettings } from '@/services/storeSettingsService';
import { moneyToVietnameseWords } from '@/lib/moneyToVietnameseWords';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { useBranchStore } from '@/stores/useBranchStore';
import { getProducts, getProductById } from '@/services/productService';
import { getActiveLocations, getLocations } from '@/services/locationService';
import { getBankAccountsByLocation } from '@/services/bankAccountService';
import { getProductStocks } from '@/services/productStockService';
import {
    completePosCounterSale,
    createOrderFromItems,
    generateVietQR,
    getOrderById,
    syncPaymentStatus,
    updateOrder,
} from '@/services/orderService';
import { searchCustomersByPhone, createCustomer, restoreCustomer } from '@/services/customerService';
import { getMemberPolicies } from '@/services/memberPolicyService';
import { getUsers } from '@/services/userService';
import { useUserRole } from '@/hooks/useUserRole';
import { getInitials, getPrimaryRole, getCustomerTier, getCustomerPolicy } from '@/lib/utils';
import { toast } from 'sonner';
import {
    Search,
    Plus,
    Minus,
    Trash2,
    ArrowLeftRight,
    X,
    ScanBarcode,
    Keyboard,
    Pencil,
    ChevronDown,
    LogOut,
    UserRoundPen,
    UserPlus,
    Printer,
    MoreVertical,
    Eye,
} from 'lucide-react';
import { ROLE_LABELS } from '@/config/roleConfig';
import { buildVietQRImageUrl } from '@/lib/vietqrQuickLink';
import CustomerModal from '@/pages/CustomersPage/CustomerModal';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { labelBatteryType, formatDimensionsMm, formatWeightKg, formatVoltageV } from '@/utils/productDetailDisplay';

const TAB_TYPES = { INVOICE: 'invoice', ORDER: 'order' };
const PRODUCT_SEARCH_MODE = { MANUAL: 'manual', SCAN: 'scan' };

function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function clampInvoiceVat(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return 0;
    return Math.min(100, Math.max(0, x));
}

/** Các dòng thông số kỹ thuật có dữ liệu — tránh danh sách dài toàn "—" trong modal POS. */
function buildPosProductDetailSpecRows(pd) {
    if (!pd) return [];
    const rows = [];
    const add = (label, val) => {
        if (val == null) return;
        const s = typeof val === 'string' ? val.trim() : val;
        if (s === '' || s === '—') return;
        rows.push({ label, value: val });
    };
    add('Dung lượng', pd.capacity);
    const bt = labelBatteryType(pd.batteryType, '');
    if (bt && bt !== '—') rows.push({ label: 'Kiểu ắc quy', value: bt });
    const dim = formatDimensionsMm(pd, '');
    if (dim && dim !== '—') rows.push({ label: 'Kích thước', value: dim });
    const wkg = formatWeightKg(pd.weightKg, '');
    if (wkg && wkg !== '—') rows.push({ label: 'Trọng lượng', value: wkg });
    const vv = formatVoltageV(pd.voltageV, '');
    if (vv && vv !== '—') rows.push({ label: 'Điện áp', value: vv });
    add('Xuất xứ', pd.originCountry);
    add('Bảo hành', pd.warrantyText);
    return rows;
}

/** Đơn giá chưa thuế × SL — cộng thuế GTGT (làm tròn) — khớp backend */
function lineGrossFromExVatPos(unitPrice, qty, vatPct) {
    const net = Math.round(Number(unitPrice) * Number(qty));
    const v = clampInvoiceVat(vatPct);
    const vat = Math.round((net * v) / 100);
    return { net, vat, gross: net + vat };
}

function effectiveVatForLine(item, defaultPct) {
    if (item?.vatPercent != null && Number.isFinite(Number(item.vatPercent))) return clampInvoiceVat(item.vatPercent);
    return clampInvoiceVat(defaultPct);
}

function getUserRoleLabels(user) {
    if (!user?.roles?.length) return '';
    return user.roles
        .map((r) => {
            if (!r) return '';
            if (ROLE_LABELS[r?.name]) return ROLE_LABELS[r.name];
            if (r?.description) {
                const short = String(r.description).split(' - ')[0]?.trim();
                if (short) return short;
            }
            return r?.name || '';
        })
        .filter(Boolean)
        .join(', ');
}

function userHasAdminRole(u) {
    return u?.roles?.some((r) => r?.name === 'admin');
}

/** Admin / quản lý chi nhánh / nhân viên bán hàng đều có thể là người bán trên POS */
const SALES_DROPDOWN_ROLE_NAMES = new Set(['admin', 'manager', 'seller']);

function userHasSalesDropdownRole(u) {
    if (!u?.roles?.length) return false;
    return u.roles.some((r) => {
        const n = typeof r === 'string' ? r : r?.name;
        return n && SALES_DROPDOWN_ROLE_NAMES.has(n);
    });
}

/** Chuẩn hóa user từ auth store để gộp vào danh sách dropdown (API đôi khi không trả chính mình). */
function userStubForSellerMerge(u) {
    if (!u?._id) return null;
    return {
        _id: u._id,
        username: u.username,
        firstName: u.firstName,
        lastName: u.lastName,
        roles: u.roles || [],
    };
}

function usersFromGetUsersResponse(res) {
    if (!res || res.success === false) return [];
    return res.data?.users ?? [];
}

function roleMergeKey(r) {
    if (!r) return null;
    if (r._id != null) return `id:${String(r._id)}`;
    if (r.name) return `n:${r.name}`;
    return null;
}

/** Gộp user từ nhiều API; cùng _id thì hợp nhất roles (tránh bản seller ghi đè làm mất vai trò admin đã populate) */
function mergeUsersById(...lists) {
    const map = new Map();
    for (const list of lists) {
        for (const u of list || []) {
            if (!u?._id) continue;
            const id = String(u._id);
            const prev = map.get(id);
            if (!prev) {
                map.set(id, { ...u });
                continue;
            }
            const rolesMap = new Map();
            for (const r of [...(prev.roles || []), ...(u.roles || [])]) {
                const k = roleMergeKey(r);
                if (k) rolesMap.set(k, r);
            }
            map.set(id, {
                ...prev,
                ...u,
                roles: Array.from(rolesMap.values()),
            });
        }
    }
    return Array.from(map.values());
}
const PAYMENT_METHODS = [
    { value: 'cash', label: 'Tiền mặt' },
    { value: 'transfer', label: 'Chuyển khoản (VietQR)' },
];

const emptyVietQRModal = () => ({
    show: false,
    qrDataURL: '',
    order: null,
    bankAccount: null,
    checkoutUrl: null,
    orderId: null,
    paymentStatus: 'pending',
});

export default function CreateInvoicePage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    /** Mở POS sẵn chế độ đặt trước (ví dụ từ /admin/orders/pre-orders): ?mode=order */
    const initialPosModeOrder = searchParams.get('mode') === 'order';
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
    /** Chỉ admin được chọn người bán khác. Đổi chi nhánh trên POS: xem canChangePosLocation (≥ 2 cơ sở trong phạm vi). */
    const canSelectSeller = hasAnyRole('admin');
    const isPosAdmin = hasAnyRole('admin');
    const searchInputRef = useRef(null);

    const [tabs, setTabs] = useState([
        {
            id: 1,
            type: initialPosModeOrder ? TAB_TYPES.ORDER : TAB_TYPES.INVOICE,
            label: initialPosModeOrder ? 'Đặt hàng 1' : 'Hóa đơn 1',
            items: [],
        },
    ]);
    const [activeTabId, setActiveTabId] = useState(1);
    const [bankAccounts, setBankAccounts] = useState([]);

    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const [productSearchMode, setProductSearchMode] = useState(PRODUCT_SEARCH_MODE.MANUAL);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [locations, setLocations] = useState([]);
    /** Chỉ cho đổi cơ sở POS khi tài khoản có từ hai chi nhánh trở lên trong phạm vi (admin: mọi cơ sở active). */
    const canChangePosLocation = locations.length > 1;
    const [customerPaid, setCustomerPaid] = useState('');
    /** Tồn bán được theo chi nhánh: quantity − reservedOnlineQty (ObjectId → string). */
    const [stocksByProduct, setStocksByProduct] = useState({});
    /** Giữ chỗ đơn online chưa xuất kho — hiển thị cạnh tồn trong gợi ý SP. */
    const [reservedOnlineByProduct, setReservedOnlineByProduct] = useState({});
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
    /** Modal xem nhanh chi tiết SP (từ menu … trên dòng giỏ POS). */
    const [posProductDetailModal, setPosProductDetailModal] = useState({ open: false, loading: false, product: null });
    const [vietQRModal, setVietQRModal] = useState(() => emptyVietQRModal());
    /** Đơn CK vừa tạo: chờ thanh toán hoặc đã paid (chờ bấm Hoàn thành). tabId = tab tạo đơn. */
    const [transferSession, setTransferSession] = useState(null);
    /** Đơn tiền mặt vừa tạo — chờ in / Hoàn thành (cùng trải nghiệm với chuyển khoản). */
    const [cashSession, setCashSession] = useState(null);
    const [selectedBankAccountId, setSelectedBankAccountId] = useState('');
    const [cancelOrderSubmitting, setCancelOrderSubmitting] = useState(false);
    const [checkPaymentSubmitting, setCheckPaymentSubmitting] = useState(false);
    const [posCompleteSubmitting, setPosCompleteSubmitting] = useState(false);
    const payPollPaidToastRef = useRef(false);
    const [invoiceVatPercent, setInvoiceVatPercent] = useState(10);
    const [invoiceTaxCode, setInvoiceTaxCode] = useState('');

    const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
    const items = activeTab?.items || [];
    const currentLocation = locations.find((l) => l._id === form.locationId);

    const defaultBankAccount = useMemo(() => {
        if (!bankAccounts?.length) return null;
        return [...bankAccounts].sort((a, b) => Number(b.isDefault) - Number(a.isDefault))[0];
    }, [bankAccounts]);

    useEffect(() => {
        if (!bankAccounts?.length) {
            setSelectedBankAccountId('');
            return;
        }
        setSelectedBankAccountId((prev) => {
            if (prev && bankAccounts.some((a) => String(a._id) === String(prev))) return prev;
            const def = [...bankAccounts].sort((a, b) => Number(b.isDefault) - Number(a.isDefault))[0];
            return def?._id ? String(def._id) : '';
        });
    }, [bankAccounts]);

    const selectedBankAccount = useMemo(() => {
        if (!bankAccounts?.length || !selectedBankAccountId) return null;
        return bankAccounts.find((a) => String(a._id) === String(selectedBankAccountId)) ?? null;
    }, [bankAccounts, selectedBankAccountId]);

    const bankForTransferPreview = selectedBankAccount || defaultBankAccount;

    const transferFooterActive = transferSession && activeTabId === transferSession.tabId;
    const cashFooterActive = cashSession && activeTabId === cashSession.tabId;
    /** Đang xử lý đơn vừa tạo (CK hoặc tiền mặt) trên tab hiện tại — hiện In / Hoàn thành thay cho Thanh toán. */
    const posFooterActive = transferFooterActive || cashFooterActive;
    const lockPaymentUiForCurrentTransfer =
        (transferSession && activeTabId === transferSession.tabId) ||
        (cashSession && activeTabId === cashSession.tabId);
    const pendingTransferHoldsLocation =
        (transferSession && transferSession.paymentStatus !== 'paid' && activeTabId === transferSession.tabId) ||
        cashFooterActive;
    const cartLockedForTransfer = lockPaymentUiForCurrentTransfer;

    const applyStockResponse = useCallback((res) => {
        const sell = {};
        const reserved = {};
        (res?.data?.stocks || []).forEach((s) => {
            const raw = s.product?._id ?? s.product;
            const pid = raw != null ? String(raw) : '';
            if (!pid) return;
            const q = Number(s.quantity) || 0;
            const r = Number(s.reservedOnlineQty) || 0;
            sell[pid] = Math.max(0, q - r);
            reserved[pid] = r;
        });
        setStocksByProduct(sell);
        setReservedOnlineByProduct(reserved);
    }, []);

    const refreshStocks = useCallback(async () => {
        if (!form.locationId) return;
        try {
            const res = await getProductStocks({ locationId: form.locationId });
            applyStockResponse(res);
        } catch {
            /* ignore */
        }
    }, [form.locationId, applyStockResponse]);

    useEffect(() => {
        if (!accessToken) {
            navigate('/login?redirect=/sales', { replace: true });
            return;
        }
        const init = async () => {
            setLoading(true);
            try {
                const locPromise = isPosAdmin
                    ? getActiveLocations()
                    : getLocations({ isActive: 'true', scope: 'mine' });
                const [prodSettled, locSettled] = await Promise.allSettled([
                    getProducts({ page: 1, limit: 200, search: '' }),
                    locPromise,
                ]);
                if (prodSettled.status === 'fulfilled') {
                    const prodRes = prodSettled.value;
                    const prods = prodRes?.data?.products || prodRes?.products || [];
                    setProducts(prods.filter((p) => !p.isDeleted));
                } else {
                    console.error(prodSettled.reason);
                    toast.error('Không tải được danh sách sản phẩm');
                }
                if (locSettled.status === 'fulfilled') {
                    const locRes = locSettled.value;
                    const locs = locRes?.data?.locations || [];
                    setLocations(locs);
                    if (locs.length > 0) {
                        const fromUrl = searchParams.get('locationId');
                        const fromStore = storeLocationId === 'all' && !isPosAdmin ? null : storeLocationId;
                        const valid = (id) => id && locs.some((l) => String(l._id) === String(id));
                        const chosen =
                            (fromUrl && valid(fromUrl) && fromUrl) ||
                            (fromStore && valid(fromStore) && fromStore) ||
                            locs[0]._id;
                        setForm((f) => ({ ...f, locationId: chosen }));
                    } else if (!isPosAdmin) {
                        toast.warning(
                            'Không có chi nhánh được phân cho tài khoản. Cần gán chi nhánh trong hồ sơ nhân viên (Employee) để dùng bán hàng.',
                            { duration: 8000 }
                        );
                    }
                } else {
                    console.error(locSettled.reason);
                    toast.error('Không tải được danh sách chi nhánh');
                }
            } catch (e) {
                console.error(e);
                toast.error('Lỗi khi tải dữ liệu');
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [accessToken, navigate, searchParams, isPosAdmin]);

    /** Đổi chi nhánh trên navbar / persist → cập nhật POS (không tải lại toàn trang). */
    useEffect(() => {
        if (!locations.length) return;
        const fromUrl = searchParams.get('locationId');
        const valid = (id) => id && locations.some((l) => String(l._id) === String(id));
        const fromStore = storeLocationId === 'all' && !isPosAdmin ? null : storeLocationId;
        const chosen =
            (fromUrl && valid(fromUrl) && fromUrl) ||
            (fromStore && valid(fromStore) && fromStore) ||
            locations[0]._id;
        setForm((f) => (f.locationId === chosen ? f : { ...f, locationId: chosen }));
    }, [locations, storeLocationId, searchParams, isPosAdmin]);

    useEffect(() => {
        if (form.locationId) {
            getBankAccountsByLocation(form.locationId)
                .then((res) => setBankAccounts(res?.data?.accounts || []))
                .catch(() => setBankAccounts([]));
            getProductStocks({ locationId: form.locationId })
                .then((res) => {
                    applyStockResponse(res);
                })
                .catch(() => {
                    setStocksByProduct({});
                    setReservedOnlineByProduct({});
                });
        } else {
            setBankAccounts([]);
            setStocksByProduct({});
            setReservedOnlineByProduct({});
        }
    }, [form.locationId, applyStockResponse]);

    /** Đồng bộ chi nhánh POS lên store (navbar / báo cáo dùng chung). */
    useEffect(() => {
        if (!form.locationId || form.locationId === 'all') return;
        if (form.locationId === storeLocationId) return;
        setCurrentLocationId(form.locationId);
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
        if (productSearchMode === PRODUCT_SEARCH_MODE.SCAN) return;
        const t = setTimeout(() => searchProducts(search), 200);
        return () => clearTimeout(t);
    }, [search, searchProducts, productSearchMode]);

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

    // Chỉ đồng bộ khi đổi tài khoản (_id) hoặc quyền chọn — không ghi đè khi /auth/me trả cùng user nhưng object mới
    useEffect(() => {
        const u = useAuthStore.getState().user;
        if (!u?._id) return;
        if (canSelectSeller) {
            setSelectedSeller(userHasSalesDropdownRole(u) ? u : null);
        } else {
            setSelectedSeller(u);
        }
    }, [user?._id, canSelectSeller]);

    useEffect(() => {
        if (!accessToken) return;
        getMemberPolicies()
            .then((res) => {
                const list = res?.data?.policies || [];
                setMemberPolicies(list.sort((a, b) => (a.minTotalSpent ?? 0) - (b.minTotalSpent ?? 0)));
            })
            .catch(() => setMemberPolicies([]));
    }, [accessToken]);

    useEffect(() => {
        getStoreSettings()
            .then((r) => {
                const p = r?.data?.defaultVatPercent;
                if (p != null && !Number.isNaN(Number(p))) {
                    setInvoiceVatPercent(Number(p));
                }
                if (r?.data?.taxCode != null) {
                    setInvoiceTaxCode(String(r.data.taxCode));
                }
            })
            .catch(() => {});
    }, []);

    /** Đổi chi nhánh POS → mặc định lại người bán là chính admin (tránh giữ NV thuộc cơ sở khác). */
    useEffect(() => {
        if (!canSelectSeller || !form.locationId) return;
        const u = useAuthStore.getState().user;
        if (u && userHasSalesDropdownRole(u)) {
            setSelectedSeller(u);
        }
    }, [form.locationId, canSelectSeller]);

    /** Tải trước danh sách người bán theo chi nhánh POS (workLocationId); song song 3 role. */
    useEffect(() => {
        if (!canSelectSeller || !accessToken || !form.locationId) return;
        let cancelled = false;
        (async () => {
            const params = { limit: 200, page: 1, workLocationId: form.locationId };
            const settled = await Promise.allSettled([
                getUsers({ ...params, role: 'admin' }),
                getUsers({ ...params, role: 'manager' }),
                getUsers({ ...params, role: 'seller' }),
            ]);
            if (cancelled) return;
            const admins = settled[0].status === 'fulfilled' ? usersFromGetUsersResponse(settled[0].value) : [];
            const managers = settled[1].status === 'fulfilled' ? usersFromGetUsersResponse(settled[1].value) : [];
            const sellersList = settled[2].status === 'fulfilled' ? usersFromGetUsersResponse(settled[2].value) : [];
            const selfStub = userStubForSellerMerge(useAuthStore.getState().user);
            const merged = mergeUsersById(sellersList, managers, admins, selfStub ? [selfStub] : []);
            merged.sort((a, b) => {
                const pa = userHasAdminRole(a) ? 0 : 1;
                const pb = userHasAdminRole(b) ? 0 : 1;
                if (pa !== pb) return pa - pb;
                const na = [a.firstName, a.lastName].filter(Boolean).join(' ') || a.username || '';
                const nb = [b.firstName, b.lastName].filter(Boolean).join(' ') || b.username || '';
                return na.localeCompare(nb, 'vi', { sensitivity: 'base' });
            });
            setSellers(merged);
        })();
        return () => {
            cancelled = true;
        };
    }, [canSelectSeller, accessToken, user?._id, form.locationId]);

    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key !== 'F3') return;
            if (lockPaymentUiForCurrentTransfer) return;
            e.preventDefault();
            searchInputRef.current?.focus();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [lockPaymentUiForCurrentTransfer]);

    useEffect(() => {
        payPollPaidToastRef.current = false;
    }, [transferSession?.orderId]);

    useEffect(() => {
        if (!transferSession?.orderId || transferSession.paymentStatus === 'paid') return;
        let cancelled = false;
        const id = transferSession.orderId;
        const tick = async () => {
            if (cancelled) return;
            try {
                const res = await syncPaymentStatus(id);
                const ord = res?.data?.order;
                if (cancelled || !ord) return;
                const ps = ord.paymentStatus || 'pending';
                setTransferSession((s) =>
                    s && String(s.orderId) === String(id) ? { ...s, paymentStatus: ps } : s,
                );
                setVietQRModal((m) =>
                    String(m.orderId) === String(id) ? { ...m, paymentStatus: ps } : m,
                );
                if (ps === 'paid' && !payPollPaidToastRef.current) {
                    payPollPaidToastRef.current = true;
                    toast.success('Đã nhận thanh toán chuyển khoản');
                }
            } catch {
                /* ignore */
            }
        };
        tick();
        const iv = setInterval(tick, 4000);
        return () => {
            cancelled = true;
            clearInterval(iv);
        };
    }, [transferSession?.orderId, transferSession?.paymentStatus]);

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

    const resolveProductFromScan = (code, results) => {
        const c = code.trim().toLowerCase();
        if (!c || !results?.length) return null;
        const exact = results.filter(
            (p) =>
                (p.sku && String(p.sku).trim().toLowerCase() === c) ||
                (p.barcode && String(p.barcode).trim().toLowerCase() === c),
        );
        if (exact.length >= 1) return exact[0];
        if (results.length === 1) return results[0];
        return null;
    };

    const handleAddProduct = (product) => {
        if (cartLockedForTransfer) {
            toast.error('Đang chờ chuyển khoản cho tab này. Hủy đơn hoặc hoàn tất trước khi sửa giỏ.');
            return;
        }
        const id = product._id?.toString?.() || product._id;
        updateActiveTabItems((prev) => {
            const existing = prev.find((i) => i.productId === id);
            if (existing) {
                return prev.map((i) => (i.productId === id ? { ...i, quantity: i.quantity + 1 } : i));
            }
            const img =
                (product.image && String(product.image).trim()) || product.images?.[0] || '';
            return [
                ...prev,
                {
                    productId: id,
                    sku: product.sku ?? '',
                    name: product.name ?? '',
                    price: Number(product.price) || 0,
                    quantity: 1,
                    unit: (product.unit && String(product.unit).trim()) || 'Cái',
                    vatPercent: product.vatPercent != null && !Number.isNaN(Number(product.vatPercent)) ? Number(product.vatPercent) : null,
                    image: img,
                },
            ];
        });
        setSearch('');
        setShowSearchDropdown(false);
        searchInputRef.current?.blur();
    };

    const handleRemoveItem = (productId) => {
        if (cartLockedForTransfer) {
            toast.error('Đang chờ chuyển khoản cho tab này. Hủy đơn hoặc hoàn tất trước khi sửa giỏ.');
            return;
        }
        updateActiveTabItems((prev) => prev.filter((i) => i.productId !== productId?.toString?.()));
    };

    const handleUpdateQty = (productId, qty) => {
        if (cartLockedForTransfer) {
            toast.error('Đang chờ chuyển khoản cho tab này. Hủy đơn hoặc hoàn tất trước khi sửa giỏ.');
            return;
        }
        if (qty < 1) {
            handleRemoveItem(productId);
            return;
        }
        updateActiveTabItems((prev) => prev.map((i) => (i.productId === productId?.toString?.() ? { ...i, quantity: qty } : i)));
    };

    const closePosProductDetailModal = () => setPosProductDetailModal({ open: false, loading: false, product: null });

    const openPosProductDetailModal = async (productId) => {
        if (!productId) return;
        setPosProductDetailModal({ open: true, loading: true, product: null });
        try {
            const res = await getProductById(productId);
            const p = res?.data?.product ?? null;
            if (!p) {
                toast.error(res?.message || 'Không tải được chi tiết sản phẩm');
                closePosProductDetailModal();
                return;
            }
            setPosProductDetailModal({ open: true, loading: false, product: p });
        } catch {
            toast.error('Lỗi khi tải chi tiết sản phẩm');
            closePosProductDetailModal();
        }
    };

    const totalQty = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);

    const invoiceTotals = useMemo(() => {
        const spent = Number(selectedCustomer?.accumulatedAmount ?? 0);
        const tp = selectedCustomer ? getCustomerPolicy(spent, memberPolicies) : null;
        const def = invoiceVatPercent;
        let sumNet = 0;
        let sumGross = 0;
        let sumVat = 0;
        for (const i of items) {
            const r = effectiveVatForLine(i, def);
            const { net, gross, vat } = lineGrossFromExVatPos(i.price, i.quantity, r);
            sumNet += net;
            sumGross += gross;
            sumVat += vat;
        }
        const tierPct = tp ? Number(tp.discountPercent) || 0 : 0;
        const discount =
            selectedCustomer && tp && tierPct > 0
                ? Math.round((sumNet * tierPct) / 100)
                : Number(form.discount) || 0;
        const total = Math.max(0, sumGross - discount);
        return { subtotal: sumNet, sumVat, grossSubtotal: sumGross, total, discount, tierPolicy: tp };
    }, [items, invoiceVatPercent, selectedCustomer, form.discount, memberPolicies]);

    const { subtotal, sumVat, grossSubtotal, total, discount, tierPolicy } = invoiceTotals;
    const showTierPercentDiscount = Boolean(
        selectedCustomer && tierPolicy && (Number(tierPolicy.discountPercent) || 0) > 0,
    );

    const transferPreviewQrUrl =
        form.paymentMethod === 'transfer' && bankForTransferPreview && total > 0 && items.length > 0
            ? buildVietQRImageUrl({
                  bankCode: bankForTransferPreview.bankCode,
                  accountNumber: bankForTransferPreview.bankAccount,
                  accountName: bankForTransferPreview.userBankName,
                  amount: total,
                  /** Chưa có đơn: không gắn nội dung CK — sau tạo đơn, server/PayOS dùng mã đơn làm nội dung. */
                  memo: '',
              })
            : '';

    const handleTransferCheckStatus = async () => {
        if (!transferSession?.orderId) return;
        setCheckPaymentSubmitting(true);
        try {
            const res = await syncPaymentStatus(transferSession.orderId);
            const ord = res?.data?.order;
            if (ord?.paymentStatus) {
                const ps = ord.paymentStatus;
                const oid = transferSession.orderId;
                setTransferSession((s) => (s ? { ...s, paymentStatus: ps } : s));
                setVietQRModal((m) => (String(m.orderId) === String(oid) ? { ...m, paymentStatus: ps } : m));
                if (ps === 'paid') {
                    toast.success('Đã nhận thanh toán chuyển khoản');
                } else {
                    toast.info('Chưa có xác nhận thanh toán (PayOS / ngân hàng).');
                }
            }
        } catch (e) {
            toast.error(e.response?.data?.message || 'Không kiểm tra được trạng thái');
        } finally {
            setCheckPaymentSubmitting(false);
        }
    };

    const handleTransferCancel = async () => {
        if (!transferSession?.orderId) return;
        setCancelOrderSubmitting(true);
        try {
            await updateOrder(transferSession.orderId, { status: 'cancelled' });
            toast.success('Đã hủy đơn chuyển khoản');
            setVietQRModal(emptyVietQRModal());
            setTransferSession(null);
            await refreshStocks();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Không hủy được đơn');
        } finally {
            setCancelOrderSubmitting(false);
        }
    };

    const handleTransferComplete = async () => {
        const tid = transferSession?.tabId ?? cashSession?.tabId;
        const orderId = transferSession?.orderId ?? cashSession?.orderId;
        const isPreOrder = Boolean(
            transferSession?.isPreOrder ?? cashSession?.isPreOrder ?? activeTab?.type === TAB_TYPES.ORDER,
        );

        if (orderId && !isPreOrder) {
            setPosCompleteSubmitting(true);
            try {
                await completePosCounterSale(orderId);
            } catch (e) {
                toast.error(e.response?.data?.message || 'Không hoàn tất xuất kho');
                return;
            } finally {
                setPosCompleteSubmitting(false);
            }
        }

        if (tid != null) {
            setTabs((prev) => prev.map((t) => (t.id === tid ? { ...t, items: [] } : t)));
        }
        setCustomerPaid('');
        setForm((f) => ({ ...f, note: '', discount: 0 }));
        setSelectedCustomer(null);
        setVietQRModal(emptyVietQRModal());
        setTransferSession(null);
        setCashSession(null);
        refreshStocks();
        toast.success(isPreOrder ? 'Đã đóng phiên (đơn đặt trước giữ nguyên trên hệ thống)' : 'Đã hoàn thành hóa đơn và xuất kho');
    };

    const posPrintOrderId = transferSession?.orderId ?? cashSession?.orderId;

    const handlePrintTransferInvoice = useCallback(async () => {
        if (!posPrintOrderId) {
            toast.error('Không có dữ liệu hóa đơn để in.');
            return;
        }
        let orderCode =
            vietQRModal.order?.code != null
                ? String(vietQRModal.order.code)
                : transferSession?.orderSnapshot?.code != null
                  ? String(transferSession.orderSnapshot.code)
                  : cashSession?.orderSnapshot?.code != null
                    ? String(cashSession.orderSnapshot.code)
                    : '';
        let orderTotal = vietQRModal.order?.totalAmount ?? transferSession?.orderSnapshot?.totalAmount ?? cashSession?.orderSnapshot?.totalAmount;
        let orderDiscount = null;
        let printItems = items;
        let vatPct = invoiceVatPercent;
        let taxCodePrint = invoiceTaxCode;
        let documentDateForPrint = null;
        try {
            const [orderRes, stRes] = await Promise.all([getOrderById(posPrintOrderId), getStoreSettings()]);
            const ord = orderRes?.data?.order ?? orderRes?.order;
            if (ord) {
                if (ord.documentDate) documentDateForPrint = ord.documentDate;
                if (ord.code != null) orderCode = String(ord.code);
                if (ord.totalAmount != null) orderTotal = ord.totalAmount;
                if (ord.discount != null) orderDiscount = Number(ord.discount);
                if (ord.items?.length) {
                    printItems = ord.items.map((it) => {
                        const p = it.product;
                        return {
                            productId: p?._id || it.product,
                            name: p?.name || '—',
                            sku: p?.sku || '',
                            price: it.price,
                            quantity: it.quantity,
                            unit: (it.unit && String(it.unit).trim()) || 'Cái',
                            vatPercent: it.vatPercent,
                            vatAmount: it.vatAmount,
                            lineTotal: it.total,
                        };
                    });
                }
            }
            if (stRes?.data) {
                const p = stRes.data.defaultVatPercent;
                if (p != null && !Number.isNaN(Number(p))) vatPct = Number(p);
                if (stRes.data.taxCode != null) taxCodePrint = String(stRes.data.taxCode);
            }
        } catch {
            /* dùng dữ liệu trên màn hình */
        }
        vatPct = Math.max(0, Math.min(100, vatPct));

        if (!orderCode) orderCode = String(posPrintOrderId).slice(-12);
        const totalPrint = orderTotal != null ? Number(orderTotal) : Number(total) || 0;

        let sumNetP = 0;
        let sumVatP = 0;
        let sumGrossP = 0;
        const lineRows = printItems
            .map((row, idx) => {
                const name = escapeHtml(row.name || '');
                const u = escapeHtml((row.unit && String(row.unit).trim()) || 'Cái');
                const qty = Number(row.quantity) || 0;
                const price = Number(row.price) || 0;
                const net = Math.round(price * qty);
                const r = row.vatPercent != null ? clampInvoiceVat(row.vatPercent) : clampInvoiceVat(vatPct);
                const legacyNoVat =
                    row.vatAmount == null &&
                    row.vatPercent == null &&
                    row.lineTotal != null &&
                    Math.abs(Math.round(Number(row.lineTotal)) - net) < 2;
                let vatLine;
                let grossLine;
                if (legacyNoVat) {
                    grossLine = Math.round(Number(row.lineTotal));
                    vatLine = 0;
                } else if (row.vatAmount != null || row.lineTotal != null) {
                    vatLine = row.vatAmount != null ? Math.round(Number(row.vatAmount)) : lineGrossFromExVatPos(price, qty, r).vat;
                    grossLine = row.lineTotal != null ? Math.round(Number(row.lineTotal)) : lineGrossFromExVatPos(price, qty, r).gross;
                } else {
                    const lg = lineGrossFromExVatPos(price, qty, r);
                    vatLine = lg.vat;
                    grossLine = lg.gross;
                }
                sumNetP += net;
                sumVatP += vatLine;
                sumGrossP += grossLine;
                return `<tr>
  <td style="text-align:center">${idx + 1}</td>
  <td class="l">${name}</td>
  <td style="text-align:center">${u}</td>
  <td style="text-align:right">${qty}</td>
  <td style="text-align:right">${price.toLocaleString('vi-VN')}</td>
  <td style="text-align:right">${grossLine.toLocaleString('vi-VN')}</td>
  <td style="text-align:center">${r}%</td>
  <td style="text-align:right">${Math.round(vatLine).toLocaleString('vi-VN')}</td>
</tr>`;
            })
            .join('');

        const subtotalPrint = sumGrossP;
        const discountPrint =
            orderDiscount != null ? Math.max(0, orderDiscount) : Math.max(0, subtotalPrint - totalPrint);
        const truocThue = sumNetP;
        const tienThueTong = sumVatP;

        const locName = escapeHtml(currentLocation?.name || '—');
        const locAddr = escapeHtml((currentLocation?.address || '').trim() || '—');
        const locPhone = escapeHtml((currentLocation?.phone || '').trim() || '—');
        const taxCodeHtml = taxCodePrint ? escapeHtml(taxCodePrint) : '—';
        const now = escapeHtml(new Date().toLocaleString('vi-VN'));
        const docPrintLine = documentDateForPrint
            ? escapeHtml(new Date(documentDateForPrint).toLocaleDateString('vi-VN'))
            : '';
        const customerLine = selectedCustomer
            ? `${escapeHtml(selectedCustomer.name || '')}${
                  selectedCustomer.phone ? ` — ${escapeHtml(selectedCustomer.phone)}` : ''
              }`
            : 'Khách lẻ / vãng lai';
        const bank = vietQRModal.bankAccount || transferSession?.bankAccount || selectedBankAccount;
        const bankLine = bank
            ? `${escapeHtml(bank.bankName || bank.bankCode || '')} — STK ${escapeHtml(String(bank.bankAccount || ''))}`
            : '';
        const noteLine = form.note?.trim() ? escapeHtml(form.note.trim()) : '';
        const byWords = escapeHtml(moneyToVietnameseWords(Math.round(totalPrint)));

        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Hóa đơn GTGT ${escapeHtml(
            orderCode,
        )}</title>
<style>
  @page { size: A4 portrait; margin: 10mm; }
  * { box-sizing: border-box; }
  body { font-family: "Times New Roman", Times, serif; font-size: 11pt; color: #000; margin: 0; }
  h1 { text-align: center; font-size: 14pt; margin: 0 0 8px; font-weight: 700; }
  .box { width: 100%; border: 1px solid #000; border-collapse: collapse; margin: 6px 0; }
  .box td { border: 1px solid #000; padding: 4px 6px; vertical-align: top; }
  .box .l { text-align: left; }
  .head { background: #f0f0f0; font-weight: 600; }
  .items { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  .items th, .items td { border: 1px solid #000; padding: 3px 4px; }
  .items th { background: #eee; font-weight: 600; }
  .sum { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10pt; }
  .sum td, .sum th { border: 1px solid #000; padding: 5px 6px; }
  .num { text-align: right; }
  .word { font-style: italic; margin-top: 8px; font-size: 10pt; }
  .ft { text-align: center; margin-top: 16px; font-size: 9pt; }
</style></head><body>
  <h1>HÓA ĐƠN GIÁ TRỊ GIA TĂNG (BẢN THỂ HIỆN TẠI QUẦY)</h1>
  <table class="box">
    <tr>
      <td class="l" style="width:50%"><strong>Đơn vị bán:</strong> ${locName}<br/>
        <strong>Địa chỉ:</strong> ${locAddr}<br/>
        <strong>Điện thoại:</strong> ${locPhone}<br/>
        <strong>Mã số thuế (MST):</strong> ${taxCodeHtml}
      </td>
      <td class="l" style="width:50%"><strong>Ký hiệu mẫu / Số HĐ (hệ thống):</strong> ${escapeHtml(
          orderCode,
      )}<br/>
        ${docPrintLine ? `<strong>Ngày trên chứng từ:</strong> ${docPrintLine}<br/>` : ''}
        <strong>Ngày in:</strong> ${now}<br/>
        <strong>Tên người mua:</strong> ${customerLine}${
            bankLine ? `<br/><strong>TK/CK thanh toán:</strong> ${bankLine}` : ''
        }${noteLine ? `<br/><strong>Ghi chú:</strong> ${noteLine}` : ''}
      </td>
    </tr>
  </table>
  <table class="items">
    <thead>
      <tr>
        <th style="width:4%">STT</th>
        <th style="width:28%">Tên hàng hóa, dịch vụ</th>
        <th style="width:6%">ĐVT</th>
        <th style="width:6%">SL</th>
        <th style="width:10%">Đơn giá (chưa thuế)</th>
        <th style="width:12%">Thành tiền (gồm thuế)</th>
        <th style="width:8%">Thuế suất</th>
        <th style="width:12%">Tiền thuế GTGT</th>
      </tr>
    </thead>
    <tbody>${lineRows}</tbody>
  </table>
  <table class="sum">
    <tr>
      <th class="l">Tổng hàng (trước giảm, gồm thuế)</th>
      <td class="num">${subtotalPrint.toLocaleString('vi-VN')}</td>
    </tr>
    <tr>
      <th class="l">Giảm giá / CK</th>
      <td class="num">${discountPrint > 0 ? `-${discountPrint.toLocaleString('vi-VN')}` : '0'}</td>
    </tr>
    <tr>
      <th class="l">Cộng tiền hàng (trước thuế)</th>
      <td class="num">${Math.round(truocThue).toLocaleString('vi-VN')}</td>
    </tr>
    <tr>
      <th class="l">Tiền thuế GTGT (tổng)</th>
      <td class="num">${Math.round(tienThueTong).toLocaleString('vi-VN')}</td>
    </tr>
    <tr>
      <th class="l"><strong>TỔNG CỘNG thanh toán (đồng)</strong></th>
      <td class="num"><strong>${totalPrint.toLocaleString('vi-VN')}</strong></td>
    </tr>
  </table>
  <p class="word">Số tiền viết bằng chữ: ${byWords}</p>
  <p class="ft">Đã thanh toán · Cảm ơn quý khách</p>
</body></html>`;

        const iframe = document.createElement('iframe');
        iframe.style.cssText =
            'position:fixed;left:-9999px;top:0;width:210mm;min-width:200mm;height:1px;border:none;opacity:0;pointer-events:none;';
        document.body.appendChild(iframe);
        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(html);
        doc.close();
        const runPrint = () => {
            const h = Math.max(doc.documentElement?.scrollHeight || 0, doc.body?.scrollHeight || 0, 1);
            iframe.style.height = `${h}px`;
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
        };
        requestAnimationFrame(() => requestAnimationFrame(runPrint));
        setTimeout(() => {
            if (iframe.parentNode) document.body.removeChild(iframe);
        }, 2000);
    }, [
        posPrintOrderId,
        transferSession,
        cashSession,
        items,
        vietQRModal.order,
        vietQRModal.bankAccount,
        selectedBankAccount,
        currentLocation?.name,
        currentLocation?.address,
        currentLocation?.phone,
        selectedCustomer,
        form.note,
        subtotal,
        total,
        invoiceVatPercent,
        invoiceTaxCode,
    ]);

    const handleSubmit = async () => {
        if (!form.locationId) {
            toast.error('Vui lòng chọn chi nhánh');
            return;
        }
        if (items.length === 0) {
            toast.error('Hóa đơn trống. Vui lòng thêm sản phẩm.');
            return;
        }
        if (canSelectSeller && !selectedSeller) {
            toast.error('Vui lòng chọn người bán hàng (quản trị viên hoặc nhân viên bán hàng).');
            return;
        }
        if (activeTab?.type === TAB_TYPES.ORDER && !selectedCustomer?._id) {
            toast.error('Vui lòng chọn hoặc thêm khách hàng (nhập thông tin khách) trước khi thanh toán.');
            return;
        }
        const insufficientStock = items.filter((i) => {
            const sid = String(i.productId ?? '');
            const stock = stocksByProduct[sid] ?? 0;
            return (Number(i.quantity) || 0) > stock;
        });
        if (insufficientStock.length > 0) {
            const names = insufficientStock.map((i) => i.name).join(', ');
            toast.error(`Sản phẩm không đủ tồn kho: ${names}`);
            return;
        }
        if (transferFooterActive && transferSession?.paymentStatus === 'paid') {
            toast.error('Nhấn «Hoàn thành hóa đơn» cho đơn chuyển khoản vừa xong (tab đang xử lý) trước khi bán tiếp.');
            return;
        }
        if (cashSession && activeTabId === cashSession.tabId) {
            toast.error('Nhấn «Hoàn thành hóa đơn» cho đơn tiền mặt vừa tạo (tab này) trước khi bán tiếp.');
            return;
        }
        const method = form.paymentMethod === 'transfer' ? 'transfer' : 'cash';
        if (method === 'transfer' && transferSession && transferSession.paymentStatus !== 'paid') {
            toast.error('Đang có đơn chuyển khoản chưa hoàn tất. Hủy hoặc xác nhận thanh toán đơn đó trước.');
            return;
        }
        if (method === 'transfer' && bankAccounts.length === 0) {
            toast.error('Hãy thêm tài khoản ngân hàng để nhận chuyển khoản. Vào Hồ sơ cửa hàng → Tài khoản ngân hàng.');
            return;
        }
        const bankAccountIdForQr =
            method === 'transfer'
                ? String(selectedBankAccountId || bankAccounts[0]?._id || '')
                : '';
        if (method === 'transfer' && !bankAccountIdForQr) {
            toast.error('Vui lòng chọn tài khoản nhận chuyển khoản.');
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
                ...(selectedCustomer?._id ? { customerId: selectedCustomer._id } : {}),
            };
            if (canSelectSeller && selectedSeller?._id && selectedSeller._id !== user?._id) {
                payload.createdBy = selectedSeller._id;
            }
            const res = await createOrderFromItems(payload);
            const order = res?.data?.order;
            if (order) {
                if (method === 'transfer') {
                    try {
                        const qrRes = await generateVietQR(order._id, {
                            bankAccountId: bankAccountIdForQr,
                        });
                        const qrData = qrRes?.data;
                        const payStatus = order.paymentStatus || 'pending';
                        const sessionBase = {
                            orderId: order._id,
                            paymentStatus: payStatus,
                            tabId: activeTabId,
                            isPreOrder: !!order.isPreOrder,
                            qrDataURL: qrData?.qrDataURL ?? '',
                            checkoutUrl: qrData?.checkoutUrl ?? null,
                            bankAccount: qrData?.bankAccount ?? null,
                            orderSnapshot: qrData?.order ?? {
                                code: order.code,
                                totalAmount: order.totalAmount,
                            },
                        };
                        setTransferSession(sessionBase);
                        if (qrData?.checkoutUrl || qrData?.qrDataURL) {
                            setVietQRModal({
                                ...emptyVietQRModal(),
                                show: true,
                                qrDataURL: sessionBase.qrDataURL,
                                order: sessionBase.orderSnapshot,
                                bankAccount: sessionBase.bankAccount,
                                checkoutUrl: sessionBase.checkoutUrl,
                                orderId: order._id,
                                paymentStatus: payStatus,
                            });
                            toast.success('Đã tạo đơn chuyển khoản. QR dưới đây đồng bộ PayOS / VietQR — theo dõi trạng thái bên cạnh.');
                        } else {
                            toast.warning('Đơn hàng đã tạo. Không thể tạo mã QR — vẫn có thể kiểm tra trạng thái thanh toán (PayOS).');
                        }
                    } catch (qrErr) {
                        toast.warning(qrErr.response?.data?.message || 'Đơn đã tạo nhưng không tạo được mã QR');
                        setTransferSession({
                            orderId: order._id,
                            paymentStatus: order.paymentStatus || 'pending',
                            tabId: activeTabId,
                            isPreOrder: !!order.isPreOrder,
                            qrDataURL: '',
                            checkoutUrl: null,
                            bankAccount: null,
                            orderSnapshot: { code: order.code, totalAmount: order.totalAmount },
                        });
                    }
                } else {
                    setCashSession({
                        orderId: order._id,
                        tabId: activeTabId,
                        isPreOrder: !!order.isPreOrder,
                        orderSnapshot: { code: order.code, totalAmount: order.totalAmount },
                    });
                    await refreshStocks();
                    toast.success('Đã tạo đơn tiền mặt. In hóa đơn hoặc bấm Hoàn thành khi xong.');
                }
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
                <div
                    className={`relative flex-1 max-w-xl${lockPaymentUiForCurrentTransfer ? ' pointer-events-none opacity-60' : ''}`}
                    title={
                        lockPaymentUiForCurrentTransfer
                            ? 'Đã tạo đơn — không thêm/sửa sản phẩm cho đến khi hoàn thành hóa đơn'
                            : undefined
                    }
                >
                    <div className='flex items-center rounded-lg border-2 border-primary bg-white overflow-hidden'>
                        <Search className='ml-3 size-4 text-base-content/50 shrink-0' />
                        <input
                            ref={searchInputRef}
                            type='text'
                            placeholder={
                                productSearchMode === PRODUCT_SEARCH_MODE.SCAN
                                    ? 'Quét mã / SKU — Enter để thêm'
                                    : 'Tìm hàng hóa (F3)'
                            }
                            className='input input-ghost input-sm flex-1 min-w-0 border-0 focus:outline-none text-base-content placeholder:opacity-60 py-2'
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                if (productSearchMode === PRODUCT_SEARCH_MODE.MANUAL) setShowSearchDropdown(true);
                            }}
                            onFocus={() => {
                                if (productSearchMode === PRODUCT_SEARCH_MODE.MANUAL) setShowSearchDropdown(true);
                            }}
                            onBlur={() => setTimeout(() => setShowSearchDropdown(false), 150)}
                            onKeyDown={async (e) => {
                                if (e.key !== 'Enter') return;
                                if (productSearchMode === PRODUCT_SEARCH_MODE.SCAN) {
                                    e.preventDefault();
                                    const code = search.trim();
                                    if (!code) return;
                                    try {
                                        const res = await getProducts({ page: 1, limit: 200, search: code.trim() });
                                        const prods = (res?.data?.products || res?.products || []).filter((p) => !p.isDeleted);
                                        const picked = resolveProductFromScan(code, prods);
                                        if (picked) handleAddProduct(picked);
                                        else if (!prods.length) toast.error('Không có sản phẩm');
                                        else toast.error('Không có sản phẩm khớp mã. Kiểm tra mã hoặc dùng nhập tay.');
                                    } catch {
                                        toast.error('Lỗi khi tra sản phẩm');
                                    }
                                    return;
                                }
                                if (searchResults.length > 0) handleAddProduct(searchResults[0]);
                            }}
                        />
                        <button
                            type='button'
                            className={`p-2 shrink-0 transition-colors ${
                                productSearchMode === PRODUCT_SEARCH_MODE.SCAN
                                    ? 'bg-primary/15 text-primary'
                                    : 'hover:bg-base-200 text-base-content/60'
                            }`}
                            aria-label={
                                productSearchMode === PRODUCT_SEARCH_MODE.SCAN
                                    ? 'Chuyển sang nhập tay'
                                    : 'Chuyển sang quét mã'
                            }
                            title={
                                productSearchMode === PRODUCT_SEARCH_MODE.SCAN
                                    ? 'Đang: Quét mã — bấm để nhập tay'
                                    : 'Đang: Nhập tay — bấm để quét mã'
                            }
                            onClick={() => {
                                setProductSearchMode((m) => {
                                    const next =
                                        m === PRODUCT_SEARCH_MODE.MANUAL ? PRODUCT_SEARCH_MODE.SCAN : PRODUCT_SEARCH_MODE.MANUAL;
                                    if (next === PRODUCT_SEARCH_MODE.SCAN) {
                                        queueMicrotask(() => searchInputRef.current?.focus());
                                    }
                                    return next;
                                });
                                setShowSearchDropdown(false);
                                setSearch('');
                            }}
                        >
                            {productSearchMode === PRODUCT_SEARCH_MODE.SCAN ? (
                                <Keyboard className='size-4' />
                            ) : (
                                <ScanBarcode className='size-4' />
                            )}
                        </button>
                    </div>
                    {showSearchDropdown && productSearchMode === PRODUCT_SEARCH_MODE.MANUAL && (
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
                                        const pid = String(p._id ?? '');
                                        const sell = form.locationId ? (stocksByProduct[pid] ?? 0) : null;
                                        const resOnl = form.locationId ? (reservedOnlineByProduct[pid] ?? 0) : null;
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
                                                    <div className='text-xs text-base-content/50'>
                                                        Tồn: {sell !== null ? sell.toLocaleString('vi-VN') : '—'} | KH đặt:{' '}
                                                        {resOnl !== null ? resOnl.toLocaleString('vi-VN') : '—'}
                                                    </div>
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
                                    <th className='w-14'>Ảnh</th>
                                    <th className='w-24'>Mã</th>
                                    <th>Tên sản phẩm</th>
                                    <th className='w-20'>ĐVT</th>
                                    <th className='w-32'>Số lượng</th>
                                    <th className='w-28 text-right'>Đơn giá</th>
                                    <th className='w-28 text-right'>Thành tiền</th>
                                    <th className='w-12'></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={10}
                                            className='text-center text-base-content/50 py-12'
                                        >
                                            Chưa có sản phẩm. Gõ tìm kiếm (F3) hoặc bật quét mã để thêm.
                                        </td>
                                    </tr>
                                ) : (
                                    items.map((item, idx) => {
                                        const stockAvail = stocksByProduct[String(item.productId)] ?? 0;
                                        const qty = Number(item.quantity) || 0;
                                        const overStock = qty > stockAvail;
                                        const catalog = products.find((x) => String(x._id) === String(item.productId));
                                        const lineImg =
                                            item.image ||
                                            catalog?.image ||
                                            catalog?.images?.[0] ||
                                            '';
                                        return (
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
                                                        disabled={lockPaymentUiForCurrentTransfer}
                                                    >
                                                        <Trash2 className='size-4' />
                                                    </button>
                                                </td>
                                                <td className='align-middle'>
                                                    <div className='size-11 shrink-0 rounded-md border border-base-200 overflow-hidden bg-base-200'>
                                                        {lineImg ? (
                                                            <img
                                                                src={lineImg}
                                                                alt=''
                                                                className='size-full object-cover'
                                                            />
                                                        ) : (
                                                            <div className='size-full flex items-center justify-center text-[10px] text-base-content/35'>
                                                                —
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className='font-mono text-sm'>{item.sku || '—'}</td>
                                                <td>{item.name}</td>
                                                <td className='text-sm text-base-content/80'>{item.unit || 'Cái'}</td>
                                                <td className='align-middle py-1'>
                                                    <div
                                                        className={`inline-flex h-7 w-full max-w-36 items-stretch overflow-hidden rounded-md border border-base-300 bg-base-100 shadow-sm ${
                                                            overStock ? 'ring-1 ring-error/70 ring-offset-1 ring-offset-base-100' : ''
                                                        }${lockPaymentUiForCurrentTransfer ? ' pointer-events-none opacity-60' : ''}`}
                                                        title={
                                                            lockPaymentUiForCurrentTransfer
                                                                ? 'Đã tạo đơn — không đổi số lượng'
                                                                : overStock
                                                                  ? `Tồn kho: ${stockAvail}, đang nhập: ${qty}`
                                                                  : stockAvail === 0
                                                                    ? 'Hết hàng'
                                                                    : `Tồn kho: ${stockAvail}`
                                                        }
                                                    >
                                                        <button
                                                            type='button'
                                                            className='flex w-7 shrink-0 items-center justify-center border-0 bg-base-200/50 text-base-content transition-colors hover:bg-base-200 active:bg-base-300 border-r border-base-300'
                                                            onClick={() => handleUpdateQty(item.productId, qty - 1)}
                                                            aria-label={qty <= 1 ? 'Xóa khỏi đơn' : 'Giảm 1'}
                                                            disabled={lockPaymentUiForCurrentTransfer}
                                                        >
                                                            <Minus className='size-3.5' strokeWidth={2.5} />
                                                        </button>
                                                        <input
                                                            type='number'
                                                            min={1}
                                                            inputMode='numeric'
                                                            aria-invalid={overStock}
                                                            readOnly={lockPaymentUiForCurrentTransfer}
                                                            disabled={lockPaymentUiForCurrentTransfer}
                                                            className={`h-7 min-h-7 min-w-9 flex-1 border-0 bg-base-100 px-0.5 text-center text-sm font-semibold tabular-nums leading-none text-base-content placeholder:text-base-content/40 focus:border-0 focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                                                                overStock ? 'text-error' : ''
                                                            }${lockPaymentUiForCurrentTransfer ? ' cursor-not-allowed' : ''}`}
                                                            value={item.quantity}
                                                            onFocus={(e) => e.target.select()}
                                                            onChange={(e) =>
                                                                handleUpdateQty(
                                                                    item.productId,
                                                                    Math.max(1, parseInt(e.target.value, 10) || 1),
                                                                )
                                                            }
                                                        />
                                                        <button
                                                            type='button'
                                                            className='flex w-7 shrink-0 items-center justify-center border-0 bg-base-200/50 text-base-content transition-colors hover:bg-base-200 active:bg-base-300 border-l border-base-300'
                                                            onClick={() => handleUpdateQty(item.productId, qty + 1)}
                                                            aria-label='Tăng 1'
                                                            disabled={lockPaymentUiForCurrentTransfer}
                                                        >
                                                            <Plus className='size-3.5' strokeWidth={2.5} />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className='text-right'>{(item.price || 0).toLocaleString()}đ</td>
                                                <td className='text-right font-medium text-primary'>
                                                    {((item.price || 0) * (item.quantity || 1)).toLocaleString()}đ
                                                </td>
                                                <td className='align-middle text-center w-12'>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <button
                                                                type='button'
                                                                className='btn btn-ghost btn-xs btn-square text-base-content/70'
                                                                aria-label='Thao tác dòng sản phẩm'
                                                                disabled={lockPaymentUiForCurrentTransfer}
                                                            >
                                                                <MoreVertical className='size-4' />
                                                            </button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent
                                                            align='end'
                                                            className='bg-base-100 text-base-content border-base-300 min-w-40'
                                                        >
                                                            <DropdownMenuItem
                                                                className='cursor-pointer gap-2'
                                                                onSelect={() => openPosProductDetailModal(item.productId)}
                                                            >
                                                                <Eye className='size-4' />
                                                                Xem chi tiết
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div
                        className={`shrink-0 p-3 border-t border-base-200${lockPaymentUiForCurrentTransfer ? ' pointer-events-none opacity-60' : ''}`}
                    >
                        <div className='flex items-center gap-2'>
                            <Pencil className='size-4 text-base-content/50' />
                            <input
                                type='text'
                                className='input input-ghost input-sm flex-1'
                                placeholder='Ghi chú đơn hàng'
                                value={form.note}
                                readOnly={lockPaymentUiForCurrentTransfer}
                                disabled={lockPaymentUiForCurrentTransfer}
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
                                <div
                                    className={`dropdown dropdown-bottom w-full${lockPaymentUiForCurrentTransfer ? ' pointer-events-none opacity-60' : ''}`}
                                >
                                    <label
                                        tabIndex={lockPaymentUiForCurrentTransfer ? -1 : 0}
                                        className='btn btn-sm btn-outline w-full justify-between bg-base-100 gap-2 min-h-10 h-auto py-1.5'
                                        onClick={() => setSellerSearch('')}
                                    >
                                        <span className='flex items-center gap-2 min-w-0 flex-1 text-left'>
                                            {selectedSeller ? (
                                                <>
                                                    <span className='truncate font-medium'>
                                                        {[selectedSeller.firstName, selectedSeller.lastName].filter(Boolean).join(' ') ||
                                                            selectedSeller.username}
                                                    </span>
                                                    {getUserRoleLabels(selectedSeller) ? (
                                                        <span className='badge badge-sm badge-ghost shrink-0'>
                                                            {getUserRoleLabels(selectedSeller)}
                                                        </span>
                                                    ) : null}
                                                </>
                                            ) : (
                                                'Chọn người bán'
                                            )}
                                        </span>
                                        <ChevronDown className='size-4 shrink-0' />
                                    </label>
                                    <ul
                                        tabIndex={0}
                                        className='dropdown-content menu bg-base-100 rounded-box z-50 w-full min-w-0 max-w-full p-2 shadow-lg border border-base-300 mt-1 max-h-60 overflow-y-auto overflow-x-hidden'
                                    >
                                        <li className='menu-title px-2 py-1 min-w-0 w-full'>
                                            <input
                                                type='text'
                                                name='pos-seller-search'
                                                autoComplete='off'
                                                autoCorrect='off'
                                                placeholder='Tìm người bán'
                                                className='input input-sm input-bordered w-full min-w-0'
                                                value={sellerSearch}
                                                onChange={(e) => setSellerSearch(e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                onKeyDown={(e) => e.stopPropagation()}
                                            />
                                        </li>
                                        {sellers
                                            .filter(
                                                (s) =>
                                                    !selectedSeller?._id ||
                                                    String(s._id) !== String(selectedSeller._id),
                                            )
                                            .filter((s) => {
                                                const q = sellerSearch.trim().toLowerCase();
                                                if (!q) return true;
                                                const name = [s.firstName, s.lastName].filter(Boolean).join(' ').toLowerCase();
                                                const rolesStr = getUserRoleLabels(s).toLowerCase();
                                                return (
                                                    name.includes(q) ||
                                                    (s.username || '').toLowerCase().includes(q) ||
                                                    rolesStr.includes(q)
                                                );
                                            })
                                            .map((s) => (
                                                <li key={s._id} className='w-full min-w-0 max-w-full'>
                                                    <button
                                                        type='button'
                                                        onClick={() => {
                                                            setSelectedSeller(s);
                                                            setSellerSearch('');
                                                        }}
                                                        className={`${selectedSeller?._id === s._id ? 'active' : ''} w-full max-w-full min-w-0 flex flex-col items-stretch gap-1 text-left h-auto py-2 px-3 rounded-lg whitespace-normal`}
                                                    >
                                                        <span className='min-w-0 wrap-break-word font-medium leading-snug'>
                                                            {[s.firstName, s.lastName].filter(Boolean).join(' ') || s.username}
                                                        </span>
                                                        {getUserRoleLabels(s) ? (
                                                            <span className='badge badge-sm badge-ghost w-fit max-w-full shrink-0 whitespace-normal text-left'>
                                                                {getUserRoleLabels(s)}
                                                            </span>
                                                        ) : null}
                                                    </button>
                                                </li>
                                            ))}
                                    </ul>
                                </div>
                            ) : (
                                <div className='px-3 py-2 rounded-lg bg-base-100 border border-base-300 text-sm flex flex-wrap items-center gap-2'>
                                    {selectedSeller ? (
                                        <>
                                            <span>
                                                {[selectedSeller.firstName, selectedSeller.lastName].filter(Boolean).join(' ') ||
                                                    selectedSeller.username}
                                            </span>
                                            {getUserRoleLabels(selectedSeller) ? (
                                                <span className='badge badge-sm badge-ghost'>{getUserRoleLabels(selectedSeller)}</span>
                                            ) : null}
                                        </>
                                    ) : (
                                        '—'
                                    )}
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
                                                ? `${selectedCustomer.name}${selectedCustomer.phone ? ` (${selectedCustomer.phone})` : ''} · ${getCustomerTier(Number(selectedCustomer.accumulatedAmount ?? 0), memberPolicies) || 'Chưa có hạng'}`
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
                                                    const tier = getCustomerTier(Number(c.accumulatedAmount ?? 0), memberPolicies) || 'Chưa có hạng';
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
                                    title='Bỏ chọn khách (cần chọn khách khác để thanh toán)'
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
                        </div>
                        <div className='text-right text-sm text-base-content/60'>{new Date().toLocaleString('vi-VN')}</div>

                        <div className='space-y-2 pt-2 border-t border-base-300'>
                            {invoiceTaxCode ? (
                                <p className='text-xs text-base-content/60'>MST (người bán): {invoiceTaxCode}</p>
                            ) : null}
                            <div className='flex justify-between text-sm'>
                                <span>Tiền hàng (chưa thuế)</span>
                                <span>
                                    {totalQty} · {(subtotal || 0).toLocaleString()}đ
                                </span>
                            </div>
                            <div className='flex justify-between text-sm text-base-content/80'>
                                <span>Thuế GTGT</span>
                                <span>{(sumVat || 0).toLocaleString()}đ</span>
                            </div>
                            <div className='flex justify-between text-xs text-base-content/70'>
                                <span>Tạm tính (gồm thuế)</span>
                                <span>{(grossSubtotal || 0).toLocaleString()}đ</span>
                            </div>
                            <div className='flex justify-between items-center text-sm gap-2'>
                                <span>
                                    {showTierPercentDiscount
                                        ? `Chiết khấu hạng · ${tierPolicy.name} (${tierPolicy.discountPercent ?? 0}%)`
                                        : selectedCustomer && tierPolicy
                                          ? `Hạng · ${tierPolicy.name} (0% — nhập giảm giá thủ công)`
                                          : 'Giảm giá (nhập tay)'}
                                </span>
                                {showTierPercentDiscount ? (
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
                                        className={`label gap-2${
                                            lockPaymentUiForCurrentTransfer
                                                ? ' cursor-not-allowed opacity-60'
                                                : ' cursor-pointer'
                                        }`}
                                    >
                                        <input
                                            type='radio'
                                            name='payment'
                                            className='radio radio-primary radio-sm'
                                            checked={form.paymentMethod === pm.value}
                                            disabled={lockPaymentUiForCurrentTransfer}
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
                            {form.paymentMethod === 'transfer' && !needsBankAccount && bankAccounts.length > 0 && (
                                <div className='mt-2'>
                                    <label className='label py-0 text-xs'>Tài khoản nhận (chi nhánh)</label>
                                    <select
                                        className='select select-bordered select-sm w-full'
                                        value={selectedBankAccountId}
                                        disabled={lockPaymentUiForCurrentTransfer}
                                        onChange={(e) => setSelectedBankAccountId(e.target.value)}
                                    >
                                        {[...bankAccounts]
                                            .sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
                                            .map((acc) => (
                                                <option
                                                    key={acc._id}
                                                    value={acc._id}
                                                >
                                                    {(acc.bankName || acc.bankCode || 'Ngân hàng') + ' · ' + acc.bankAccount}
                                                    {acc.isDefault ? ' — mặc định' : ''}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            )}
                            {form.paymentMethod === 'transfer' && !needsBankAccount && items.length > 0 && (
                                <>
                                    {transferFooterActive && transferSession?.orderId ? (
                                        <div className='mt-3 rounded-lg border border-base-300 bg-base-100 p-3 text-center space-y-2'>
                                            <p className='text-xs font-medium text-base-content/80'>
                                                {transferSession.checkoutUrl
                                                    ? 'Mã QR thanh toán (PayOS)'
                                                    : 'Mã QR chuyển khoản (đơn đã tạo)'}
                                            </p>
                                            <div className='flex flex-wrap items-center justify-center gap-2'>
                                                <span
                                                    className={`badge text-xs ${
                                                        transferSession.paymentStatus === 'paid'
                                                            ? 'badge-success'
                                                            : 'badge-warning'
                                                    }`}
                                                >
                                                    {transferSession.paymentStatus === 'paid'
                                                        ? 'Đã thanh toán'
                                                        : 'Chưa xác nhận — đồng bộ PayOS'}
                                                </span>
                                                {transferSession.paymentStatus !== 'paid' && (
                                                    <span className='text-[11px] text-base-content/50'>
                                                        Tự kiểm tra mỗi 4 giây · nút Trạng thái
                                                    </span>
                                                )}
                                            </div>
                                            <p className='text-xs text-base-content/60'>
                                                Mã đơn:{' '}
                                                <span className='font-mono font-medium'>
                                                    {transferSession.orderSnapshot?.code ?? '—'}
                                                </span>{' '}
                                                • {(transferSession.orderSnapshot?.totalAmount ?? 0).toLocaleString()}đ
                                                {transferSession.bankAccount
                                                    ? ` — ${transferSession.bankAccount.bankName || transferSession.bankAccount.bankCode || ''}`
                                                    : ''}
                                            </p>
                                            {transferSession.qrDataURL ? (
                                                <img
                                                    src={transferSession.qrDataURL}
                                                    alt='QR thanh toán'
                                                    className='mx-auto w-40 h-40 object-contain rounded border border-base-200 bg-white'
                                                />
                                            ) : (
                                                <p className='text-[11px] text-amber-700 dark:text-amber-200/90'>
                                                    Chưa có hình QR. Dùng link PayOS bên dưới (nếu có) hoặc «Trạng thái» để
                                                    đồng bộ.
                                                </p>
                                            )}
                                            {transferSession.bankAccount && (
                                                <p className='text-[11px] text-base-content/65'>
                                                    STK{' '}
                                                    <span className='font-mono'>
                                                        {transferSession.bankAccount.bankAccount}
                                                    </span>
                                                </p>
                                            )}
                                            {transferSession.checkoutUrl &&
                                                transferSession.paymentStatus !== 'paid' && (
                                                    <a
                                                        href={transferSession.checkoutUrl}
                                                        target='_blank'
                                                        rel='noopener noreferrer'
                                                        className='btn btn-primary btn-sm w-full'
                                                    >
                                                        Mở thanh toán PayOS
                                                    </a>
                                                )}
                                        </div>
                                    ) : (
                                        transferPreviewQrUrl && (
                                            <div className='mt-3 rounded-lg border border-base-300 bg-base-100 p-3 text-center'>
                                                <p className='text-xs font-medium text-base-content/80 mb-1'>
                                                    Xem trước VietQR (chưa tạo đơn)
                                                </p>
                                                <p className='text-xs text-base-content/60 mb-2'>
                                                    {(total || 0).toLocaleString()}đ —{' '}
                                                    {bankForTransferPreview?.bankName ||
                                                        bankForTransferPreview?.bankCode ||
                                                        'TK'}
                                                </p>
                                                <img
                                                    src={transferPreviewQrUrl}
                                                    alt='VietQR xem trước'
                                                    className='mx-auto w-40 h-40 object-contain rounded border border-base-200 bg-white'
                                                />
                                            </div>
                                        )
                                    )}
                                </>
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
                            disabled={pendingTransferHoldsLocation || !canChangePosLocation}
                            title={
                                !canChangePosLocation
                                    ? 'Chỉ cho phép đổi cơ sở khi được phân hoặc quản lý từ hai chi nhánh trở lên.'
                                    : undefined
                            }
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
                        {posFooterActive ? (
                            <div className='space-y-2'>
                                {cashFooterActive ? (
                                    <>
                                        <div className='flex flex-col gap-2'>
                                            <button
                                                type='button'
                                                className='btn btn-outline btn-lg w-full min-h-12 gap-2 whitespace-nowrap inline-flex items-center justify-center'
                                                onClick={handlePrintTransferInvoice}
                                            >
                                                <Printer className='size-5 shrink-0' aria-hidden />
                                                <span>In hóa đơn</span>
                                            </button>
                                            <button
                                                type='button'
                                                className='btn btn-success btn-lg w-full min-h-12 whitespace-nowrap'
                                                disabled={posCompleteSubmitting}
                                                onClick={handleTransferComplete}
                                            >
                                                {posCompleteSubmitting ? 'Đang hoàn tất...' : 'Hoàn thành hóa đơn'}
                                            </button>
                                        </div>
                                        <p className='text-[11px] text-center text-base-content/55'>
                                            Đã thu tiền mặt — in hóa đơn cho khách nếu cần, rồi bấm Hoàn thành để kết
                                            thúc và xóa giỏ trên tab này.
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        {transferSession?.paymentStatus === 'paid' ? (
                                            <div className='flex flex-col gap-2'>
                                                <button
                                                    type='button'
                                                    className='btn btn-outline btn-lg w-full min-h-12 gap-2 whitespace-nowrap inline-flex items-center justify-center'
                                                    onClick={handlePrintTransferInvoice}
                                                >
                                                    <Printer className='size-5 shrink-0' aria-hidden />
                                                    <span>In hóa đơn</span>
                                                </button>
                                                <button
                                                    type='button'
                                                    className='btn btn-success btn-lg w-full min-h-12 whitespace-nowrap'
                                                    disabled={posCompleteSubmitting}
                                                    onClick={handleTransferComplete}
                                                >
                                                    {posCompleteSubmitting ? 'Đang hoàn tất...' : 'Hoàn thành hóa đơn'}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className='flex gap-2'>
                                                <button
                                                    type='button'
                                                    className='btn btn-outline flex-1'
                                                    disabled={cancelOrderSubmitting || checkPaymentSubmitting || submitting}
                                                    onClick={handleTransferCancel}
                                                >
                                                    {cancelOrderSubmitting ? 'Đang hủy...' : 'Hủy đơn'}
                                                </button>
                                                <button
                                                    type='button'
                                                    className='btn btn-primary flex-1'
                                                    disabled={checkPaymentSubmitting || cancelOrderSubmitting || submitting}
                                                    onClick={handleTransferCheckStatus}
                                                >
                                                    {checkPaymentSubmitting ? 'Đang kiểm tra...' : 'Trạng thái'}
                                                </button>
                                            </div>
                                        )}
                                        <p className='text-[11px] text-center text-base-content/55'>
                                            {transferSession?.paymentStatus === 'paid'
                                                ? 'Đã xác nhận chuyển khoản — nhấn Hoàn thành để kết thúc và xóa giỏ trên tab này.'
                                                : 'Đang chờ CK — Hủy đơn hoàn tồn; Trạng thái đồng bộ PayOS (tự kiểm tra mỗi 4 giây).'}
                                        </p>
                                    </>
                                )}
                            </div>
                        ) : (
                            <button
                                type='button'
                                className='btn btn-primary w-full btn-lg'
                                onClick={handleSubmit}
                                disabled={
                                    submitting ||
                                    items.length === 0 ||
                                    (transferSession &&
                                        transferSession.paymentStatus !== 'paid' &&
                                        form.paymentMethod === 'transfer')
                                }
                            >
                                {submitting ? 'Đang xử lý...' : 'THANH TOÁN'}
                            </button>
                        )}
                    </div>
                </aside>
            </div>

            {posProductDetailModal.open && (
                <dialog className='modal modal-open'>
                    <div className='modal-box max-w-xl max-h-[min(90vh,720px)] overflow-y-auto p-0 sm:p-0 shadow-xl border border-base-200'>
                        {posProductDetailModal.loading ? (
                            <div className='flex justify-center py-20 px-6'>
                                <span className='loading loading-spinner loading-lg text-primary' />
                            </div>
                        ) : posProductDetailModal.product ? (
                            (() => {
                                const pd = posProductDetailModal.product;
                                const mainImg = pd.images?.[0] || pd.image;
                                const refLabel = (x) => {
                                    if (!x) return null;
                                    if (typeof x === 'object' && x !== null && x.name != null) return String(x.name);
                                    return null;
                                };
                                const pid = pd._id != null ? String(pd._id) : '';
                                const hasLoc = Boolean(form.locationId);
                                const avail = hasLoc ? (stocksByProduct[pid] ?? 0) : null;
                                const reserved = hasLoc ? (reservedOnlineByProduct[pid] ?? 0) : null;
                                const physical =
                                    avail != null && reserved != null ? Math.max(0, Number(avail) + Number(reserved)) : null;
                                const specRows = buildPosProductDetailSpecRows(pd);
                                const cat = refLabel(pd.category);
                                const brand = refLabel(pd.brand);
                                const usage = refLabel(pd.usageDevice);

                                return (
                                    <div>
                                        <div className='relative overflow-hidden bg-linear-to-br from-primary/15 via-base-100 to-secondary/10 px-5 pt-5 pb-4 border-b border-base-200'>
                                            <button
                                                type='button'
                                                className='btn btn-sm btn-circle btn-ghost absolute right-3 top-3 z-10'
                                                aria-label='Đóng'
                                                onClick={closePosProductDetailModal}
                                            >
                                                <X className='w-4 h-4' />
                                            </button>
                                            <div className='flex flex-col sm:flex-row gap-4 pr-10'>
                                                <div className='shrink-0 mx-auto sm:mx-0'>
                                                    {mainImg ? (
                                                        <div className='w-[140px] h-[140px] rounded-2xl border border-base-200 bg-white shadow-sm overflow-hidden'>
                                                            <img
                                                                src={mainImg}
                                                                alt=''
                                                                className='w-full h-full object-contain p-2'
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className='w-[140px] h-[140px] rounded-2xl border border-dashed border-base-300 bg-base-200/50 flex items-center justify-center text-xs text-base-content/40'>
                                                            Chưa có ảnh
                                                        </div>
                                                    )}
                                                </div>
                                                <div className='min-w-0 flex-1 text-center sm:text-left space-y-2'>
                                                    <p className='text-[11px] font-semibold uppercase tracking-wide text-primary/80'>
                                                        Chi tiết sản phẩm
                                                    </p>
                                                    <h3 className='font-bold text-xl text-base-content leading-snug'>
                                                        {pd.name || '—'}
                                                    </h3>
                                                    <div className='flex flex-wrap justify-center sm:justify-start gap-1.5'>
                                                        {cat ? (
                                                            <span className='badge badge-sm badge-outline border-base-300'>
                                                                {cat}
                                                            </span>
                                                        ) : null}
                                                        {brand ? (
                                                            <span className='badge badge-sm badge-ghost'>{brand}</span>
                                                        ) : null}
                                                    </div>
                                                    <p className='text-2xl font-bold text-primary tabular-nums'>
                                                        {(Number(pd.price) || 0).toLocaleString('vi-VN')}
                                                        <span className='text-base font-semibold ml-0.5'>đ</span>
                                                    </p>
                                                    <p className='text-xs text-base-content/55 font-mono'>
                                                        SKU {pd.sku || '—'}
                                                        {pd.barcode ? (
                                                            <span className='text-base-content/40'> · MV {pd.barcode}</span>
                                                        ) : null}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className='px-5 pt-4 space-y-4 pb-2'>
                                            <div>
                                                <p className='text-xs font-semibold text-base-content/60 uppercase tracking-wide mb-2'>
                                                    Tồn tại chi nhánh
                                                </p>
                                                {!hasLoc ? (
                                                    <p className='text-sm text-base-content/60 rounded-xl bg-base-200/60 px-3 py-3 border border-base-200'>
                                                        Chọn chi nhánh trên POS để xem tồn kho và số lượng đặt giữ.
                                                    </p>
                                                ) : (
                                                    <div className='grid grid-cols-2 gap-3'>
                                                        <div className='rounded-xl bg-base-100 border border-base-200 p-3 shadow-sm'>
                                                            <p className='text-[11px] font-medium text-base-content/55 uppercase'>
                                                                Tồn kho
                                                            </p>
                                                            <p className='text-2xl font-bold tabular-nums text-base-content mt-0.5'>
                                                                {physical != null ? physical.toLocaleString('vi-VN') : '—'}
                                                            </p>
                                                            <p className='text-[11px] text-base-content/45 mt-1 leading-snug'>
                                                                SL trong kho
                                                                {currentLocation?.name ? (
                                                                    <span className='block truncate' title={currentLocation.name}>
                                                                        · {currentLocation.name}
                                                                    </span>
                                                                ) : null}
                                                            </p>
                                                        </div>
                                                        <div className='rounded-xl bg-base-100 border border-amber-200/60 p-3 shadow-sm bg-amber-50/40 dark:bg-amber-950/20'>
                                                            <p className='text-[11px] font-medium text-amber-900/70 dark:text-amber-200/80 uppercase'>
                                                                Đặt giữ
                                                            </p>
                                                            <p className='text-2xl font-bold tabular-nums text-amber-900 dark:text-amber-100 mt-0.5'>
                                                                {(reserved ?? 0).toLocaleString('vi-VN')}
                                                            </p>
                                                            <p className='text-[11px] text-base-content/50 mt-1 leading-snug'>
                                                                Giữ cho đơn online chưa xuất kho
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                                {hasLoc ? (
                                                    <p className='text-xs text-base-content/50 mt-2'>
                                                        Có thể bán:{' '}
                                                        <span className='font-semibold text-base-content tabular-nums'>
                                                            {(avail ?? 0).toLocaleString('vi-VN')}
                                                        </span>{' '}
                                                        {pd.unit || 'Cái'} (tồn − đặt giữ)
                                                    </p>
                                                ) : null}
                                            </div>

                                            <div className='rounded-xl border border-base-200 bg-base-200/25 p-3'>
                                                <p className='text-xs font-semibold text-base-content/60 uppercase tracking-wide mb-2'>
                                                    Thông tin chung
                                                </p>
                                                <dl className='grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm'>
                                                    <div className='flex justify-between gap-2 sm:block sm:space-y-0.5'>
                                                        <dt className='text-base-content/55'>ĐVT</dt>
                                                        <dd className='font-medium text-right sm:text-left'>
                                                            {pd.unit || 'Cái'}
                                                        </dd>
                                                    </div>
                                                    <div className='flex justify-between gap-2 sm:block sm:space-y-0.5'>
                                                        <dt className='text-base-content/55'>Thiết bị</dt>
                                                        <dd className='font-medium text-right sm:text-left truncate'>
                                                            {usage || '—'}
                                                        </dd>
                                                    </div>
                                                </dl>
                                            </div>

                                            {specRows.length > 0 ? (
                                                <div className='rounded-xl border border-base-200 bg-base-100 p-3'>
                                                    <p className='text-xs font-semibold text-base-content/60 uppercase tracking-wide mb-2'>
                                                        Thông số kỹ thuật
                                                    </p>
                                                    <dl className='grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm'>
                                                        {specRows.map(({ label, value }) => (
                                                            <div
                                                                key={label}
                                                                className='flex flex-col gap-0.5 border-b border-base-200/80 sm:border-0 pb-2 sm:pb-0 last:border-0 last:pb-0'
                                                            >
                                                                <dt className='text-[11px] uppercase text-base-content/50'>
                                                                    {label}
                                                                </dt>
                                                                <dd className='font-medium text-base-content'>{value}</dd>
                                                            </div>
                                                        ))}
                                                    </dl>
                                                </div>
                                            ) : null}

                                            {pd.notes ? (
                                                <div className='rounded-xl border border-base-200 bg-base-200/20 p-3'>
                                                    <p className='text-xs font-semibold text-base-content/60 uppercase tracking-wide mb-1'>
                                                        Ghi chú
                                                    </p>
                                                    <p className='text-sm whitespace-pre-wrap text-base-content/80 leading-relaxed'>
                                                        {pd.notes}
                                                    </p>
                                                </div>
                                            ) : null}
                                        </div>

                                        <div className='sticky bottom-0 flex justify-end gap-2 px-5 py-3 bg-base-100/95 backdrop-blur border-t border-base-200'>
                                            <button
                                                type='button'
                                                className='btn btn-primary'
                                                onClick={closePosProductDetailModal}
                                            >
                                                Đóng
                                            </button>
                                        </div>
                                    </div>
                                );
                            })()
                        ) : null}
                    </div>
                    <form method='dialog' className='modal-backdrop'>
                        <button type='button' onClick={closePosProductDetailModal}>
                            đóng
                        </button>
                    </form>
                </dialog>
            )}

            {vietQRModal.show && (
                <dialog className='modal modal-open' open>
                    <div className='modal-box max-w-md'>
                        <h3 className='font-bold text-lg'>Thanh toán chuyển khoản</h3>
                        <p className='text-sm text-base-content/70 mt-1'>
                            Mã đơn: <span className='font-mono font-medium'>{vietQRModal.order?.code}</span> •{' '}
                            {(vietQRModal.order?.totalAmount || 0).toLocaleString()}đ
                        </p>
                        <div className='mt-2 flex flex-col items-stretch gap-2'>
                            <div className='flex flex-wrap items-center justify-center gap-2'>
                                <span
                                    className={`badge text-xs ${
                                        vietQRModal.paymentStatus === 'paid' ? 'badge-success' : 'badge-warning'
                                    }`}
                                >
                                    {vietQRModal.paymentStatus === 'paid'
                                        ? 'Đã chuyển khoản'
                                        : 'Chưa xác nhận thanh toán'}
                                </span>
                                {vietQRModal.orderId && vietQRModal.paymentStatus !== 'paid' && (
                                    <span className='text-xs text-base-content/50'>Tự kiểm tra mỗi 4 giây</span>
                                )}
                            </div>
                            {vietQRModal.qrDataURL ? (
                                <img
                                    src={vietQRModal.qrDataURL}
                                    alt='QR thanh toán'
                                    className='mx-auto max-w-[260px] rounded-lg border border-base-200 bg-white p-2'
                                />
                            ) : null}
                            {vietQRModal.bankAccount && (
                                <p className='text-xs text-base-content/70 text-center'>
                                    {vietQRModal.bankAccount.bankName || vietQRModal.bankAccount.bankCode} · STK{' '}
                                    <span className='font-mono'>{vietQRModal.bankAccount.bankAccount}</span>
                                </p>
                            )}
                        </div>
                        {vietQRModal.checkoutUrl && vietQRModal.paymentStatus !== 'paid' && (
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
                                onClick={() => setVietQRModal((m) => ({ ...m, show: false }))}
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                    <form method='dialog' className='modal-backdrop'>
                        <button
                            type='button'
                            onClick={() => setVietQRModal((m) => ({ ...m, show: false }))}
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
