# NUTEE frontend

React, Vite, TypeScript, Material UI, TanStack Query và React Hook Form/Zod.

Giữ giao diện HTML/JSX, CSS, component, router và JS của các module. Chức năng đã có API
gọi backend trực tiếp. Không dùng service localStorage/sessionStorage hoặc database trình duyệt.
Dữ liệu người dùng từ API chỉ giữ trong bộ nhớ giao diện, không đồng bộ xuống browser storage.

## Chạy ứng dụng

Yêu cầu Node 22.12+ và backend Java 21 đang chạy tại http://localhost:8080.

```powershell
npm.cmd install
npm.cmd run dev
```

Vite chạy tại http://localhost:5173, proxy `/api/v1` tới backend.
Sao chép `.env.example` thành `.env.local` khi cần tùy chỉnh:

```dotenv
VITE_API_BASE_URL=/api/v1
VITE_GOOGLE_CLIENT_ID=
```

Client ID phải giống `GOOGLE_CLIENT_ID` ở backend, với `GOOGLE_AUTH_ENABLED=true`.
Restart backend và Vite sau khi đổi cấu hình. Xem [hướng dẫn Google Auth](https://github.com/uyaware/nutee_be/blob/main/docs/google-auth.md)
(trong workspace: `backend/docs/google-auth.md`).

## Chức năng đang hỗ trợ

| Chức năng               | API backend                                                               |
| ----------------------- | ------------------------------------------------------------------------- |
| Đăng ký                 | POST `/api/v1/auth/register`                                              |
| Đăng nhập               | POST `/api/v1/auth/login`                                                 |
| Google login            | GET `/api/v1/auth/social/google/nonce`, POST `/api/v1/auth/social/google` |
| Hồ sơ và phiên hiện tại | GET `/api/v1/auth/me`                                                     |
| Quên/đặt lại mật khẩu   | POST `/api/v1/auth/forgot-password`, POST `/api/v1/auth/reset-password`   |
| Refresh và đăng xuất    | POST `/api/v1/auth/refresh`, POST `/api/v1/auth/logout`                   |

Đăng ký chỉ cần email và mật khẩu; backend tạo CUSTOMER và cấp cookie đăng nhập.
Mật khẩu từ 12 ký tự, tối đa 72 byte UTF-8. Sau đăng ký, chuyển tới hồ sơ hoặc
trang đích hợp lệ đã chọn. Hồ sơ chỉ hiển thị dữ liệu `/auth/me`; chưa có API cập nhật hồ sơ.

Trang chủ, danh sách và chi tiết sản phẩm đã nối API catalog thật, giữ giao diện hiện có.
Trang chi tiết chọn `defaultVariantId` từ backend; đổi variant sẽ đổi giá, tồn kho,
ảnh theo `imageId`, thông số riêng và đặt lại số lượng. SKU là mã hiển thị, variant ID
là định danh nội bộ. Thẻ sản phẩm hiển thị cấu hình ứng với giá backend trả về.
Brand, category và bộ lọc lấy từ API;
tìm kiếm, lọc và phân trang xử lý ở backend. Không còn `emptyCatalog`.
Các API chính: GET `/api/v1/products`, `/products/{id}`, `/products/facets`,
`/products/{id}/variants`, `/products/{id}/reviews`, `/brands`, `/categories`.
Seed và tài liệu: [Catalog API](https://github.com/uyaware/nutee_be/blob/main/docs/catalog-api.md)
(workspace: `backend/docs/catalog-api.md`).

Seed mới tạo 100 sản phẩm và 300 variants trong PostgreSQL; frontend không chứa
seed hoặc bản sao catalog trong browser storage. Chạy seed từ repository backend
sau khi Flyway khởi tạo schema. Test trình duyệt kiểm tra đổi variant, biến thể mặc
định hết hàng và hoạt động khi localStorage/sessionStorage bị chặn.

Các màn hình giỏ hàng, đơn hàng, địa chỉ, thanh toán và nghiệp vụ quản trị
giữ nguyên giao diện với dữ liệu rỗng vì backend chưa có API nghiệp vụ tương ứng. Các model rỗng
chỉ phục vụ hiển thị, không phải API giả hay fallback khi API lỗi. Thao tác lưu chưa hỗ trợ
phải báo lỗi, không ghi vào trình duyệt hoặc giả lập thành công. Hồ sơ đọc từ `/auth/me`;
form cập nhật vẫn được giữ nhưng chờ API cập nhật tương ứng. Luồng khôi phục mật khẩu gọi API thật.
Để thử gửi email, cấu hình SMTP rồi bật `PASSWORD_RESET_ENABLED=true` ở backend.

## Xác thực và HTTP client

Backend đặt `accessToken`, `refreshToken` trong cookie HttpOnly, Path=/api/v1.
Client luôn gửi `credentials: include`; refresh/logout không có token trong body.
Client lấy CSRF từ `/auth/csrf`, tự gửi header và refresh/retry khi access token hết hạn.
Login/logout được tuần tự hóa, kể cả giữa các tab khi trình duyệt hỗ trợ Web Locks.

```typescript
import { api } from "@/app/services";

const user = await api.request("/auth/me");
await api.request("/auth/logout", { method: "POST", authenticated: false });
```

API lỗi hiển thị trên giao diện, không chuyển sang local. Google credential chỉ dùng
để đổi lấy phiên NUTEE. Email đã đăng ký cần đăng nhập bằng mật khẩu trước khi liên kết
qua `/api/v1/auth/social/google/link`; hiện chưa có UI liên kết.

## Cấu trúc

```text
src/
  app/                  # Router, layout và khởi tạo API client
    services.ts         # Client, auth/profile/catalog API và model rỗng cho UI chưa có API
  modules/
    auth/               # API, form, Google SDK, route guard, session hook
    account/            # Giữ giao diện tài khoản, hồ sơ đọc từ /auth/me
    catalog/            # API cho trang chủ, tìm kiếm, bộ lọc, chi tiết và variants
    cart/               # Giữ giao diện giỏ hàng, dữ liệu rỗng
    checkout/           # Giữ giao diện checkout/thanh toán
    orders/             # Giữ giao diện đơn hàng, dữ liệu rỗng
    after-sales/        # Giữ giao diện bảo hành/đổi trả, dữ liệu rỗng
    management/         # Giữ giao diện quản trị, dữ liệu rỗng
  shared/
    api/                # Cookie JWT, CSRF và refresh
    components/         # UI dùng chung
    theme/              # Theme và design tokens
    lib/                # Tiện ích
```

Quy tắc làm việc: [AGENTS.md](AGENTS.md). Bỏ service browser storage không đồng nghĩa xóa giao diện.

## Kiểm tra

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
$env:VITE_GOOGLE_CLIENT_ID='e2e-test-client'
npm.cmd exec -- playwright test
```

Test dùng HTTP/Google SDK giả lập. Test Google cũng chạy khi truy cập
localStorage/sessionStorage bị chặn. Google thật cần tài khoản và cấu hình Console.
Production cần HTTPS, `AUTH_SECURE_COOKIE=true`, SPA fallback và reverse proxy
`/api/v1` tới backend; origin API riêng cần cấu hình CORS chính xác.
