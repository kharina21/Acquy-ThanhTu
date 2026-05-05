import JsBarcode from 'jsbarcode';

export const escapeHtml = (s) =>
    String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

/** Giống màn chi tiết sản phẩm — ký tự hợp lệ cho CODE128 */
export const normalizeBarcodeValueForCode128 = (raw) =>
    String(raw ?? '')
        .trim()
        .replace(/[^\w\s-]/g, '');

/**
 * @param {string} barcodeValue — đã chuẩn hóa, khác rỗng
 * @returns {string} data URL PNG
 */
export const createBarcodeDataUrl = (barcodeValue) => {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, barcodeValue, {
        format: 'CODE128',
        width: 1,
        height: 22,
        displayValue: true,
        fontSize: 7,
        margin: 0,
    });
    return canvas.toDataURL('image/png');
};

export const formatCapacityLabel = (capRaw) => {
    const t = String(capRaw ?? '').trim();
    if (!t) return '';
    return /ah|Ah|AH/.test(t) ? t : `${t} Ah`;
};

/**
 * Nội dung một ô tem (35×22mm), đồng bộ giữa quản lý sản phẩm và nhập hàng.
 * @param {object} p
 * @param {string} p.name
 * @param {string} [p.capacity]
 * @param {string} [p.sku] — hiện nếu khác mã in trên vạch
 * @param {string} p.barcodeValue — mã đang mã hóa trên vạch (để so với sku)
 * @param {string} p.barcodeDataUrl
 * @param {string} [p.priceStr] — đã format (VD VND), hoặc rỗng
 */
export const buildLabelCellInnerHtml = ({
    name,
    capacity,
    sku,
    barcodeValue,
    barcodeDataUrl,
    priceStr,
}) => {
    const nameEsc = escapeHtml(name || '');
    const capRaw = (capacity ?? '').toString().trim();
    const capacityEsc = capRaw ? escapeHtml(formatCapacityLabel(capRaw)) : '';
    const skuLine = (sku || '').toString().trim();
    const showSku =
        skuLine && skuLine.replace(/\s/g, '') !== String(barcodeValue || '').replace(/\s/g, '');
    const skuEsc = showSku ? escapeHtml(skuLine) : '';
    const priceEsc = priceStr ? escapeHtml(String(priceStr)) : '';

    return `
            <div class="cell-inner">
              <div class="cell-title" title="${nameEsc}">${nameEsc}</div>
              ${capacityEsc ? `<div class="cell-spec" title="${capacityEsc}">${capacityEsc}</div>` : ''}
              ${skuEsc ? `<div class="cell-sku">${skuEsc}</div>` : ''}
              <img class="cell-barcode" src="${barcodeDataUrl}" alt="" />
              ${priceEsc ? `<div class="cell-price">${priceEsc}</div>` : ''}
            </div>`;
};

export const PRODUCT_BARCODE_PRINT_STYLES = `
  * { box-sizing: border-box; }
  @page { size: 70mm 22mm; margin: 0; }
  html, body {
    margin: 0;
    padding: 0;
    height: auto;
    min-height: 0;
    font-family: Arial, Helvetica, sans-serif;
    background: #fff;
  }
  .print-root {
    margin: 0;
    padding: 0;
    width: 70mm;
    overflow: hidden;
  }
  .sheet {
    width: 70mm;
    height: 22mm;
    max-height: 22mm;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: row;
    align-items: stretch;
    page-break-inside: avoid;
    break-inside: avoid;
    overflow: hidden;
  }
  .sheet:not(:last-child) {
    page-break-after: always;
  }
  .cell {
    flex: 0 0 35mm;
    width: 35mm;
    max-width: 35mm;
    height: 22mm;
    max-height: 22mm;
    overflow: hidden;
    padding: 0.35mm 0.8mm 0.5mm;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    border-right: 0.12mm solid #ccc;
  }
  .cell:last-child { border-right: none; }
  .cell--empty {
    visibility: hidden;
    padding: 0;
    border-right: none;
  }
  .cell-inner {
    width: 100%;
    max-width: 33.5mm;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0;
    min-height: 0;
  }
  .cell-title {
    font-size: 5pt;
    font-weight: 700;
    line-height: 1;
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .cell-spec {
    font-size: 4.5pt;
    font-weight: 600;
    line-height: 1;
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #111;
  }
  .cell-sku {
    font-size: 4pt;
    line-height: 1;
    color: #333;
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .cell-barcode {
    display: block;
    width: 100%;
    max-width: 33mm;
    height: auto;
    max-height: 8.5mm;
    object-fit: contain;
    image-rendering: pixelated;
  }
  .cell-price {
    font-size: 4.5pt;
    line-height: 1;
    white-space: nowrap;
  }
  @media screen {
    body { background: #2a2a2a; padding: 10px; }
    .print-root { margin: 0 auto; }
    .sheet {
      margin: 0 auto 10px;
      background: #fff;
      box-shadow: 0 1px 4px rgba(0,0,0,0.35);
    }
  }
  @media print {
    body { background: #fff; padding: 0 !important; }
    .print-root { margin: 0; }
    .sheet {
      margin: 0 !important;
      padding: 0 !important;
      box-shadow: none;
    }
  }
`;

/** Mỗi phần tử = inner một tem (cùng layout), ghép 2 tem / hàng 70mm */
export const buildSheetsFromCellInnerHtmls = (cellInnerHtmlList) => {
    const list = Array.isArray(cellInnerHtmlList) ? cellInnerHtmlList : [];
    const rows = [];
    for (let i = 0; i < list.length; i += 2) {
        const left = `<div class="cell">${list[i]}</div>`;
        const right =
            i + 1 < list.length ? `<div class="cell">${list[i + 1]}</div>` : `<div class="cell cell--empty"></div>`;
        rows.push(`<div class="sheet">${left}${right}</div>`);
    }
    return rows.join('');
};

export const buildProductBarcodePrintDocumentHtml = (documentTitle, sheetsHtml) => `<!DOCTYPE html><html><head><title>${escapeHtml(documentTitle)}</title>
<meta charset="utf-8">
<style>${PRODUCT_BARCODE_PRINT_STYLES}</style></head><body><div class="print-root">${sheetsHtml}</div></body></html>`;
