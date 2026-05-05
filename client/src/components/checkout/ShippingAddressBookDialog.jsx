import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckoutAddressFields } from '@/components/checkout/CheckoutAddressFields';
import {
  getShippingAddresses,
  createShippingAddress,
  updateShippingAddress,
  deleteShippingAddress,
  setDefaultShippingAddress,
} from '@/services/shippingAddressService';
import { getDistricts, getWards } from '@/services/addressService';
import { MapPin, Plus, Pencil, Trash2, Star, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

export const ADDRESS_BOOK_OUTLINE_BTN =
  '!border-slate-400 !bg-white !text-slate-800 !shadow-sm hover:!bg-slate-100 hover:!text-slate-900 hover:!border-slate-500 active:!bg-slate-200';
export const ADDRESS_BOOK_DELETE_BTN =
  '!border-red-300 !bg-white !text-red-700 hover:!bg-red-50 hover:!text-red-800 hover:!border-red-400';

const emptyDialogForm = () => ({
  label: '',
  recipientName: '',
  shippingPhone: '',
  provinceCode: '',
  provinceName: '',
  districtCode: '',
  districtName: '',
  wardCode: '',
  wardName: '',
  addressLine: '',
  isDefault: false,
});

const validateRecipientName = (name) => {
  const s = (name || '').trim();
  if (!s) return 'Vui lòng nhập tên người nhận';
  if (s.length < 2) return 'Tên người nhận phải có ít nhất 2 ký tự';
  if (s.length > 100) return 'Tên người nhận không quá 100 ký tự';
  if (!/^[\p{L}\s.'-]+$/u.test(s)) return 'Tên chỉ được chứa chữ cái, dấu cách hoặc dấu chấm';
  return null;
};

const validatePhone = (phone) => {
  const s = (phone || '').trim().replace(/\s/g, '');
  if (!s) return 'Vui lòng nhập số điện thoại nhận hàng';
  if (!/^0[2-9][0-9]{8,9}$/.test(s)) return 'Số điện thoại không hợp lệ (ví dụ: 0901234567)';
  return null;
};

const validateAddressLine = (addr) => {
  const s = (addr || '').trim();
  if (!s) return 'Vui lòng nhập địa chỉ cụ thể (số nhà, tên đường...)';
  if (s.length < 10) return 'Địa chỉ phải có ít nhất 10 ký tự';
  if (s.length > 200) return 'Địa chỉ không quá 200 ký tự';
  return null;
};

export function getAddressId(addr) {
  const raw = addr?._id ?? addr?.id;
  if (raw == null) return '';
  return typeof raw === 'object' && raw.toString ? String(raw.toString()) : String(raw);
}

/**
 * Sổ địa chỉ (danh sách + form thêm/sửa) — dùng chung Checkout và chi tiết đơn (chỉnh địa chỉ).
 * @param {object} props
 * @param {(addresses: object[]) => void} props.onAddressesChange — gọi sau khi tải/lưu/xóa/đặt mặc định
 * @param {boolean} [props.pickForOrder] — true: nhấn vào phần nội dung thẻ địa chỉ để chọn giao đến đó cho đơn hiện tại
 * @param {(addr: object) => void | Promise<void>} [props.onPickAddress]
 */
export function ShippingAddressBookDialog({
  open,
  onOpenChange,
  provinces,
  onAddressesChange,
  pickForOrder = false,
  onPickAddress,
}) {
  const [addressBookView, setAddressBookView] = useState('list');
  const [dialogMode, setDialogMode] = useState('create');
  const [dialogEditingId, setDialogEditingId] = useState(null);
  const [dialogForm, setDialogForm] = useState(emptyDialogForm);
  const [dialogDistricts, setDialogDistricts] = useState([]);
  const [dialogWards, setDialogWards] = useState([]);
  const [dialogSaving, setDialogSaving] = useState(false);
  const [dialogErrors, setDialogErrors] = useState({});
  const [savedAddresses, setSavedAddresses] = useState([]);

  const pushList = (list) => {
    setSavedAddresses(list);
    onAddressesChange?.(list);
  };

  const refreshList = async () => {
    try {
      const res = await getShippingAddresses();
      const list = res?.data?.addresses ?? [];
      pushList(list);
    } catch {
      pushList([]);
    }
  };

  useEffect(() => {
    if (open) {
      refreshList();
      setAddressBookView('list');
    }
  }, [open]);

  const openDialogCreate = () => {
    setDialogMode('create');
    setDialogEditingId(null);
    setDialogForm(emptyDialogForm());
    setDialogDistricts([]);
    setDialogWards([]);
    setDialogErrors({});
    setAddressBookView('form');
  };

  const openDialogEdit = async (addr) => {
    const addrId = getAddressId(addr);
    if (!addrId) {
      toast.error('Không xác định được địa chỉ. Vui lòng tải lại trang.');
      return;
    }
    setDialogMode('edit');
    setDialogEditingId(addrId);
    setDialogForm({
      label: addr.label || '',
      recipientName: addr.recipientName,
      shippingPhone: addr.shippingPhone,
      provinceCode: String(addr.provinceCode),
      provinceName: addr.provinceName,
      districtCode: String(addr.districtCode),
      districtName: addr.districtName,
      wardCode: String(addr.wardCode),
      wardName: addr.wardName,
      addressLine: addr.addressLine,
      isDefault: addr.isDefault === true || addr.isDefault === 'true',
    });
    setDialogErrors({});
    setAddressBookView('form');
    try {
      const dList = await getDistricts(addr.provinceCode);
      setDialogDistricts(dList);
      const wList = await getWards(addr.districtCode);
      setDialogWards(wList);
    } catch {
      toast.error('Không tải được danh sách tỉnh/huyện. Kiểm tra mạng và thử lại.');
      setDialogDistricts([]);
      setDialogWards([]);
    }
  };

  const handleDialogProvince = async (code) => {
    const p = provinces.find((x) => String(x.code) === String(code));
    setDialogForm((f) => ({
      ...f,
      provinceCode: code,
      provinceName: p?.name || '',
      districtCode: '',
      districtName: '',
      wardCode: '',
      wardName: '',
    }));
    const dList = await getDistricts(code);
    setDialogDistricts(dList);
    setDialogWards([]);
  };

  const handleDialogDistrict = async (code) => {
    const d = dialogDistricts.find((x) => String(x.code) === String(code));
    setDialogForm((f) => ({
      ...f,
      districtCode: code,
      districtName: d?.name || '',
      wardCode: '',
      wardName: '',
    }));
    const wList = await getWards(code);
    setDialogWards(wList);
  };

  const handleDialogWard = (code) => {
    const w = dialogWards.find((x) => String(x.code) === String(code));
    setDialogForm((f) => ({
      ...f,
      wardCode: code,
      wardName: w?.name || '',
    }));
  };

  const saveDialog = async () => {
    const errRecipient = validateRecipientName(dialogForm.recipientName);
    const errPhone = validatePhone(dialogForm.shippingPhone);
    const errAddress = validateAddressLine(dialogForm.addressLine);
    const errProvince = !dialogForm.provinceCode ? 'Vui lòng chọn Tỉnh/Thành phố' : null;
    const errDistrict = !dialogForm.districtCode ? 'Vui lòng chọn Quận/Huyện' : null;
    const errWard = !dialogForm.wardCode ? 'Vui lòng chọn Phường/Xã' : null;
    const newErrors = {
      recipientName: errRecipient,
      shippingPhone: errPhone,
      addressLine: errAddress,
      provinceCode: errProvince,
      districtCode: errDistrict,
      wardCode: errWard,
    };
    setDialogErrors(newErrors);
    if (Object.values(newErrors).some(Boolean)) {
      toast.error('Vui lòng kiểm tra thông tin địa chỉ');
      return;
    }
    setDialogSaving(true);
    try {
      const payload = {
        label: dialogForm.label?.trim() || '',
        recipientName: dialogForm.recipientName.trim(),
        shippingPhone: dialogForm.shippingPhone.trim(),
        provinceCode: dialogForm.provinceCode,
        provinceName: dialogForm.provinceName,
        districtCode: dialogForm.districtCode,
        districtName: dialogForm.districtName,
        wardCode: dialogForm.wardCode,
        wardName: dialogForm.wardName,
        addressLine: dialogForm.addressLine.trim(),
        isDefault: dialogForm.isDefault,
      };
      const editId = dialogEditingId != null ? String(dialogEditingId) : '';
      if (dialogMode === 'create') {
        await createShippingAddress(payload);
        toast.success('Đã lưu địa chỉ');
      } else {
        if (!editId) {
          toast.error('Thiếu mã địa chỉ. Vui lòng thử lại.');
          setDialogSaving(false);
          return;
        }
        await updateShippingAddress(editId, payload);
        toast.success('Đã cập nhật địa chỉ');
      }
      await refreshList();
      setAddressBookView('list');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không lưu được địa chỉ');
    } finally {
      setDialogSaving(false);
    }
  };

  const handleDeleteAddress = async (id) => {
    const sid = id != null ? String(id) : '';
    if (!sid) return;
    if (!confirm('Xóa địa chỉ giao hàng này?')) return;
    try {
      await deleteShippingAddress(sid);
      toast.success('Đã xóa địa chỉ');
      await refreshList();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không xóa được');
    }
  };

  const handleSetDefaultInBook = async (id) => {
    const sid = id != null ? String(id) : '';
    if (!sid) {
      toast.error('Không xác định được địa chỉ.');
      return;
    }
    try {
      await setDefaultShippingAddress(sid);
      toast.success('Đã đặt làm địa chỉ mặc định');
      await refreshList();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không đặt được mặc định');
    }
  };

  const handlePick = async (addr) => {
    if (!onPickAddress || !pickForOrder) return;
    try {
      await onPickAddress(addr);
      onOpenChange(false);
    } catch (e) {
      /* toast từ parent */
    }
  };

  const handleCardPickKeyDown = (e, addr) => {
    if (!pickForOrder || !onPickAddress) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handlePick(addr);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setAddressBookView('list');
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[min(92vh,720px)] overflow-y-auto flex flex-col gap-2 p-4 sm:p-4">
        {addressBookView === 'list' ? (
          <>
            <DialogHeader>
              <DialogTitle>Sổ địa chỉ giao hàng</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 max-h-[min(60vh,480px)] overflow-y-auto pr-1 -mr-1">
              {savedAddresses.length === 0 ? (
                <p className="text-sm text-gray-500 py-6 text-center">Chưa có địa chỉ nào. Thêm địa chỉ đầu tiên bên dưới.</p>
              ) : (
                savedAddresses.map((addr, index) => {
                  const addrId = getAddressId(addr);
                  const isDef = addr.isDefault === true || addr.isDefault === 'true';
                  const summary = [addr.addressLine, addr.wardName, addr.districtName, addr.provinceName]
                    .filter(Boolean)
                    .join(', ');
                  const cardPickable = pickForOrder && onPickAddress;
                  return (
                    <div
                      key={addrId || `addr-${index}`}
                      className={`rounded-xl border border-gray-300 bg-white p-3 text-left shadow-sm ${
                        cardPickable ? 'focus-within:ring-2 focus-within:ring-blue-500/30' : ''
                      }`}
                    >
                      <div
                        role={cardPickable ? 'button' : undefined}
                        tabIndex={cardPickable ? 0 : undefined}
                        className={`flex gap-2 items-start rounded-lg -m-1 p-1 ${
                          cardPickable
                            ? 'cursor-pointer hover:bg-blue-50/80 transition-colors outline-none'
                            : ''
                        }`}
                        onClick={cardPickable ? () => handlePick(addr) : undefined}
                        onKeyDown={cardPickable ? (e) => handleCardPickKeyDown(e, addr) : undefined}
                      >
                        <MapPin className="w-4 h-4 shrink-0 text-blue-600 mt-0.5 pointer-events-none" />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-sm text-gray-800">{addr.label?.trim() || 'Địa chỉ'}</span>
                            {isDef && (
                              <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                Mặc định
                              </span>
                            )}
                          </div>
                          {cardPickable && (
                            <p className="text-[11px] text-blue-700 font-medium mt-0.5">Nhấn để chọn giao đến đây cho đơn này</p>
                          )}
                          <p className="text-sm text-gray-900 mt-0.5">{addr.recipientName}</p>
                          <p className="text-xs text-gray-600">{addr.shippingPhone}</p>
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{summary}</p>
                        </div>
                      </div>
                      <div className="mt-3 pt-2 border-t border-gray-200">
                        <div className="flex flex-wrap gap-2">
                          {!isDef && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className={`h-8 gap-1 ${ADDRESS_BOOK_OUTLINE_BTN}`}
                              onClick={() => handleSetDefaultInBook(addrId)}
                            >
                              <Star className="w-3.5 h-3.5" />
                              Đặt mặc định
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className={`h-8 gap-1 ${ADDRESS_BOOK_OUTLINE_BTN}`}
                            onClick={() => openDialogEdit(addr)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Sửa
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className={`h-8 gap-1 ${ADDRESS_BOOK_DELETE_BTN}`}
                            onClick={() => handleDeleteAddress(addrId)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Xóa
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <Button type="button" variant="secondary" className="w-full gap-1 rounded-xl" onClick={openDialogCreate}>
              <Plus className="w-4 h-4" />
              Thêm địa chỉ mới
            </Button>
            <DialogFooter>
              <Button type="button" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
                Đóng
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader className="pb-0 gap-1">
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 -ml-1.5 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  onClick={() => setAddressBookView('list')}
                  aria-label="Quay lại danh sách"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <DialogTitle className="text-left text-base font-semibold">
                  {dialogMode === 'create' ? 'Thêm địa chỉ giao hàng' : 'Sửa địa chỉ giao hàng'}
                </DialogTitle>
              </div>
            </DialogHeader>
            <div className="rounded-lg border border-gray-100 bg-slate-50/80 p-2.5 sm:p-3">
              <CheckoutAddressFields
                form={dialogForm}
                setForm={setDialogForm}
                errors={dialogErrors}
                setErrors={setDialogErrors}
                provinces={provinces}
                districts={dialogDistricts}
                wards={dialogWards}
                onProvinceChange={handleDialogProvince}
                onDistrictChange={handleDialogDistrict}
                onWardChange={handleDialogWard}
                showLabel
              />
            </div>
            <label className="flex items-start gap-2 cursor-pointer rounded-lg border border-gray-100 bg-white px-2.5 py-1.5 mt-1.5 text-xs font-medium text-gray-800 shadow-sm hover:bg-gray-50/80">
              <Checkbox
                className="mt-0.5 size-4 shrink-0"
                checked={dialogForm.isDefault}
                onCheckedChange={(v) => setDialogForm((f) => ({ ...f, isDefault: v === true }))}
              />
              <span>Đặt làm địa chỉ mặc định</span>
            </label>
            <DialogFooter className="mt-1.5 border-t border-gray-100 pt-2.5 sm:justify-end">
              <Button
                type="button"
                onClick={saveDialog}
                disabled={dialogSaving}
                className="!bg-blue-600 hover:!bg-blue-700 !text-white !border-0 rounded-lg shadow-sm w-full sm:w-auto min-w-[120px] py-2 h-9 text-sm"
              >
                {dialogSaving ? 'Đang lưu...' : 'Lưu địa chỉ'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
