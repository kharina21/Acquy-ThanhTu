# Deploy lên Render (Frontend + Backend cùng 1 URL)

Frontend (React) và Backend (Express) chạy trên **cùng một domain** qua Render Web Service.

## Kiến trúc

- **Build:** Build frontend (client) → `client/dist`, cài backend deps
- **Runtime:** Express phục vụ API tại `/api/*` và static frontend tại `/*`
- **URL:** `https://acquy-thanhtu.onrender.com` – vừa giao diện vừa API

## Cách 1: Deploy qua Render Dashboard

### Bước 1: Đẩy code lên GitHub

```bash
git add .
git commit -m "Prepare Render deployment"
git push origin main
```

### Bước 2: Tạo Web Service trên Render

1. Vào [render.com](https://render.com) → **New** → **Web Service**
2. Kết nối repo GitHub và chọn repository
3. Cấu hình:
   - **Name:** `acquy-thanhtu`
   - **Region:** Singapore (hoặc gần bạn)
   - **Runtime:** Node
   - **Build Command:**
     ```bash
     cd client && npm install && npm run build && cd ../backend && npm install
     ```
   - **Start Command:**
     ```bash
     cd backend && npm start
     ```

### Bước 3: Biến môi trường

Thêm trong **Environment** của service:

| Key | Value | Ghi chú |
|-----|-------|---------|
| `VITE_API_URL` | `/api` | Bắt buộc – dùng lúc build client |
| `NODE_ENV` | `production` | |
| `PORT` | (Render tự set) | Không cần thêm |
| `MONGO_URI` | `mongodb+srv://...` | MongoDB Atlas connection string |
| `JWT_SECRET` | (chuỗi bí mật) | |
| `ACCESS_TOKEN_EXPIRES_IN` | `3h` | |
| `REFRESH_TOKEN_EXPIRES_IN` | `7d` | |
| `WEBHOOK_URL` | `https://acquy-thanhtu.onrender.com/api/payments/webhook` | Thay bằng URL thật khi deploy |
| ... | Các biến khác từ `backend/.env` | Cloudinary, SMTP, PayOS, VietQR... |

Lưu ý: Thay `acquy-thanhtu.onrender.com` bằng URL Web Service thực tế.

### Bước 4: Deploy

Bấm **Create Web Service**. Render sẽ build và deploy.

---

## Cách 2: Dùng Blueprint (render.yaml)

Nếu repo đã có `render.yaml` ở root:

1. **New** → **Blueprint**
2. Kết nối repo và chọn repository
3. Render sẽ tạo service theo `render.yaml`
4. Vào **Environment** và thêm các biến (MONGO_URI, JWT_SECRET, …) như Bước 3 ở trên

---

## Kiểm tra sau deploy

1. Mở URL Render (vd: `https://acquy-thanhtu.onrender.com`)
2. Kiểm tra trang chủ, đăng nhập
3. Kiểm tra API: `https://acquy-thanhtu.onrender.com/api/...`

---

## Free tier

- Service có thể **sleep** sau ~15 phút không hoạt động
- Lần request đầu sau khi sleep có thể mất 1–2 phút (cold start)

---

## Cấu trúc liên quan

```
Acquy-ThanhTu/
├── client/              ← Build → client/dist
│   └── dist/           ← Được serve bởi Express
├── backend/             ← Chạy Express, serve client/dist
│   └── src/server.js    ← Thêm static + SPA fallback
├── render.yaml          ← Blueprint (tùy chọn)
└── RENDER_DEPLOY.md    ← File này
```
