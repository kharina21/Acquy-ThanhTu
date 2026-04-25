import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Building2, MapPin, Plus, Pencil, Phone, Mail, Trash2, Globe, ListTree, Percent } from 'lucide-react';
import { toast } from 'sonner';
import {
    getLocations,
    createLocation,
    updateLocation,
    deleteLocation,
    getOnlineLocation,
    setOnlineLocation,
} from '@/services/locationService';
import { getStoreSettings, updateStoreSettings } from '@/services/storeSettingsService';
import { useBranchStore } from '@/stores/useBranchStore';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import BranchModal from './BranchModal';
import BankAccountSection from './BankAccountSection';

const StoreProfilePage = () => {
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingBranch, setEditingBranch] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
        variant: 'warning',
    });
    const [onlineLocationId, setOnlineLocationId] = useState('');
    const [settingOnline, setSettingOnline] = useState(false);

    const [defaultVatPercent, setDefaultVatPercent] = useState(10);
    const [vatDraft, setVatDraft] = useState('10');
    const [taxCodeDraft, setTaxCodeDraft] = useState('');
    const [loadingVat, setLoadingVat] = useState(true);
    const [savingVat, setSavingVat] = useState(false);

    const fetchLocations = async () => {
        setLoading(true);
        try {
            const res = await getLocations();
            if (res.success) {
                setLocations(res.data.locations || []);
            }
        } catch (error) {
            console.error('Error fetching locations:', error);
            toast.error('Lỗi khi tải danh sách chi nhánh');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLocations();
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoadingVat(true);
            try {
                const res = await getStoreSettings();
                const p = res?.data?.defaultVatPercent;
                if (!cancelled) {
                    if (p != null && !Number.isNaN(Number(p))) {
                        setDefaultVatPercent(Number(p));
                        setVatDraft(String(p));
                    }
                    const tc = res?.data?.taxCode;
                    if (tc != null) setTaxCodeDraft(String(tc));
                }
            } catch {
                if (!cancelled) toast.error('Không tải được cài đặt thuế');
            } finally {
                if (!cancelled) setLoadingVat(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await getOnlineLocation();
                const loc = res?.data?.location;
                const resolvedAs = res?.data?.resolvedAs;
                setOnlineLocationId(resolvedAs === 'configured' && loc?._id ? loc._id : '');
            } catch {
                setOnlineLocationId('');
            }
        };
        if (locations.length > 0) load();
    }, [locations]);

    const handleCreate = () => {
        setEditingBranch(null);
        setShowModal(true);
    };

    const handleEdit = (branch) => {
        setEditingBranch(branch);
        setShowModal(true);
    };

    const handleDelete = (branch) => {
        if (locations.length <= 1) {
            toast.error('Cần có ít nhất một chi nhánh trong hệ thống. Không thể xóa chi nhánh cuối cùng.');
            return;
        }
        setConfirmModal({
            isOpen: true,
            title: 'Xóa chi nhánh',
            message: `Bạn có chắc chắn muốn xóa chi nhánh "${branch.name}" (${branch.code})?`,
            variant: 'warning',
            onConfirm: async () => {
                try {
                    const res = await deleteLocation(branch._id);
                    if (res.success) {
                        toast.success('Xóa chi nhánh thành công');
                        fetchLocations();
                        useBranchStore.getState().fetchLocations();
                    }
                } catch (error) {
                    toast.error(error.response?.data?.message || 'Lỗi khi xóa chi nhánh');
                }
            },
        });
    };

    const handleSubmit = async (formData) => {
        setSubmitting(true);
        try {
            if (editingBranch) {
                const res = await updateLocation(editingBranch._id, formData);
                if (res.success) {
                    toast.success('Cập nhật chi nhánh thành công');
                    setShowModal(false);
                    fetchLocations();
                    useBranchStore.getState().fetchLocations();
                }
            } else {
                const res = await createLocation(formData);
                if (res.success) {
                    toast.success('Tạo chi nhánh thành công');
                    setShowModal(false);
                    fetchLocations();
                    useBranchStore.getState().fetchLocations();
                }
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi lưu chi nhánh');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSaveVat = async (e) => {
        e?.preventDefault?.();
        const n = Number(String(vatDraft).replace(',', '.'));
        if (Number.isNaN(n) || n < 0 || n > 100) {
            toast.error('Nhập % VAT từ 0 đến 100');
            return;
        }
        setSavingVat(true);
        try {
            const res = await updateStoreSettings({
                defaultVatPercent: n,
                taxCode: taxCodeDraft.trim(),
            });
            if (res.success) {
                const p = res.data?.defaultVatPercent ?? n;
                setDefaultVatPercent(p);
                setVatDraft(String(p));
                if (res.data?.taxCode != null) setTaxCodeDraft(String(res.data.taxCode));
                toast.success(res.message || 'Đã lưu cài đặt thuế');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lỗi khi lưu cài đặt thuế');
        } finally {
            setSavingVat(false);
        }
    };

    const tocItems = [
        { id: 'store-section-branches', label: 'Quản lý chi nhánh' },
        ...(locations.length > 0 ? [{ id: 'store-section-online', label: 'Bán online' }] : []),
        { id: 'store-section-vat', label: 'Cài đặt thuế (VAT)' },
        { id: 'store-section-bank', label: 'Tài khoản ngân hàng (VietQR)' },
    ];

    return (
        <div className="flex-1 p-6 bg-base-200 overflow-y-auto">
            <div className="container mx-auto max-w-6xl">
                <h1 className="text-2xl font-bold text-base-content mb-6 flex items-center gap-2">
                    <Building2 className="w-8 h-8 text-primary" />
                    Hồ sơ cửa hàng
                </h1>

                <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
                    {/* Mục lục — cột trái (dính khi cuộn trên desktop) */}
                    <nav
                        className="w-full lg:max-w-[16.5rem] lg:shrink-0 lg:sticky lg:top-4 lg:z-10 bg-base-100 rounded-lg shadow border border-base-300 p-4"
                        aria-label="Mục lục trang hồ sơ cửa hàng"
                    >
                        <div className="flex items-center gap-2 text-sm font-semibold text-base-content/80 mb-3 pb-2 border-b border-base-200">
                            <ListTree className="w-4 h-4 text-primary shrink-0" />
                            Nội dung trang
                        </div>
                        <ol className="flex flex-col gap-0.5 text-sm">
                            {tocItems.map((item, i) => (
                                <li key={item.id}>
                                    <a
                                        href={`#${item.id}`}
                                        className="flex items-start gap-2 rounded-md px-2 py-2 -mx-1 text-left text-primary hover:bg-primary/10 no-underline transition-colors"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                        }}
                                    >
                                        <span className="text-base-content/45 tabular-nums w-4 shrink-0 pt-0.5">{i + 1}.</span>
                                        <span className="leading-snug font-medium">{item.label}</span>
                                    </a>
                                </li>
                            ))}
                        </ol>
                    </nav>

                    <div className="min-w-0 flex-1 space-y-6 w-full">
                {/* Quản lý chi nhánh */}
                <section id="store-section-branches" className="bg-base-100 rounded-lg shadow p-6 scroll-mt-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-primary" />
                            Quản lý chi nhánh
                        </h2>
                        <button onClick={handleCreate} className="btn btn-primary btn-sm gap-2">
                            <Plus className="w-4 h-4" />
                            Thêm chi nhánh
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <span className="loading loading-spinner loading-lg" />
                        </div>
                    ) : locations.length === 0 ? (
                        <div className="text-center py-12 text-base-content/60">
                            <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>Chưa có chi nhánh nào. Nhấn "Thêm chi nhánh" để tạo.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table table-sm">
                                <thead>
                                    <tr>
                                        <th className="font-medium">Mã</th>
                                        <th className="font-medium">Tên</th>
                                        <th className="font-medium">Địa chỉ</th>
                                        <th className="font-medium">Điện thoại</th>
                                        <th className="font-medium">Email</th>
                                        <th className="font-medium">Trạng thái</th>
                                        <th className="font-medium text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {locations.map((loc) => (
                                        <tr key={loc._id}>
                                            <td className="font-mono font-medium">{loc.code}</td>
                                            <td>{loc.name}</td>
                                            <td className="max-w-[200px] truncate" title={loc.address}>
                                                {loc.address || '—'}
                                            </td>
                                            <td>
                                                {loc.phone ? (
                                                    <span className="inline-flex items-center gap-1">
                                                        <Phone className="w-3.5 h-3.5 text-base-content/50 shrink-0" />
                                                        {loc.phone}
                                                    </span>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                            <td>
                                                {loc.email ? (
                                                    <span className="inline-flex items-center gap-1">
                                                        <Mail className="w-3.5 h-3.5 text-base-content/50 shrink-0" />
                                                        {loc.email}
                                                    </span>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                            <td>
                                                <span
                                                    className={`badge badge-sm ${loc.isActive ? 'badge-success' : 'badge-ghost'}`}
                                                >
                                                    {loc.isActive ? 'Hoạt động' : 'Tạm ngưng'}
                                                </span>
                                            </td>
                                            <td className="text-right">
                                                <div className="flex gap-1 justify-end">
                                                    <button
                                                        type="button"
                                                        className="btn btn-ghost btn-xs"
                                                        onClick={() => handleEdit(loc)}
                                                        title="Chỉnh sửa"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-ghost btn-xs text-error"
                                                        onClick={() => handleDelete(loc)}
                                                        title="Xóa"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {/* Bán online - chọn chi nhánh nhận đơn online */}
                {locations.length > 0 && (
                    <section id="store-section-online" className="bg-base-100 rounded-lg shadow p-6 scroll-mt-6">
                        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                            <Globe className="w-5 h-5 text-primary" />
                            Bán online
                        </h2>
                        <p className="text-sm text-base-content/60 mb-4">
                            Chọn một chi nhánh nhận đơn đặt hàng online và tính tồn kho cho website.
                        </p>
                        <div className="max-w-md">
                            <label className="label py-0 text-xs">Chi nhánh nhận đơn online</label>
                            <select
                                className="select select-bordered select-sm w-full"
                                value={onlineLocationId}
                                onChange={async (e) => {
                                    const id = e.target.value;
                                    if (!id) return;
                                    setSettingOnline(true);
                                    try {
                                        const res = await setOnlineLocation(id);
                                        if (res.success) {
                                            setOnlineLocationId(id);
                                            toast.success(res.message || 'Đã cập nhật chi nhánh bán online');
                                            useBranchStore.getState().fetchLocations();
                                        }
                                    } catch (err) {
                                        toast.error(err.response?.data?.message || 'Lỗi khi cập nhật');
                                    } finally {
                                        setSettingOnline(false);
                                    }
                                }}
                                disabled={settingOnline}
                            >
                                <option value="">— Chọn chi nhánh —</option>
                                {locations.filter((l) => l.isActive !== false).map((loc) => (
                                    <option key={loc._id} value={loc._id}>
                                        {loc.code} - {loc.name}
                                    </option>
                                ))}
                            </select>
                            {settingOnline && <span className="loading loading-spinner loading-xs ml-2" />}
                        </div>
                    </section>
                )}

                {/* Cài đặt VAT mặc định */}
                <section id="store-section-vat" className="bg-base-100 rounded-lg shadow p-6 scroll-mt-6">
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                        <Percent className="w-5 h-5 text-primary" />
                        Cài đặt thuế (VAT)
                    </h2>
                    {loadingVat ? (
                        <div className="py-4">
                            <span className="loading loading-spinner loading-md" />
                        </div>
                    ) : (
                        <form onSubmit={handleSaveVat} className="max-w-sm space-y-3">
                            <div>
                                <label className="label py-0" htmlFor="store-tax-code">
                                    <span className="label-text text-sm font-medium">Mã số thuế (MST) người bán</span>
                                </label>
                                <input
                                    id="store-tax-code"
                                    type="text"
                                    className="input input-bordered input-sm w-full max-w-sm"
                                    placeholder="Ví dụ: 0109466751"
                                    value={taxCodeDraft}
                                    onChange={(e) => setTaxCodeDraft(e.target.value)}
                                    maxLength={20}
                                    autoComplete="off"
                                />
                                <p className="text-xs text-base-content/50 mt-1">Hiển thị trên bản in hóa đơn GTGT.</p>
                            </div>
                            <div>
                                <label className="label py-0" htmlFor="default-vat-percent">
                                    <span className="label-text text-sm font-medium">VAT mặc định (%)</span>
                                </label>
                                <div className="join w-full max-w-xs">
                                    <input
                                        id="default-vat-percent"
                                        type="number"
                                        name="defaultVatPercent"
                                        className="input input-bordered input-sm join-item w-full min-w-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        min={0}
                                        max={100}
                                        step={0.1}
                                        value={vatDraft}
                                        onChange={(e) => setVatDraft(e.target.value)}
                                        autoComplete="off"
                                    />
                                    <span className="btn btn-outline btn-sm join-item no-animation pointer-events-none">%</span>
                                </div>
                                <p className="text-xs text-base-content/50 mt-1.5">
                                    Gợi ý tại VN: thường 8% hoặc 10% tùy nhóm hàng. Hiện lưu: <strong>{defaultVatPercent}%</strong>
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <button type="submit" className="btn btn-primary btn-sm" disabled={savingVat}>
                                    {savingVat ? (
                                        <span className="loading loading-spinner loading-xs" />
                                    ) : null}
                                    Lưu cài đặt thuế
                                </button>
                                <Link
                                    to="/admin/products"
                                    className="text-sm link link-primary link-hover"
                                >
                                    Cấu hình % VAT theo từng sản phẩm
                                </Link>
                            </div>
                        </form>
                    )}
                </section>

                <BankAccountSection locations={locations} loading={loading} />
                    </div>
                </div>
            </div>

            {showModal && (
                <BranchModal
                    branch={editingBranch}
                    onClose={() => {
                        setShowModal(false);
                        setEditingBranch(null);
                    }}
                    onSubmit={handleSubmit}
                    submitting={submitting}
                />
            )}

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                variant={confirmModal.variant}
                onClose={() => setConfirmModal((p) => ({ ...p, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal((p) => ({ ...p, isOpen: false }))}
            />
        </div>
    );
};

export default StoreProfilePage;
