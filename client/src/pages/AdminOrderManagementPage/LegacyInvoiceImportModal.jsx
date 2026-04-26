import { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Trash2, FileStack, UserPlus } from 'lucide-react';
import { getProducts } from '@/services/productService';
import { createOrderFromItems } from '@/services/orderService';
import { searchCustomersByPhone, createCustomer, restoreCustomer } from '@/services/customerService';
import CustomerModal from '@/pages/CustomersPage/CustomerModal';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import { toast } from 'sonner';

let lineId = 0;
const nextLineId = () => {
    lineId += 1;
    return `l-${lineId}`;
};

/**
 * Nhập hóa đơn / chứng từ giấy cũ (số hóa) — không chuyển trang, gọi cùng API với POS legacy.
 */
export default function LegacyInvoiceImportModal({ open, onClose, locations, defaultLocationId, onSuccess }) {
    const [locationId, setLocationId] = useState(defaultLocationId || '');
    const [documentDate, setDocumentDate] = useState('');
    const [legacyPaperCode, setLegacyPaperCode] = useState('');
    const [note, setNote] = useState('');
    const [discount, setDiscount] = useState(0);
    const [lines, setLines] = useState(() => [
        { id: nextLineId(), productId: '', name: '', sku: '', quantity: 1, unitPrice: 0 },
    ]);
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [customerQuery, setCustomerQuery] = useState('');
    const [customerSearchResults, setCustomerSearchResults] = useState([]);
    const [searchingCustomer, setSearchingCustomer] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [manualName, setManualName] = useState('');
    const [manualPhone, setManualPhone] = useState('');
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [customerModalSubmitting, setCustomerModalSubmitting] = useState(false);
    const [restoreConfirm, setRestoreConfirm] = useState({ show: false, customerId: null, message: '' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            setLocationId(defaultLocationId || '');
            setDocumentDate('');
            setLegacyPaperCode('');
            setNote('');
            setDiscount(0);
            setLines([{ id: nextLineId(), productId: '', name: '', sku: '', quantity: 1, unitPrice: 0 }]);
            setSearch('');
            setSearchResults([]);
            setCustomerQuery('');
            setCustomerSearchResults([]);
            setSelectedCustomer(null);
            setManualName('');
            setManualPhone('');
            setShowCustomerModal(false);
            setRestoreConfirm({ show: false, customerId: null, message: '' });
        }
    }, [open, defaultLocationId]);

    const searchProducts = useCallback(async (q) => {
        const t = String(q).trim();
        if (!t) {
            setSearchResults([]);
            return;
        }
        setSearching(true);
        try {
            const res = await getProducts({ page: 1, limit: 40, search: t });
            const prods = (res?.data?.products || res?.products || []).filter((p) => !p.isDeleted);
            setSearchResults(prods);
        } catch {
            setSearchResults([]);
        } finally {
            setSearching(false);
        }
    }, []);

    useEffect(() => {
        const tid = setTimeout(() => {
            if (search.trim()) searchProducts(search);
            else setSearchResults([]);
        }, 250);
        return () => clearTimeout(tid);
    }, [search, searchProducts]);

    const searchCustomers = useCallback(async (q) => {
        const t = String(q).trim();
        if (!t) {
            setCustomerSearchResults([]);
            return;
        }
        setSearchingCustomer(true);
        try {
            const res = await searchCustomersByPhone(t);
            const list = res?.data?.customers ?? [];
            setCustomerSearchResults(Array.isArray(list) ? list : []);
        } catch {
            setCustomerSearchResults([]);
        } finally {
            setSearchingCustomer(false);
        }
    }, []);

    useEffect(() => {
        const tid = setTimeout(() => {
            if (customerQuery.trim().length >= 1) searchCustomers(customerQuery);
            else setCustomerSearchResults([]);
        }, 300);
        return () => clearTimeout(tid);
    }, [customerQuery, searchCustomers]);

    const pickCustomer = (c) => {
        if (!c?._id) return;
        setSelectedCustomer({ _id: c._id, name: c.name || '', phone: c.phone || '' });
        setCustomerQuery('');
        setCustomerSearchResults([]);
        setManualName('');
        setManualPhone('');
    };

    const clearSelectedCustomer = () => {
        setSelectedCustomer(null);
    };

    const catalogUnit = (p) => {
        const n = p?.price;
        if (typeof n === 'number' && Number.isFinite(n)) return Math.max(0, n);
        const x = Number(n);
        return Number.isFinite(x) && x >= 0 ? x : 0;
    };

    const addProductLine = (p) => {
        if (!p?._id) return;
        const up = catalogUnit(p);
        setLines((prev) => {
            const id = p._id.toString();
            const i = prev.findIndex((l) => l.productId === id);
            if (i >= 0) {
                const next = [...prev];
                next[i] = { ...next[i], quantity: Math.max(1, (next[i].quantity || 0) + 1) };
                return next;
            }
            if (prev.length === 1 && !prev[0].productId) {
                return [
                    {
                        id: prev[0].id,
                        productId: id,
                        name: p.name || '',
                        sku: p.sku || '',
                        quantity: 1,
                        unitPrice: up,
                    },
                ];
            }
            return [
                ...prev,
                { id: nextLineId(), productId: id, name: p.name || '', sku: p.sku || '', quantity: 1, unitPrice: up },
            ];
        });
        setSearch('');
        setSearchResults([]);
    };

    const updateLineQty = (lineId, qty) => {
        const n = Math.max(1, parseInt(String(qty), 10) || 1);
        setLines((prev) => prev.map((l) => (l.id === lineId ? { ...l, quantity: n } : l)));
    };

    const updateLineUnitPrice = (lineId, value) => {
        const t = String(value).trim();
        if (t === '' || t === '.') {
            setLines((prev) => prev.map((l) => (l.id === lineId ? { ...l, unitPrice: '' } : l)));
            return;
        }
        const n = Math.max(0, Number(t));
        if (Number.isFinite(n)) {
            setLines((prev) => prev.map((l) => (l.id === lineId ? { ...l, unitPrice: n } : l)));
        }
    };

    const removeLine = (lineId) => {
        setLines((prev) => {
            const next = prev.filter((l) => l.id !== lineId);
            return next.length > 0 ? next : [{ id: nextLineId(), productId: '', name: '', sku: '', quantity: 1, unitPrice: 0 }];
        });
    };

    const validLines = useMemo(() => lines.filter((l) => l.productId), [lines]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!locationId) {
            toast.error('Chọn cơ sở / chi nhánh.');
            return;
        }
        if (!documentDate) {
            toast.error('Nhập ngày trên chứng từ.');
            return;
        }
        if (validLines.length === 0) {
            toast.error('Thêm ít nhất một sản phẩm (tìm kiếm và chọn ở trên).');
            return;
        }
        for (const l of validLines) {
            const up = l.unitPrice === '' || l.unitPrice == null ? NaN : Number(l.unitPrice);
            if (!Number.isFinite(up) || up < 0) {
                toast.error('Nhập đơn giá (chưa thuế) theo từng dòng, đúng với hóa đơn giấy tại thời điểm đó.');
                return;
            }
        }
        if (!selectedCustomer) {
            const n = manualName.trim();
            const p = manualPhone.trim();
            if ((n && !p) || (!n && p)) {
                toast.error('Nhập đủ tên và số điện thoại in trên hóa đơn, hoặc tìm khách có sẵn, hoặc bỏ trống cả hai (khách lẻ).');
                return;
            }
        }
        setSubmitting(true);
        try {
            const d = documentDate.trim();
            const payload = {
                items: validLines.map((l) => {
                    const up = Number(l.unitPrice);
                    return { productId: l.productId, quantity: l.quantity, unitPrice: up };
                }),
                locationId,
                paymentMethod: 'cash',
                note: note.trim(),
                discount: Math.max(0, Number(discount) || 0),
                legacyImport: true,
                documentDate: d.length >= 10 ? new Date(`${d.slice(0, 10)}T12:00:00`).toISOString() : d,
                ...(legacyPaperCode.trim() ? { legacyPaperCode: legacyPaperCode.trim() } : {}),
            };
            if (selectedCustomer?._id) {
                payload.customerId = selectedCustomer._id;
            } else if (manualName.trim() && manualPhone.trim()) {
                payload.customerName = manualName.trim();
                payload.customerPhone = manualPhone.trim();
            }
            const res = await createOrderFromItems(payload);
            if (res?.success && res?.data?.order) {
                toast.success(res?.message || 'Đã ghi nhận chứng từ cũ.');
                onSuccess?.();
                onClose();
            } else {
                toast.error(res?.message || 'Không tạo được bản ghi');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lỗi khi ghi nhận');
        } finally {
            setSubmitting(false);
        }
    };

    if (!open) return null;

    return (
        <>
        <dialog className='modal modal-open max-md:px-0'>
            <div className='modal-box w-full max-w-5xl max-h-[min(92vh,960px)] overflow-y-auto p-0'>
                <form onSubmit={handleSubmit} className='p-0'>
                    <div className='sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-base-300 bg-base-100 px-5 sm:px-7 py-3 pr-2 sm:pr-5'>
                        <h2 className='text-lg font-bold flex items-center gap-2'>
                            <FileStack className='w-5 h-5 shrink-0 text-amber-600' />
                            Nhập hóa đơn (chứng từ cũ)
                        </h2>
                        <button
                            type='button'
                            className='btn btn-ghost btn-sm btn-circle'
                            onClick={onClose}
                            aria-label='Đóng'
                        >
                            <X className='w-5 h-5' />
                        </button>
                    </div>
                    <div className='px-5 sm:px-7 py-4 space-y-3 text-sm'>
                        <p className='text-xs text-amber-900 dark:text-amber-100/90 font-medium leading-snug rounded-lg bg-amber-50/90 dark:bg-amber-950/35 border border-amber-200 dark:border-amber-800/60 px-3 py-2'>
                            Lưu ý: ghi nhận <strong>hóa đơn / chứng từ cũ</strong> (theo ngày trên giấy) — bản ghi này{' '}
                            <strong>không trừ tồn kho</strong>.
                        </p>

                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                            <div>
                                <label className='label py-0.5 text-xs font-medium'>Cơ sở *</label>
                                <select
                                    className='select select-bordered select-sm w-full'
                                    value={locationId}
                                    onChange={(e) => setLocationId(e.target.value)}
                                    disabled={locations.length <= 1}
                                    title={locations.length <= 1 ? 'Một cơ sở — theo dữ liệu hệ thống hoặc quyền tài khoản' : undefined}
                                    required
                                >
                                    <option value=''>-- Chọn --</option>
                                    {locations.map((loc) => (
                                        <option key={loc._id} value={loc._id}>
                                            {loc.name || loc.code}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className='label py-0.5 text-xs font-medium'>Ngày trên chứng từ *</label>
                                <input
                                    type='date'
                                    className='input input-bordered input-sm w-full'
                                    max={new Date().toISOString().slice(0, 10)}
                                    value={documentDate}
                                    onChange={(e) => setDocumentDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div className='sm:col-span-2'>
                                <label className='label py-0.5 text-xs font-medium'>Số trên hóa đơn (tuỳ chọn)</label>
                                <input
                                    type='text'
                                    className='input input-bordered input-sm w-full'
                                    maxLength={64}
                                    placeholder='VD: HD 0123/2024'
                                    value={legacyPaperCode}
                                    onChange={(e) => setLegacyPaperCode(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className='space-y-2'>
                            <div className='flex flex-wrap items-center justify-between gap-2'>
                                <p className='text-xs font-medium text-base-content'>Khách hàng</p>
                                <button
                                    type='button'
                                    className='btn btn-ghost btn-xs gap-1'
                                    onClick={() => setShowCustomerModal(true)}
                                >
                                    <UserPlus className='w-3.5 h-3.5' />
                                    Thêm khách mới
                                </button>
                            </div>
                            {selectedCustomer ? (
                                <div className='flex flex-wrap items-center gap-2 rounded-lg border border-base-300 bg-base-200/40 px-3 py-2'>
                                    <span className='text-xs'>
                                        <span className='font-medium'>{selectedCustomer.name || '—'}</span>
                                        {selectedCustomer.phone && (
                                            <span className='ml-1.5 text-base-content/70'>{selectedCustomer.phone}</span>
                                        )}
                                    </span>
                                    <button
                                        type='button'
                                        className='btn btn-ghost btn-xs ml-auto'
                                        onClick={clearSelectedCustomer}
                                    >
                                        Bỏ chọn
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className='relative'>
                                        <input
                                            type='text'
                                            className='input input-bordered input-sm w-full'
                                            placeholder='Tìm theo tên hoặc SĐT (khách đã lưu)...'
                                            value={customerQuery}
                                            onChange={(e) => setCustomerQuery(e.target.value)}
                                        />
                                        {customerQuery.trim() && (
                                            <ul className='menu z-40 absolute top-full left-0 right-0 mt-0.5 max-h-40 overflow-y-auto bg-base-100 border border-base-300 rounded-box shadow-lg p-0'>
                                                {searchingCustomer && (
                                                    <li className='p-2 text-xs opacity-60'>
                                                        <span className='loading loading-spinner loading-xs' /> Đang tìm…
                                                    </li>
                                                )}
                                                {!searchingCustomer && customerSearchResults.length === 0 && (
                                                    <li className='p-2 text-xs opacity-60'>Không thấy khách</li>
                                                )}
                                                {!searchingCustomer &&
                                                    customerSearchResults.map((c) => (
                                                        <li key={c._id}>
                                                            <button
                                                                type='button'
                                                                className='w-full text-left text-xs'
                                                                onClick={() => pickCustomer(c)}
                                                            >
                                                                <span className='font-medium'>{c.name}</span>
                                                                {c.phone && (
                                                                    <span className='ml-2 text-base-content/60'>{c.phone}</span>
                                                                )}
                                                            </button>
                                                        </li>
                                                    ))}
                                            </ul>
                                        )}
                                    </div>
                                    <p className='text-[11px] text-base-content/60'>
                                        Hoặc ghi theo hóa đơn (tạo/ghi nhận khách khi cần):
                                    </p>
                                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                                        <div>
                                            <label className='label py-0.5 text-[11px]'>Họ tên (theo hóa đơn)</label>
                                            <input
                                                type='text'
                                                className='input input-bordered input-sm w-full'
                                                placeholder='VD: Nguyễn Văn A'
                                                value={manualName}
                                                onChange={(e) => {
                                                    setManualName(e.target.value);
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label className='label py-0.5 text-[11px]'>Số điện thoại</label>
                                            <input
                                                type='text'
                                                className='input input-bordered input-sm w-full'
                                                inputMode='tel'
                                                placeholder='0xxx…'
                                                value={manualPhone}
                                                onChange={(e) => {
                                                    setManualPhone(e.target.value);
                                                }}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div>
                            <label className='label py-0.5 text-xs font-medium'>Tìm sản phẩm, chọn để thêm dòng</label>
                            <div className='relative'>
                                <input
                                    type='text'
                                    className='input input-bordered input-sm w-full'
                                    placeholder='Tên / SKU / mã vạch...'
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                                {search.trim() && (
                                    <ul className='menu z-50 absolute top-full left-0 right-0 mt-0.5 max-h-48 overflow-y-auto bg-base-100 border border-base-300 rounded-box shadow-lg p-0'>
                                        {searching && (
                                            <li className='p-2 text-xs opacity-60'>
                                                <span className='loading loading-spinner loading-xs' /> Đang tìm…
                                            </li>
                                        )}
                                        {!searching &&
                                            searchResults.length === 0 && (
                                                <li className='p-2 text-xs opacity-60'>Không có sản phẩm</li>
                                            )}
                                        {!searching &&
                                            searchResults.map((p) => (
                                                <li key={p._id}>
                                                    <button
                                                        type='button'
                                                        className='w-full text-left'
                                                        onClick={() => addProductLine(p)}
                                                    >
                                                        <span className='font-mono text-[11px] opacity-70'>{p.sku}</span>{' '}
                                                        {p.name}
                                                    </button>
                                                </li>
                                            ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        <div>
                            <div className='flex flex-col gap-0.5 py-0.5 sm:flex-row sm:items-end sm:justify-between'>
                                <span className='text-xs font-medium'>Dòng hàng</span>
                                <span className='text-[11px] text-base-content/60 max-w-2xl'>
                                    Đơn giá: <strong>chưa thuế</strong>, ghi theo hóa đơn giấy tại thời điểm đó (có thể khác giá
                                    danh mục hiện tại).
                                </span>
                            </div>
                            <div className='border border-base-300 rounded-lg overflow-x-auto'>
                                <table className='table table-sm min-w-[520px]'>
                                    <thead>
                                        <tr className='bg-base-200/60'>
                                            <th className='min-w-32'>Sản phẩm</th>
                                            <th className='whitespace-nowrap w-28'>Đơn giá (đ) *</th>
                                            <th className='w-20'>SL</th>
                                            <th className='w-10' />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lines
                                            .filter((l) => l.productId)
                                            .map((l) => (
                                                <tr key={l.id}>
                                                    <td>
                                                        <div className='text-xs font-medium'>{l.name || '—'}</div>
                                                        {l.sku && (
                                                            <div className='text-[10px] font-mono text-base-content/50'>
                                                                {l.sku}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <input
                                                            type='number'
                                                            min={0}
                                                            step='any'
                                                            className='input input-bordered input-xs w-full max-w-30'
                                                            placeholder='0'
                                                            value={l.unitPrice === '' ? '' : l.unitPrice}
                                                            onChange={(e) => updateLineUnitPrice(l.id, e.target.value)}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type='number'
                                                            min={1}
                                                            className='input input-bordered input-xs w-20'
                                                            value={l.quantity}
                                                            onChange={(e) => updateLineQty(l.id, e.target.value)}
                                                        />
                                                    </td>
                                                    <td>
                                                        <button
                                                            type='button'
                                                            className='btn btn-ghost btn-xs btn-square'
                                                            onClick={() => removeLine(l.id)}
                                                            title='Xóa dòng'
                                                        >
                                                            <Trash2 className='w-4 h-4' />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        {validLines.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className='text-center text-xs text-base-content/50 py-3'>
                                                    Chưa có dòng — tìm và chọn sản phẩm ở ô phía trên
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div>
                            <label className='label py-0.5 text-xs font-medium'>Ghi chú</label>
                            <input
                                type='text'
                                className='input input-bordered input-sm w-full'
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                            />
                        </div>
                        <div className='max-w-sm md:max-w-md'>
                            <label className='label py-0.5 text-xs font-medium'>Giảm giá (đ)</label>
                            <input
                                type='number'
                                min={0}
                                className='input input-bordered input-sm w-full'
                                value={discount || ''}
                                onChange={(e) => setDiscount(e.target.value ? Number(e.target.value) : 0)}
                            />
                        </div>
                    </div>
                    <div className='sticky bottom-0 flex flex-wrap items-center justify-end gap-2 border-t border-base-300 bg-base-200/30 px-5 sm:px-7 py-3'>
                        <button type='button' className='btn btn-ghost' onClick={onClose} disabled={submitting}>
                            Hủy
                        </button>
                        <button type='submit' className='btn btn-primary' disabled={submitting}>
                            {submitting ? (
                                <>
                                    <span className='loading loading-spinner loading-sm' />
                                    Đang ghi…
                                </>
                            ) : (
                                'Ghi nhận'
                            )}
                        </button>
                    </div>
                </form>
            </div>
            <div className='modal-backdrop bg-black/40' onClick={onClose} onKeyDown={(e) => e.key === 'Escape' && onClose()} role='presentation' />
        </dialog>

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
                            const c = res.data.customer;
                            setSelectedCustomer({ _id: c._id, name: c.name || '', phone: c.phone || '' });
                            setCustomerQuery('');
                            setCustomerSearchResults([]);
                            setManualName('');
                            setManualPhone('');
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

        {restoreConfirm.show && (
            <ConfirmationModal
                isOpen={restoreConfirm.show}
                onClose={() => setRestoreConfirm({ show: false, customerId: null, message: '' })}
                onConfirm={async () => {
                    try {
                        const res = await restoreCustomer(restoreConfirm.customerId);
                        if (res.success && res.data?.customer) {
                            const c = res.data.customer;
                            setSelectedCustomer({ _id: c._id, name: c.name || '', phone: c.phone || '' });
                            setCustomerQuery('');
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
        </>
    );
}
