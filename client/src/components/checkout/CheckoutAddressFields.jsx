/**
 * Form địa chỉ giao hàng (thanh toán + dialog).
 * Dùng Tailwind thuần cho ô nhập sáng, nhãn đọc rõ — tránh Daisy label/input trong modal bị tương phản kém.
 */
const labelCls = 'mb-0.5 block text-xs font-medium text-gray-800';

const fieldBase =
  'w-full rounded-lg border bg-white px-2.5 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 shadow-sm transition-[color,box-shadow,border-color] focus:outline-none focus:ring-1 focus:ring-blue-500/30 focus:border-blue-600 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500';

const fieldOk = `${fieldBase} border-gray-200 hover:border-gray-300`;

const fieldErr = `${fieldBase} border-red-400 focus:border-red-500 focus:ring-red-500/25`;

function fieldClass(hasError) {
  return hasError ? fieldErr : fieldOk;
}

export function CheckoutAddressFields({
  form,
  setForm,
  errors,
  setErrors,
  provinces,
  districts,
  wards,
  onProvinceChange,
  onDistrictChange,
  onWardChange,
  onDetachSaved,
  showLabel = false,
}) {
  const touch = (field) => {
    if (errors[field]) setErrors((er) => ({ ...er, [field]: null }));
  };

  return (
    <div className="space-y-2">
      {showLabel && (
        <div>
          <label className={labelCls}>Nhãn (tùy chọn)</label>
          <input
            type="text"
            className={fieldOk}
            placeholder="Ví dụ: Nhà riêng, Công ty..."
            value={form.label ?? ''}
            onChange={(e) => {
              onDetachSaved?.();
              setForm((f) => ({ ...f, label: e.target.value }));
            }}
          />
        </div>
      )}
      <div>
        <label className={labelCls}>Tên người nhận</label>
        <input
          type="text"
          className={fieldClass(!!errors.recipientName)}
          placeholder="Ví dụ: Nguyễn Văn A"
          value={form.recipientName}
          onChange={(e) => {
            onDetachSaved?.();
            setForm((f) => ({ ...f, recipientName: e.target.value }));
            touch('recipientName');
          }}
          required
        />
        {errors.recipientName && <p className="text-[11px] leading-tight text-red-600 mt-0.5">{errors.recipientName}</p>}
      </div>
      <div>
        <label className={labelCls}>Tỉnh / Thành phố</label>
        <select
          className={fieldClass(!!errors.provinceCode)}
          value={form.provinceCode}
          onChange={(e) => {
            onDetachSaved?.();
            onProvinceChange(e.target.value);
            touch('provinceCode');
          }}
          required
        >
          <option value="">— Chọn Tỉnh/Thành phố —</option>
          {provinces.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name}
            </option>
          ))}
        </select>
        {errors.provinceCode && <p className="text-[11px] leading-tight text-red-600 mt-0.5">{errors.provinceCode}</p>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className={labelCls}>Quận / Huyện</label>
          <select
            className={fieldClass(!!errors.districtCode)}
            value={form.districtCode}
            onChange={(e) => {
              onDetachSaved?.();
              onDistrictChange(e.target.value);
              touch('districtCode');
            }}
            required
            disabled={!form.provinceCode}
          >
            <option value="">— Chọn Quận/Huyện —</option>
            {districts.map((d) => (
              <option key={d.code} value={d.code}>
                {d.name}
              </option>
            ))}
          </select>
          {errors.districtCode && <p className="text-[11px] leading-tight text-red-600 mt-0.5">{errors.districtCode}</p>}
        </div>
        <div>
          <label className={labelCls}>Phường / Xã / Thị trấn</label>
          <select
            className={fieldClass(!!errors.wardCode)}
            value={form.wardCode}
            onChange={(e) => {
              onDetachSaved?.();
              onWardChange(e.target.value);
              touch('wardCode');
            }}
            required
            disabled={!form.districtCode}
          >
            <option value="">— Chọn Phường/Xã/Thị trấn —</option>
            {wards.map((w) => (
              <option key={w.code} value={w.code}>
                {w.name}
              </option>
            ))}
          </select>
          {errors.wardCode && <p className="text-[11px] leading-tight text-red-600 mt-0.5">{errors.wardCode}</p>}
        </div>
      </div>
      <div>
        <label className={labelCls}>Địa chỉ cụ thể (số nhà, tên đường...)</label>
        <input
          type="text"
          className={fieldClass(!!errors.addressLine)}
          placeholder="Ví dụ: Số 123, đường ABC"
          value={form.addressLine}
          onChange={(e) => {
            onDetachSaved?.();
            setForm((f) => ({ ...f, addressLine: e.target.value }));
            touch('addressLine');
          }}
          required
        />
        {errors.addressLine && <p className="text-[11px] leading-tight text-red-600 mt-0.5">{errors.addressLine}</p>}
      </div>
      <div>
        <label className={labelCls}>Số điện thoại nhận hàng</label>
        <input
          type="tel"
          className={fieldClass(!!errors.shippingPhone)}
          placeholder="Ví dụ: 0901234567"
          value={form.shippingPhone}
          onChange={(e) => {
            onDetachSaved?.();
            setForm((f) => ({ ...f, shippingPhone: e.target.value }));
            touch('shippingPhone');
          }}
          required
        />
        {errors.shippingPhone && <p className="text-[11px] leading-tight text-red-600 mt-0.5">{errors.shippingPhone}</p>}
      </div>
    </div>
  );
}
