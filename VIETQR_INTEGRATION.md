# Hướng dẫn tích hợp VietQR

Tài liệu này hướng dẫn cách kết nối VietQR để nhận thanh toán chuyển khoản qua mã QR. Tham khảo [VietQR API](https://api.vietqr.vn/) và mô hình KiotViet.

## 1. Tổng quan

- **VietQR**: Chuẩn mã QR thanh toán liên ngân hàng tại Việt Nam, hỗ trợ 50+ ngân hàng.
- **Luồng**: Tạo mã QR → Khách quét → Chuyển khoản → Webhook/Callback thông báo → Cập nhật đơn hàng.

## 2. Chuẩn bị

### 2.1 Đăng ký VietQR

1. Đăng ký tài khoản tại [VietQR.vn](https://vietqr.vn/)
2. Liên kết tài khoản ngân hàng với ứng dụng VietQR
3. Khai báo thông tin kết nối tại [VietQR Merchant](https://vietqr.vn/merchant/request)
4. Nhận **username**, **password** (Basic Auth) và **Access Key** từ VietQR

### 2.2 Lưu thông tin tài khoản trong hệ thống

Trong **Hồ sơ cửa hàng → Tài khoản ngân hàng**, thêm tài khoản với:

- **Mã ngân hàng** (bankCode): VD `MB`, `VCB`, `BIDV`
- **Số tài khoản** (bankAccount)
- **Tên chủ tài khoản** (userBankName)

Dữ liệu này dùng để tạo mã QR và hiển thị cho khách.

## 3. Luồng tích hợp API VietQR

### 3.1 Lấy Token

```
POST https://dev.vietqr.org/vqr/api/peripheral/ecommerce/token_generate
Authorization: Basic <base64(username:password)>
Content-Type: application/json
```

Response chứa `accessToken` (Bearer) dùng cho các API tiếp theo.

### 3.2 Tạo mã QR thanh toán

```
POST https://dev.vietqr.org/vqr/api/qr/generate-customer
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "amount": "686800",
  "content": "ORD123456",
  "bankAccount": "0852240768",
  "bankCode": "MB",
  "userBankName": "HA TRUNG HIEU",
  "transType": "C",
  "orderId": "ORD123456",
  "qrType": 0
}
```

**Lưu ý:**

- `orderId`: Tối đa 13 ký tự, không dấu, không ký tự đặc biệt
- `content`: Tối đa 23 ký tự, không dấu
- `amount`: Số tiền (VNĐ) dạng string

**Response** chứa:

- `qrLink`: Link hiển thị mã QR cho khách
- `qrCode`: Chuỗi mã QR (có thể render bằng thư viện QR)
- `transactionRefId`: Mã tham chiếu giao dịch

### 3.3 Nhận thông báo thanh toán (Transaction Sync)

Triển khai API webhook trên server của bạn để VietQR gọi khi có giao dịch:

- VietQR gửi POST đến URL bạn đăng ký
- Xác thực chữ ký (Secret Key)
- Cập nhật `paymentStatus = 'paid'` cho đơn hàng tương ứng `orderId`

Chi tiết: [VietQR Transaction Sync](https://api.vietqr.vn/vi/api-vietqr-callback/)

## 4. Triển khai trong ứng dụng

### 4.1 Biến môi trường

```env
VITE_VIETQR_USERNAME=your_username
VITE_VIETQR_PASSWORD=your_password
VIETQR_WEBHOOK_SECRET=your_secret
```

**Lưu ý**: Không expose username/password ở client. Nên gọi API qua backend.

### 4.2 Backend: API tạo mã QR

Tạo endpoint `POST /api/orders/:id/generate-qr`:

1. Lấy thông tin đơn hàng và tài khoản ngân hàng (theo location)
2. Gọi VietQR API Get Token
3. Gọi VietQR API Generate QR với `orderId`, `amount`, `content`
4. Trả về `qrLink` hoặc `qrCode` cho frontend

### 4.3 Frontend: Hiển thị mã QR

Khi khách chọn "Chuyển khoản (VietQR)" và nhấn "Thanh toán":

1. Gọi API tạo mã QR
2. Hiển thị modal/popup với ảnh QR (hoặc iframe `qrLink`)
3. Khách quét bằng app ngân hàng và chuyển khoản
4. Polling hoặc WebSocket để kiểm tra trạng thái thanh toán (hoặc chờ webhook cập nhật)

## 5. Tham khảo KiotViet

KiotViet tích hợp VietQR qua [kiot.vietqr.vn](https://kiot.vietqr.vn):

- Cấu hình tài khoản ngân hàng trong Cài đặt
- Khi thanh toán chọn "Chuyển khoản", hệ thống tạo mã QR
- Khách quét và thanh toán, đơn tự động cập nhật khi nhận callback

Mô hình tương tự: **Cấu hình TKNH → Tạo QR khi thanh toán → Webhook cập nhật**.

## 6. Môi trường

- **Test/Sandbox**: `https://dev.vietqr.org/`
- **Production**: `https://api.vietqr.org/`

Sau khi nghiệm thu, liên hệ VietQR để GoLive tài khoản thực.
