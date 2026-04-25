import { getOrderById } from '@/services/orderService';
import { getStoreSettings } from '@/services/storeSettingsService';
import { moneyToVietnameseWords } from '@/lib/moneyToVietnameseWords';

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

function lineGrossFromExVatPos(unitPrice, qty, vatPct) {
    const net = Math.round(Number(unitPrice) * Number(qty));
    const v = clampInvoiceVat(vatPct);
    const vat = Math.round((net * v) / 100);
    return { net, vat, gross: net + vat };
}

/**
 * In lại hóa đơn GTGT (A4) từ đơn đã lưu — dùng tab danh sách hóa đơn / chi tiết.
 */
export async function printVatInvoiceForOrderId(orderId) {
    if (!orderId) {
        throw new Error('Thiếu mã đơn');
    }
    const [orderRes, stRes] = await Promise.all([getOrderById(orderId), getStoreSettings()]);
    const order = orderRes?.data?.order ?? orderRes?.order;
    if (!order) {
        throw new Error('Không tìm thấy đơn hàng');
    }

    let vatPct = Number(stRes?.data?.defaultVatPercent);
    if (Number.isNaN(vatPct)) vatPct = 10;
    vatPct = Math.max(0, Math.min(100, vatPct));
    const taxCodePrint = stRes?.data?.taxCode != null ? String(stRes.data.taxCode) : '';

    const orderCode = String(order.code || orderId);
    const totalPrint = Number(order.totalAmount) || 0;
    const orderDiscount = order.discount != null ? Math.max(0, Number(order.discount)) : null;
    const printItems = (order.items || []).map((it) => {
        const p = it.product;
        return {
            name: p?.name || '—',
            price: Number(it.price) || 0,
            quantity: Number(it.quantity) || 0,
            unit: (it.unit && String(it.unit).trim()) || 'Cái',
            vatPercent: it.vatPercent,
            vatAmount: it.vatAmount,
            lineTotal: it.total,
        };
    });
    if (printItems.length === 0) {
        throw new Error('Đơn không có dòng sản phẩm');
    }

    let sumNetP = 0;
    let sumVatP = 0;
    let sumGrossP = 0;
    const lineRows = printItems
        .map((row, idx) => {
            const name = escapeHtml(row.name || '');
            const u = escapeHtml(row.unit || 'Cái');
            const qty = row.quantity;
            const price = row.price;
            const net = Math.round(price * qty);
            const r = row.vatPercent != null ? clampInvoiceVat(row.vatPercent) : vatPct;
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
    const discountPrint = orderDiscount != null ? orderDiscount : Math.max(0, subtotalPrint - totalPrint);
    const truocThue = sumNetP;
    const tienThueTong = sumVatP;

    const loc = order.location && typeof order.location === 'object' ? order.location : {};
    const locName = escapeHtml(loc.name || '—');
    const locAddr = escapeHtml(String(loc.address || '').trim() || '—');
    const locPhone = escapeHtml(String(loc.phone || '').trim() || '—');
    const taxCodeHtml = taxCodePrint ? escapeHtml(taxCodePrint) : '—';
    const now = escapeHtml(new Date().toLocaleString('vi-VN'));

    const cp = order.customerProfile;
    let customerLine = 'Khách lẻ / vãng lai';
    if (cp && typeof cp === 'object') {
        customerLine = `${escapeHtml(cp.name || '')}${cp.phone ? ` — ${escapeHtml(cp.phone)}` : ''}`;
    } else if (order.customer && typeof order.customer === 'object') {
        const c = order.customer;
        const n = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.username || c.email || '';
        if (n) customerLine = escapeHtml(n);
    }

    const seller = order.createdBy;
    const sellerLine = seller
        ? escapeHtml(
              [seller.firstName, seller.lastName].filter(Boolean).join(' ') || seller.username || '—',
          )
        : '—';

    const noteLine = order.note?.trim() ? escapeHtml(String(order.note).trim()) : '';
    const byWords = escapeHtml(moneyToVietnameseWords(Math.round(totalPrint)));

    const payMethod =
        order.paymentMethod === 'cash'
            ? 'TM'
            : order.paymentMethod === 'transfer' || order.paymentMethod === 'vietqr'
              ? 'CK / VietQR'
              : String(order.paymentMethod || '—');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Hóa đơn GTGT ${escapeHtml(
        orderCode,
    )}</title>
<style>
  @page { size: A4 portrait; margin: 10mm; }
  * { box-sizing: border-box; }
  body { font-family: "Times New Roman", Times, serif; font-size: 11pt; color: #000; margin: 0; }
  h1 { text-align: center; font-size: 14pt; margin: 0 0 8px; font-weight: 700; }
  .sub { text-align: center; font-size: 10pt; margin-bottom: 10px; }
  .box { width: 100%; border: 1px solid #000; border-collapse: collapse; margin: 6px 0; }
  .box td { border: 1px solid #000; padding: 4px 6px; vertical-align: top; }
  .items { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  .items th, .items td { border: 1px solid #000; padding: 3px 4px; }
  .items th { background: #eee; font-weight: 600; }
  .sum { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10pt; }
  .sum td, .sum th { border: 1px solid #000; padding: 5px 6px; }
  .num { text-align: right; }
  .ft { text-align: center; margin-top: 16px; font-size: 9pt; }
</style></head><body>
  <h1>HÓA ĐƠN GIÁ TRỊ GIA TĂNG (BẢN IN LẠI)</h1>
  <p class="sub">(Đơn giá chưa thuế; mặc định ${vatPct}% từ cửa hàng nếu mặt hàng không đặt thuế suất; thành tiền dòng gồm thuế khi áp dụng)</p>
  <table class="box">
    <tr>
      <td class="l" style="width:50%"><strong>Đơn vị bán:</strong> ${locName}<br/>
        <strong>Địa chỉ:</strong> ${locAddr}<br/>
        <strong>Điện thoại:</strong> ${locPhone}<br/>
        <strong>Mã số thuế (MST):</strong> ${taxCodeHtml}
      </td>
      <td class="l" style="width:50%"><strong>Số chứng từ / mã đơn:</strong> ${escapeHtml(orderCode)}<br/>
        <strong>Loại đơn:</strong> ${escapeHtml(order.channel === 'online' ? 'Bán online' : 'Bán tại quầy')}<br/>
        <strong>Ngày in:</strong> ${now}<br/>
        <strong>Tên người mua:</strong> ${customerLine}<br/>
        <strong>Nhân viên bán:</strong> ${sellerLine}<br/>
        <strong>Hình thức thanh toán:</strong> ${escapeHtml(payMethod)}${
            noteLine ? `<br/><strong>Ghi chú:</strong> ${noteLine}` : ''
        }
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
  <p class="word" style="font-style:italic;margin-top:8px;font-size:10pt">Số tiền viết bằng chữ: ${byWords}</p>
  <p class="ft">Cảm ơn quý khách</p>
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
}
