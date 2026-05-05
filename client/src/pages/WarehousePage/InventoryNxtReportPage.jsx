import { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { getNxtReport } from '@/services/inventoryReportService';
import { getLocations } from '@/services/locationService';
import { useBranchStore } from '@/stores/useBranchStore';
import { nxtPeriodInbound, nxtPeriodOutbound, formatNxtQtyCell } from '@/utils/nxtReportDisplay';
import { toast } from 'sonner';

const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const firstOfMonthStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

function exportNxtExcel({ rows, fromDate, toDate, locationName }) {
    const title = 'Báo cáo xuất nhập tồn';
    const period = `Kỳ: ${fromDate} đến ${toDate}`;
    const branch = `Chi nhánh: ${locationName || '—'}`;
    const headers = ['Mã hàng', 'Tên hàng', 'Tồn đầu kỳ', 'Nhập trong kỳ', 'Xuất trong kỳ', 'Tồn cuối kỳ'];

    const body = rows.map((r) => {
        const nhap = nxtPeriodInbound(r);
        const xuat = nxtPeriodOutbound(r);
        return [r.sku || '—', r.name || '—', r.openingQty ?? 0, nhap, xuat, r.closingQty ?? 0];
    });

    const aoa = [[title], [period], [branch], [], headers, ...body];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 14 }, { wch: 36 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'NXT');
    const safe = `${fromDate}_${toDate}`.replace(/[^\d-]/g, '');
    XLSX.writeFile(wb, `BaoCao_NXT_${safe}.xlsx`);
}

export default function InventoryNxtReportPage() {
    const currentLocationId = useBranchStore((s) => s.currentLocationId);
    const [locations, setLocations] = useState([]);
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
        getLocations().then((res) => {
            if (res.success && res.data?.locations) {
                const list = (res.data.locations || []).filter((l) => l.isActive !== false);
                setLocations(list);
            }
        });
    }, []);

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
            const res = await getNxtReport({ locationId, fromDate, toDate });
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
            exportNxtExcel({ rows, fromDate, toDate, locationName });
            toast.success('Đã tải file Excel');
        } catch (e) {
            toast.error('Không xuất được Excel');
        }
    };

    return (
        <div className="flex-1 p-6 bg-base-200 overflow-y-auto">
            <div className="container mx-auto space-y-4 max-w-6xl">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-8 h-8 text-primary" />
                        <div>
                            <h1 className="text-2xl font-bold text-base-content">Báo cáo xuất nhập tồn</h1>
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
                    <div className="bg-emerald-100 border-b border-emerald-200 px-4 py-2 text-center">
                        <p className="text-sm font-bold text-blue-800 tracking-wide">BÁO CÁO XUẤT NHẬP TỒN</p>
                        {locationName && (
                            <p className="text-xs text-blue-900/80 mt-0.5">
                                {locationName} · {fromDate} → {toDate}
                            </p>
                        )}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="table table-sm w-full border-collapse">
                            <thead>
                                <tr className="bg-emerald-100 text-blue-800">
                                    <th className="border border-base-300 text-left font-semibold text-sm py-2 px-3">Mã hàng</th>
                                    <th className="border border-base-300 text-left font-semibold text-sm py-2 px-3">Tên hàng</th>
                                    <th className="border border-base-300 text-right font-semibold text-sm py-2 px-3">
                                        Tồn đầu kỳ
                                    </th>
                                    <th className="border border-base-300 text-right font-semibold text-sm py-2 px-3">
                                        Nhập trong kỳ
                                    </th>
                                    <th className="border border-base-300 text-right font-semibold text-sm py-2 px-3">
                                        Xuất trong kỳ
                                    </th>
                                    <th className="border border-base-300 text-right font-semibold text-sm py-2 px-3">
                                        Tồn cuối kỳ
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center text-base-content/50 py-10 border border-base-200">
                                            Chưa có dữ liệu — chọn chi nhánh, kỳ và bấm &quot;Xem báo cáo&quot;
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((r) => {
                                        const nhapKy = nxtPeriodInbound(r);
                                        const xuatKy = nxtPeriodOutbound(r);
                                        return (
                                            <tr key={r.productId} className="hover:bg-base-200/40">
                                                <td className="border border-base-200 font-mono text-xs px-3 py-2 align-top">
                                                    {r.sku}
                                                </td>
                                                <td className="border border-base-200 px-3 py-2 align-top">{r.name}</td>
                                                <td className="border border-base-200 text-right tabular-nums px-3 py-2">
                                                    {r.openingQty}
                                                </td>
                                                <td className="border border-base-200 text-right tabular-nums px-3 py-2 text-success">
                                                    {formatNxtQtyCell(nhapKy)}
                                                </td>
                                                <td className="border border-base-200 text-right tabular-nums px-3 py-2 text-error">
                                                    {formatNxtQtyCell(xuatKy)}
                                                </td>
                                                <td className="border border-base-200 text-right font-medium tabular-nums px-3 py-2">
                                                    {r.closingQty}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-[11px] text-base-content/55 px-4 py-2 bg-base-100 border-t border-base-200">
                        Nhập trong kỳ = nhập kho + phần lệch kiểm kho tăng. Xuất trong kỳ = xuất phiếu + trả NCC + phần
                        lệch kiểm kho giảm. Tồn cuối là số lượng thực tế trên kho (không gồm giữ chỗ online).
                    </p>
                </div>
            </div>
        </div>
    );
}
