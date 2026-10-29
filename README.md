# NUTEE frontend

React, Vite, TypeScript, Material UI, TanStack Query và React Hook Form/Zod.

## Chạy local

Yêu cầu Node 22.12+ và backend Java 21 chạy tại http://localhost:8080.

```powershell
npm.cmd install
npm.cmd run dev
```

Vite chuyển tiếp `/api/v1` tới backend. Frontend mặc định chạy tại http://localhost:5173.
Login, register, forgot/reset password, Google login, refresh và logout sử dụng API thật.
Đăng ký chỉ cần email và mật khẩu; backend tự tạo username và gán CUSTOMER.
Mật khẩu cần ít nhất 12 ký tự và tối đa 72 byte UTF-8.

Sao chép `.env.example` thành `.env.local` khi cần tùy chỉnh:

| Biến                  | Giá trị                                                    |
| --------------------- | ---------------------------------------------------------- |
| VITE_API_BASE_URL     | `/api/v1`                                                  |
| VITE_GOOGLE_CLIENT_ID | Google OAuth Web Client ID, giống backend GOOGLE_CLIENT_ID |

Google cần `GOOGLE_AUTH_ENABLED=true` và `GOOGLE_CLIENT_ID` ở backend;
Google Cloud phải cho phép đúng JavaScript origin của frontend. Khởi động lại Vite
sau khi thay đổi `.env.local`. Tài khoản email có sẵn cần được liên kết Google
qua API có xác thực `/api/v1/auth/social/google/link`; hệ thống không tự gộp tài khoản.

Frontend gọi `/api/v1/auth/social/google/nonce` và gửi `{ credential }` tới
`/api/v1/auth/social/google?remember=...` theo Strategy Google của backend.
Phản hồi `AuthResponse` gồm thông tin người dùng và thời hạn, không chứa JWT.

Để thử quên mật khẩu, chạy `docker compose up -d mailpit` trong backend và mở
http://localhost:8025 để đọc email local. Đặt `PASSWORD_RESET_ENABLED=true` ở backend
khi đã sẵn sàng thử gửi email. Backend gửi liên kết tới `PASSWORD_RESET_URL`
(mặc định http://localhost:5173/reset-password).
Mã dùng một lần và hết hạn sau 15 phút. SMTP thật được cấu hình trong
`backend/.env`, không đặt bí mật trong biến VITE.

Backend đặt accessToken và refreshToken vào cookie HttpOnly, Path=/api/v1.
Trình duyệt tự gửi cookie khi API client dùng credentials:include. Frontend không
lưu JWT vào localStorage/sessionStorage, không đọc JWT bằng JavaScript và không
gửi JWT trong Authorization hay body. “Ghi nhớ đăng nhập” điều khiển Max-Age của
cookie; bỏ chọn thì dùng cookie phiên trình duyệt.

Cookie dùng chung một tài khoản giữa các tab và hai portal. Đăng nhập tài khoản
mới thay phiên hiện tại; đăng xuất xóa phiên ở cả customer và backoffice.
Quyền vẫn do backend kiểm tra.

Mọi module API mới dùng client chung để tự gửi cookie, CSRF và refresh/retry khi 401:

```typescript
import { api } from "@/app/services";

const orders = await api.request("/orders");
await api.request("/orders", { method: "POST", body: { productId: "..." } });
// Refresh/logout không cần body:
await api.request("/auth/refresh", { method: "POST", authenticated: false });
await api.request("/auth/logout", { method: "POST", authenticated: false });
```

Client lấy CSRF tại GET /api/v1/auth/csrf và đính kèm X-XSRF-TOKEN cho POST/PUT/PATCH/DELETE.
Refresh được tuần tự hóa với login/logout, kể cả giữa các tab khi có Web Locks.
Nếu CSRF bị xoay ở tab khác, client lấy lại CSRF và thử lại một lần.
Cấu hình production cần HTTPS, AUTH_SECURE_COOKIE=true; mặc định SameSite=Lax.

Catalog, giỏ hàng, hồ sơ, đơn hàng và backoffice vẫn dùng adapter/fixture local.
Dữ liệu người dùng an toàn từ backend được nối vào adapter local để các màn hình
này tiếp tục hoạt động; thay đổi hồ sơ ở prototype chưa ghi về backend.
Các tài khoản seed demo không đăng nhập được backend.

## Cấu trúc module

```text
src/
  app/                  # Router, layout, khởi tạo dịch vụ
    routes/             # CustomerRoutes, BackofficeRoutes
    layouts/            # Layout và header/footer của ứng dụng
    services.ts         # Ghép API auth với các adapter local hiện có
    createLocalServices.ts
  modules/
    auth/               # Login, register, Google, phiên đăng nhập
    catalog/            # Trang chủ, danh mục, sản phẩm, đánh giá
    cart/               # Giỏ hàng và thao tác thêm/xóa sản phẩm
    account/            # Hồ sơ, địa chỉ, thiết lập tài khoản
    checkout/           # Checkout, thanh toán, trang thành công
    orders/             # Đơn hàng của khách và màn hình vận hành
    after-sales/        # Yêu cầu bảo hành, đổi trả
    management/         # UI/model quản trị dùng chung
      products/         # Quản lý sản phẩm
      promotions/       # Quản lý khuyến mãi
      users/            # Quản lý tài khoản
      taxonomy/         # Thương hiệu, danh mục
      dashboard/        # Tổng quan vận hành/admin
  shared/
    api/                # HTTP client: cookie JWT, CSRF, refresh
    components/         # UI dùng chung
    storage/            # Repository local và dữ liệu seed
    theme/              # Theme và design tokens
    lib/                # Format, lỗi và tiện ích chung
    types/              # Schema database local dùng chung
    testing/            # Tiện ích phục vụ test hiện có
```

Tìm một chức năng trong `modules/<tên>`; page ở `pages`, component ở `components`,
gọi API hoặc adapter ở `api`, type/schema ở `model`, dữ liệu mẫu ở `fixtures`.
Ví dụ: đăng nhập nằm ở `modules/auth/pages/LoginPage.tsx`, API Google nằm ở
`modules/auth/api/authService.ts`, hồ sơ ở `modules/account/api/profileService.ts`.
Import nội bộ dùng `@/` thay cho đường dẫn `../../..`. Test unit nằm cạnh service;
test phối hợp nhiều module ở `app`, E2E vẫn ở `tests/e2e`.

Các adapter local được tách theo module; `app/createLocalServices.ts` chỉ ghép chúng.
Auth runtime tiếp tục gọi backend JWT. Refactor này giữ UI, route, key localStorage
và các chức năng đang có. Quy tắc làm việc nằm trong [AGENTS.md](AGENTS.md).

## Chạy kiểm tra

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
# E2E mới giả lập API và Google SDK:
$env:VITE_GOOGLE_CLIENT_ID='e2e-test-client'
npm.cmd exec -- playwright test tests/e2e/auth-api.spec.ts
```

Các E2E prototype cũ dùng local auth và chưa được chuyển sang API. Unit test local
adapter vẫn kiểm tra catalog, giỏ hàng và hồ sơ. Google thật cần kiểm tra bằng
Client ID của bạn; bộ E2E không gọi tài khoản Google.

Bộ E2E catalog/search cũ còn một số selector không khớp UI hiện tại, như tìm
`textbox` thay vì `searchbox` và tên nút gallery cũ. Đợt chuyển module giữ nguyên
phần xử lý/JSX của giao diện; các selector này cần được đồng bộ riêng.

Production cần SPA fallback về index.html và reverse proxy `/api/v1` tới backend,
hoặc đặt VITE_API_BASE_URL là URL backend cùng CORS_ALLOWED_ORIGINS phù hợp.
