# Cấu hình Cloudinary (ảnh sản phẩm)

Ảnh sản phẩm được lưu trên **Cloudinary** (cloud), không lưu trên máy chủ.

## Bước 1: Tạo tài khoản Cloudinary

1. Đăng ký miễn phí: https://cloudinary.com/users/register/free
2. Vào **Dashboard** → **Settings** (hoặc **Account Details**)
3. Lấy: **Cloud name**, **API Key**, **API Secret**

## Bước 2: Thêm biến môi trường

Trong file `.env` của backend, thêm:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Thay `your_cloud_name`, `your_api_key`, `your_api_secret` bằng giá trị từ Dashboard.

## Lưu ý

-   Gói miễn phí Cloudinary có giới hạn dung lượng/tháng, đủ dùng cho ứng dụng nhỏ.
-   Ảnh upload qua form **Thêm sản phẩm** / **Sửa sản phẩm** (chọn file hoặc dán URL) sẽ lưu URL vào `Product.image`.
