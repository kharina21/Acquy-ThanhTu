# Quy trình thanh toán – PayOS

## Tổng quan

Hệ thống tích hợp thanh toán theo chuẩn PayOS (Napas 24/7). Khách chỉ cần nhấn nút **"Thanh toán qua PayOS"** để chuyển sang trang PayOS và hoàn tất thanh toán.

## Luồng nghiệp vụ (Business Flow)

### Bước 1: Khách đặt hàng
- Khách chọn sản phẩm, nhập địa chỉ giao hàng, thanh toán chuyển khoản
- Hệ thống tạo đơn hàng (status: pending, paymentStatus: pending)

### Bước 2: Tạo link PayOS
- Backend gọi API PayOS `createPayOSPaymentLink()` với thông tin đơn
- PayOS trả về `checkoutUrl` (trang thanh toán của PayOS)

### Bước 3: Khách nhấn "Thanh toán qua PayOS"
- Mở `checkoutUrl` trong tab mới → chuyển sang trang PayOS
- Trên PayOS: khách chọn ngân hàng, quét QR hoặc nhập thông tin chuyển khoản

### Bước 4: PayOS xác nhận thanh toán
- Ngân hàng ghi nhận giao dịch → PayOS gửi **webhook** về backend
- Backend cập nhật đơn: `paymentStatus = paid`, `paidAt`
- PayOS redirect khách về `returnUrl` (trang chi tiết đơn) với `?payment=success`

### Bước 5: Hoàn tất
- Khách thấy trang chi tiết đơn với trạng thái "Đã thanh toán"
- Cửa hàng nhận thông báo (qua webhook) và xử lý đơn

## Cấu hình

### Biến môi trường (.env)

```
POS_CLIENT_ID=...
POS_API_KEY=...
POS_CHECKSUM_KEY=...
FRONTEND_URL=http://localhost:5173
WEBHOOK_URL=http://localhost:5000/api/payments/webhook
```

### Đăng ký Webhook tại PayOS

1. Đăng nhập [my.payos.vn](https://my.payos.vn)
2. Vào **Kênh thanh toán** → **Cài đặt Webhook**
3. Nhập URL: `https://your-domain.com/api/payments/webhook`
4. PayOS sẽ gửi request kiểm tra; endpoint phải trả **HTTP 2xx** khi nhận webhook hợp lệ

### Lưu ý production

- **WEBHOOK_URL** phải là URL public (PayOS server gọi được)
- Localhost không nhận webhook → dùng [ngrok](https://ngrok.com) để test
- **FRONTEND_URL** khi deploy: `https://your-domain.com`

### Webhook trả 500 – Kiểm tra

1. **POS_CHECKSUM_KEY** trong `.env` phải khớp với Checksum Key tại [my.payos.vn](https://my.payos.vn) → Kênh thanh toán
2. Xem log backend: `PayOS webhook error: ...` – thường là lỗi xác thực chữ ký
3. Đảm bảo đã tạo link thanh toán trước khi thanh toán (PaymentLink phải tồn tại)

## API Endpoints

| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/api/payments/webhook` | Webhook PayOS (không auth) |
| GET | `/api/orders/:id/generate-vietqr` | Tạo QR/link thanh toán |

## Model PaymentLink

Lưu ánh xạ `orderCode` (PayOS) ↔ `Order` (MongoDB):

- `order` – ObjectId đơn hàng
- `orderCode` – Mã số PayOS (integer)
- `paymentLinkId` – ID link PayOS
- `status` – pending | paid | cancelled | failed

Khi tạo link thanh toán → tạo record PaymentLink. Khi webhook tới → tìm theo `orderCode` → cập nhật Order.

## So sánh với các bên khác

| Bên | Luồng tương tự | Ghi chú |
|-----|----------------|---------|
| **PayOS** | Đã tích hợp | Webhook + returnUrl |
| **VNPay** | IPN callback + returnUrl | Cần HMAC-SHA512 |
| **Momo** | IPN + returnUrl | Cần SECRET_KEY |
| **ZaloPay** | Callback + returnUrl | X-ZaloPay-MAC header |

Chung: **Tạo giao dịch → Khách thanh toán → Callback/Webhook cập nhật trạng thái → ReturnUrl hiển thị kết quả**.
