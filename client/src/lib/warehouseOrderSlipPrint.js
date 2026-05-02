/**
 * In phiếu soạn hàng / nhãn đơn cho nhân viên kho (A4 hoặc máy nhiệt nhỏ — @page có thể chỉnh).
 */

function escapeHtml(s) {
    if (s == null || s === '') return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function channelLabel(order) {
    if (order?.channel === 'in_store') return 'Tại quầy';
    return 'Online (web)';
}

function shippingAddress(order) {
    if (!order) return '';
    const parts = [order.addressLine, order.wardName, order.districtName, order.provinceName].filter(Boolean);
    if (parts.length) return parts.join(', ');
    return String(order.shippingAddress || '').trim();
}

/**
 * @param {object} order — đơn đã populate items.product (sku, barcode, name), location, customerProfile
 * @param {object|null} packingProgress — từ API đóng gói { lines: [{ lineIndex, packed, quantity, sku, barcode, productName }] }
 */
export function printWarehouseOrderSlip(order, packingProgress = null) {
    if (!order) return;

    const code = escapeHtml(order.code || '—');
    const loc = order.location;
    const locLine = loc
        ? `${escapeHtml(loc.code || '')}${loc.code && loc.name ? ' · ' : ''}${escapeHtml(loc.name || '')}`.trim() ||
          escapeHtml(loc.name || loc.code || '—')
        : '—';
    const created = order.createdAt
        ? escapeHtml(new Date(order.createdAt).toLocaleString('vi-VN'))
        : '—';
    const ch = escapeHtml(channelLabel(order));

    let customer = '—';
    let phone = '';
    if (order.customerProfile?.name) {
        customer = escapeHtml(order.customerProfile.name);
        phone = order.customerProfile.phone ? escapeHtml(order.customerProfile.phone) : '';
    } else if (order.customer) {
        const c = order.customer;
        customer = escapeHtml([c.firstName, c.lastName].filter(Boolean).join(' ') || c.username || c.email || 'Khách');
        phone = c.phoneNumber ? escapeHtml(c.phoneNumber) : '';
    }

    const recvName = order.shippingRecipientName?.trim() ? escapeHtml(order.shippingRecipientName.trim()) : '';
    const recvPhone = order.shippingPhone?.trim() ? escapeHtml(order.shippingPhone.trim()) : '';
    const addr = escapeHtml(shippingAddress(order));
    const note = order.note?.trim() ? escapeHtml(order.note.trim()) : '';

    const packedByIndex = new Map();
    if (packingProgress?.lines?.length) {
        for (const ln of packingProgress.lines) {
            packedByIndex.set(Number(ln.lineIndex), !!ln.packed);
        }
    }

    const rows = (order.items || [])
        .map((it, idx) => {
            const p = it.product || {};
            const name = escapeHtml(p.name || 'Sản phẩm');
            const sku = escapeHtml(p.sku || '—');
            const barcode = p.barcode != null && String(p.barcode).trim() !== '' ? escapeHtml(String(p.barcode).trim()) : '—';
            const qty = Number(it.quantity) || 0;
            const unit = escapeHtml((it.unit && String(it.unit).trim()) || 'Cái');
            const packed = packedByIndex.has(idx) ? (packedByIndex.get(idx) ? 'Đã quét' : 'Chưa') : '—';
            return `<tr>
  <td style="text-align:center">${idx + 1}</td>
  <td class="l">${name}</td>
  <td style="font-family:ui-monospace,monospace">${sku}</td>
  <td style="font-family:ui-monospace,monospace">${barcode}</td>
  <td style="text-align:center">${unit}</td>
  <td style="text-align:right;font-weight:600">${qty}</td>
  <td style="text-align:center;font-size:9pt">${packed}</td>
</tr>`;
        })
        .join('');

    const totalAmt = Number(order.totalAmount) || 0;
    const now = escapeHtml(new Date().toLocaleString('vi-VN'));

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Phiếu soạn ${code}</title>
<style>
  @page { size: A4 portrait; margin: 10mm; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Tahoma, sans-serif; font-size: 11pt; color: #111; margin: 0; }
  h1 { text-align: center; font-size: 16pt; margin: 0 0 6px; font-weight: 700; letter-spacing: 0.02em; }
  .sub { text-align: center; font-size: 9.5pt; color: #444; margin-bottom: 12px; }
  .meta { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 10pt; }
  .meta td { padding: 3px 6px; vertical-align: top; border: 1px solid #ccc; }
  .meta .k { width: 28%; font-weight: 600; background: #f5f5f5; }
  .items { width: 100%; border-collapse: collapse; font-size: 10pt; }
  .items th, .items td { border: 1px solid #333; padding: 5px 6px; }
  .items th { background: #e8e8e8; font-weight: 600; }
  .items .l { text-align: left; max-width: 42%; }
  .pill { display: inline-block; padding: 1px 8px; background: #eee; border: 1px solid #ccc; border-radius: 4px; font-size: 10pt; }
  .ft { margin-top: 14px; font-size: 9pt; color: #555; text-align: center; border-top: 1px dashed #999; padding-top: 8px; }
</style></head><body>
  <h1>PHIẾU SOẠN HÀNG — NHÂN VIÊN KHO</h1>
  <p class="sub">Đối chiếu mã đơn, SKU / mã vạch khi gom hàng và đóng gói. Giữ phiếu kèm kiện hàng nếu cần.</p>
  <table class="meta">
    <tr><td class="k">Mã đơn</td><td colspan="3"><strong style="font-size:13pt;font-family:ui-monospace,monospace">${code}</strong> &nbsp;·&nbsp; <span class="pill">${ch}</span>${
        order.isPreOrder ? ' &nbsp;·&nbsp; <span class="pill" style="background:#fff3cd;border-color:#e0a800">Đặt trước</span>' : ''
    }</td></tr>
    <tr><td class="k">Chi nhánh / kho</td><td colspan="3">${locLine}</td></tr>
    <tr><td class="k">Ngày đặt</td><td>${created}</td><td class="k">Ngày in phiếu</td><td>${now}</td></tr>
    <tr><td class="k">Khách hàng</td><td colspan="3">${customer}${phone ? ` · ${phone}` : ''}</td></tr>
    ${recvName || recvPhone ? `<tr><td class="k">Người nhận / SĐT nhận</td><td colspan="3">${recvName || '—'}${recvPhone ? ` · ${recvPhone}` : ''}</td></tr>` : ''}
    ${addr ? `<tr><td class="k">Địa chỉ giao</td><td colspan="3">${addr}</td></tr>` : ''}
    <tr><td class="k">Tổng thanh toán</td><td colspan="3"><strong>${totalAmt.toLocaleString('vi-VN')}đ</strong></td></tr>
    ${note ? `<tr><td class="k">Ghi chú đơn</td><td colspan="3" style="white-space:pre-wrap">${note}</td></tr>` : ''}
  </table>
  <table class="items">
    <thead>
      <tr>
        <th style="width:5%">STT</th>
        <th style="width:28%">Tên sản phẩm</th>
        <th style="width:14%">SKU</th>
        <th style="width:16%">Mã vạch</th>
        <th style="width:8%">ĐVT</th>
        <th style="width:8%">SL</th>
        <th style="width:13%">Đóng gói*</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="ft">*Cột Đóng gói cập nhật khi bạn đang mở đơn trên màn hình quét xuất. Phiếu in trước khi quét có thể hiển thị “—”.<br/>Ký nhận kho: _________________ &nbsp;&nbsp;&nbsp; Ký giao / vận chuyển: _________________</p>
</body></html>`;

    const iframe = document.createElement('iframe');
    iframe.style.cssText =
        'position:fixed;left:-9999px;top:0;width:210mm;min-width:200mm;height:1px;border:none;opacity:0;pointer-events:none;';
    iframe.setAttribute('title', 'print-warehouse-slip');
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
