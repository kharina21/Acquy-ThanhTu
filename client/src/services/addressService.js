/**
 * API địa chỉ Việt Nam – provinces.open-api.vn
 * Tỉnh/Thành phố → Quận/Huyện → Phường/Xã/Thị trấn
 */

const BASE = 'https://provinces.open-api.vn/api';

export const getProvinces = async () => {
  const res = await fetch(`${BASE}/p/`);
  if (!res.ok) throw new Error('Không tải được danh sách tỉnh/thành');
  return res.json();
};

export const getDistricts = async (provinceCode) => {
  if (!provinceCode) return [];
  const res = await fetch(`${BASE}/p/${provinceCode}?depth=2`);
  if (!res.ok) return [];
  const data = await res.json();
  return data?.districts || [];
};

export const getWards = async (districtCode) => {
  if (!districtCode) return [];
  const res = await fetch(`${BASE}/d/${districtCode}?depth=2`);
  if (!res.ok) return [];
  const data = await res.json();
  return data?.wards || [];
};
