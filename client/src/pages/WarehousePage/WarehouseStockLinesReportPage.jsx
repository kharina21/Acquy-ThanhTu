import { useEffect, useMemo, useState } from 'react';
import { Download, Package, Truck } from 'lucide-react';
import * as XLSX from 'xlsx';
import { getStockInLinesReport, getStockOutLinesReport } from '@/services/inventoryReportService';
import { useBranchStore } from '@/stores/useBranchStore';
import { toast } from 'sonner';

const VARIANTS = {
    in: {
        bannerTitle: 'NHẬP HÀNG',
        pageTitle: 'Báo cáo nhập hàng',
        dateColumn: 'Ngày nhập',
        fetchReport: getStockInLinesReport,
        excelFilePrefix: 'BaoCao_NhapHang',
        Icon: Package,
    },
    out: {
        bannerTitle: 'XUẤT KHO',
        pageTitle: 'Báo cáo xuất kho',
        dateColumn: 'Ngày xuất',
        fetchReport: getStockOutLinesReport,
        excelFilePrefix: 'BaoCao_XuatKho',
        Icon: Truck,
    },
};

const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const firstOfMonthStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

function formatDateVi(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

const formatVND = (n) => {
    if (n == null || Number.isNaN(Number(n))) return '—';
    return new Intl.NumberFormat('vi-VN').format(Number(n));
};

function exportLinesExcel({ variant, rows, fromDate, toDate, locationName }) {
    const v = VARIANTS[variant];
    const headers = [
        'STT',
        v.dateColumn,
        'Mã đơn hàng',
        'Mã sản phẩm',
        'Tên sản phẩm',
        'Số lượng',
        'Đơn giá',
        'Thành tiền',
        'Ghi chú',
    ];
    const body = rows.map((r, i) => [
        i + 1,
        formatDateVi(r.docDate),
        r.orderCode ?? '—',
        r.productSku ?? '—',
        r.productName ?? '—',
        r.quantity ?? 0,
        r.unitPrice ?? 0,
        r.lineTotal ?? 0,
        r.note ?? '',
    ]);
    const aoa = [
        [v.bannerTitle],
        [`Kỳ: ${fromDate} đến ${toDate}`],
        [`Chi nhánh: ${locationName || '—'}`],
        [],
        headers,
        ...body,
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [
        { wch: 5 },
        { wch: 12 },
        { wch: 14 },
        { wch: 14 },
        { wch: 32 },
        { wch: 10 },
        { wch: 14 },
        { wch: 14 },
        { wch: 24 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, v.bannerTitle.slice(0, 31));
    const safe = `${fromDate}_${toDate}`.replace(/[^\d-]/g, '');
    XLSX.writeFile(wb, `${v.excelFilePrefix}_${safe}.xlsx`);
}

export default function WarehouseStockLinesReportPage({ variant }) {
    const v = VARIANTS[variant] || VARIANTS.in;
    const { currentLocationId, locations, loaded: branchLocationsLoaded, fetchLocations } = useBranchStore();
    const [locationId, setLocationId] = useState('');
    const [fromDate, setFromDate] = useState(firstOfMonthStr());
    const [toDate, setToDate] = useState(todayStr());
    const [rows, setRows] = useState([]);
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);

    const locationName = useMemo(
        () => locations.find((l) => String(l._id) === String(locationId))?.name || '',
        [locations, locationId]
    );

    useEffect(() => {
        if (!branchLocationsLoaded) {
            fetchLocations({ scope: 'mine' });
        }
    }, [branchLocationsLoaded, fetchLocations]);

    useEffect(() => {
        if (currentLocationId && !locationId) setLocationId(currentLocationId);
    }, [currentLocationId, locationId]);

    const load = async () => {
        if (!locationId || !fromDate || !toDate) {
            toast.error('Chọn chi nhánh và khoảng ngày');
            return;
        }
        setLoading(true);
        try {
            const res = await v.fetchReport({ locationId, fromDate, toDate });
            if (res.success && res.data) {
                setRows(res.data.rows || []);
                setNote(res.data.note || '');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không tải được báo cáo');
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (!rows.length) {
            toast.error('Chưa có dữ liệu — bấm "Xem báo cáo" trước');
            return;
        }
        try {
            exportLinesExcel({ variant, rows, fromDate, toDate, locationName });
            toast.success('Đã tải file Excel');
        } catch {
            toast.error('Không xuất được Excel');
        }
    };

    const Icon = v.Icon;

    return (
        <div className="flex-1 p-6 bg-base-200 overflow-y-auto">
            <div className="container mx-auto space-y-4 max-w-7xl">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Icon className="w-8 h-8 text-primary" />
                        <div>
                            <h1 className="text-2xl font-bold text-base-content">{v.pageTitle}</h1>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 items-end bg-base-100 p-4 rounded-xl border border-base-200">
                    <div>
                        <label className="label py-0 text-xs">Chi nhánh</label>
                        <select
                            className="select select-bordered select-sm w-56"
                            value={locationId}
                            onChange={(e) => setLocationId(e.target.value)}
                        >
                            <option value="">— Chọn —</option>
                            {locations.map((l) => (
                                <option key={l._id} value={l._id}>
                                    {l.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="label py-0 text-xs">Từ ngày</label>
                        <input
                            type="date"
                            className="input input-bordered input-sm"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="label py-0 text-xs">Đến ngày</label>
                        <input
                            type="date"
                            className="input input-bordered input-sm"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                        />
                    </div>
                    <button type="button" className="btn btn-primary btn-sm" onClick={load} disabled={loading}>
                        {loading ? <span className="loading loading-spinner loading-sm" /> : 'Xem báo cáo'}
                    </button>
                    <button
                        type="button"
                        className="btn btn-outline btn-sm gap-1"
                        onClick={handleExport}
                        disabled={!rows.length}
                    >
                        <Download className="w-4 h-4" />
                        Xuất Excel
                    </button>
                </div>

                {note && (
                    <p className="text-xs text-base-content/65 bg-base-100 border border-base-200 rounded-lg p-3">{note}</p>
                )}

                <div className="rounded-xl border border-base-300 overflow-hidden bg-white shadow-sm">
                    <div className="bg-amber-100 border-b border-amber-200/80 px-4 py-3 text-center">
                        <p className="text-base font-bold text-base-content tracking-wide">{v.bannerTitle}</p>
                        {locationName && (
                            <p className="text-xs text-base-content/75 mt-1">
                                {locationName} · {fromDate} → {toDate}
                            </p>
                        )}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="table table-sm w-full border-collapse">
                            <thead>
                                <tr className="bg-emerald-100 text-base-content">
                                    <th className="border border-base-300 text-center font-semibold text-sm py-2 px-2 w-12">STT</th>
                                    <th className="border border-base-300 text-left font-semibold text-sm py-2 px-2 whitespace-nowrap">
                                        {v.dateColumn}
                                    </th>
                                    <th className="border border-base-300 text-left font-semibold text-sm py-2 px-2">Mã đơn hàng</th>
                                    <th className="border border-base-300 text-left font-semibold text-sm py-2 px-2">Mã sản phẩm</th>
                                    <th className="border border-base-300 text-left font-semibold text-sm py-2 px-2 min-w-[200px]">
                                        Tên sản phẩm
                                    </th>
                                    <th className="border border-base-300 text-right font-semibold text-sm py-2 px-2">Số lượng</th>
                                    <th className="border border-base-300 text-right font-semibold text-sm py-2 px-2">Đơn giá</th>
                                    <th className="border border-base-300 text-right font-semibold text-sm py-2 px-2">Thành tiền</th>
                                    <th className="border border-base-300 text-left font-semibold text-sm py-2 px-2">Ghi chú</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={9}
                                            className="text-center text-base-content/50 py-10 border border-base-200"
                                        >
                                            Chưa có dữ liệu — chọn chi nhánh, kỳ và bấm &quot;Xem báo cáo&quot;
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((r, i) => (
                                        <tr key={`${r.voucherId}-${i}`} className="hover:bg-base-200/40">
                                            <td className="border border-base-200 text-center tabular-nums px-2 py-1.5">{i + 1}</td>
                                            <td className="border border-base-200 whitespace-nowrap px-2 py-1.5">
                                                {formatDateVi(r.docDate)}
                                            </td>
                                            <td className="border border-base-200 font-mono text-xs px-2 py-1.5">{r.orderCode}</td>
                                            <td className="border border-base-200 font-mono text-xs px-2 py-1.5">{r.productSku}</td>
                                            <td className="border border-base-200 px-2 py-1.5">{r.productName}</td>
                                            <td className="border border-base-200 text-right tabular-nums px-2 py-1.5">{r.quantity}</td>
                                            <td className="border border-base-200 text-right tabular-nums px-2 py-1.5">
                                                {formatVND(r.unitPrice)}
                                            </td>
                                            <td className="border border-base-200 text-right font-medium tabular-nums px-2 py-1.5">
                                                {formatVND(r.lineTotal)}
                                            </td>
                                            <td className="border border-base-200 text-xs px-2 py-1.5 max-w-[220px]">
                                                {r.note || '—'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
