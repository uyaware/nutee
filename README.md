# Chạy NUTEE Frontend

Hướng dẫn dưới đây sử dụng Windows PowerShell.

## 1. Chuẩn bị

- Cài Node.js 22.12 trở lên (bao gồm npm). Kiểm tra bằng `node --version` và `npm --version`.
- Chạy backend tại `http://localhost:8080` theo [hướng dẫn backend](../backend/README.md).
- Cần kết nối Internet để tải các thư viện trong lần cài đặt đầu tiên.

## 2. Cài đặt

Mở PowerShell tại thư mục dự án, sau đó chạy:

```powershell
cd frontend
npm.cmd ci
```

## 3. Cấu hình tùy chọn

Cấu hình mặc định sử dụng `/api/v1`; Vite chuyển các yêu cầu này đến backend tại `http://localhost:8080`. Không cần tạo file cấu hình nếu dùng mặc định.

Nếu cần thay đổi, sao chép file mẫu và chỉnh sửa `.env.local`:

```powershell
Copy-Item .env.example .env.local
```

```dotenv
VITE_API_BASE_URL=/api/v1
VITE_GOOGLE_CLIENT_ID=
```

Để dùng đăng nhập Google, đặt `VITE_GOOGLE_CLIENT_ID` giống `GOOGLE_CLIENT_ID` ở backend và bật `GOOGLE_AUTH_ENABLED=true` trong cấu hình backend. Khởi động lại các ứng dụng sau khi thay đổi cấu hình. Không đưa `.env.local` lên Git.

## 4. Chạy frontend

Trong thư mục `frontend`, chạy:

```powershell
npm.cmd run dev
```

Mở địa chỉ Vite hiển thị trong terminal, mặc định là [http://localhost:5173](http://localhost:5173). Giữ backend và frontend đang chạy trong hai cửa sổ terminal. Nhấn `Ctrl+C` để dừng frontend.
