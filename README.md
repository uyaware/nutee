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
| Giỏ hàng                | GET/DELETE `/api/v1/cart`, POST `/api/v1/cart/items`, PUT/DELETE `/api/v1/cart/items/{variantId}` |

Đăng ký chỉ cần email và mật khẩu; backend tạo CUSTOMER và cấp cookie đăng nhập.
Mật khẩu từ 12 ký tự, tối đa 72 byte UTF-8. Sau đăng ký, chuyển tới hồ sơ hoặc
trang đích hợp lệ đã chọn. Hồ sơ đọc `/account/profile` và cập nhật tên, số điện thoại qua
PUT cùng đường dẫn; email dùng đăng nhập được giữ chỉ đọc.

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

Giỏ hàng đã nối API thật theo tài khoản đăng nhập: thêm đúng variant đang chọn,
cộng số lượng cùng variant, giữ riêng các cấu hình của cùng sản phẩm, đổi số lượng,
xóa từng dòng hoặc toàn bộ giỏ sau xác nhận. Header cập nhật tổng số lượng;
chọn/bỏ chọn từng variant sẽ cập nhật tạm tính và danh sách chuyển sang checkout.
Giá, ảnh, SKU và tồn kho lấy từ backend. Các dòng hết hàng/ngừng bán vẫn hiển thị
để kiểm tra và xóa. Khách chưa đăng nhập được chuyển tới login với variant đã chọn
trong URL quay lại; không có guest cart trong browser storage.
Tài liệu: [Cart API](https://github.com/uyaware/nutee_be/blob/main/docs/cart-api.md).
Checkout chỉ dùng các variant đã chọn, tạo đơn qua API với khóa idempotency.
COD chuyển tới xác nhận; payOS tạo và hiển thị mã QR ngay trong checkout.

Sổ địa chỉ đã nối API thật: thêm/sửa tỉnh/thành, phường/xã,
số nhà/tên đường; chọn mặc định và xóa sau xác nhận. Địa chỉ đầu tiên tự làm mặc định;
xóa mặc định chọn địa chỉ còn lại. Checkout đọc sổ địa chỉ, ưu tiên mặc định và gửi `addressId`;
tên/số điện thoại lấy từ hồ sơ user. Lỗi lưu giữ lại nội dung form, không báo thành công giả.
Trang `/account/setup` có thể lưu hồ sơ và địa chỉ tùy chọn trong cùng request nguyên tử.
Chi tiết: [Account API](https://github.com/uyaware/nutee_be/blob/main/docs/account-api.md)
(workspace: `backend/docs/account-api.md`).

Promotion đã áp dụng tự động trên catalog, biến thể, giỏ hàng và bộ lọc giá. Giá gốc được
hiển thị khi có giảm. Voucher nhập/chọn tại checkout; backend tính promotion trước rồi
voucher trên tiền hàng còn lại, kiểm tra điều kiện và hạn mức. Xem trước không trừ lượt.
Checkout báo giá qua `/checkout/quote`, giữ form và ẩn tổng cũ khi lỗi; phí giao đọc từ `/checkout/config`.
Quản trị tại `/management/promotions` và `/management/vouchers`: CRUD, bật/tắt, thời hạn,
chọn sản phẩm hoặc cấp voucher cho khách. Các phần này dùng API thật và chỉ cho ADMIN.
Seed: `backend/scripts/seed-discounts.ps1`; [tài liệu ưu đãi](https://github.com/uyaware/nutee_be/blob/main/docs/discounts-api.md).

Các màn hình quản trị đơn hàng, giao hàng, hoàn tiền và các nghiệp vụ quản trị còn lại
giữ nguyên giao diện với dữ liệu rỗng vì backend chưa có API nghiệp vụ tương ứng. Các model rỗng
chỉ phục vụ hiển thị, không phải API giả hay fallback khi API lỗi. Thao tác lưu chưa hỗ trợ
phải báo lỗi, không ghi vào trình duyệt hoặc giả lập thành công. Luồng khôi phục mật khẩu gọi API thật.
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
qua `/api/v1/auth/social/google/link`. UI tại **Tài khoản → Bảo mật** hiển thị email cần
khớp, trạng thái liên kết và nút Google. Mỗi lần thử dùng nonce mới; lỗi liên kết không
tạo phiên đăng nhập khác hoặc tự gộp tài khoản.

## Cấu trúc

```text
src/
  app/                  # Router, layout và khởi tạo API client
    services.ts         # Khởi tạo client và auth/profile/catalog/cart API
  modules/
    auth/               # API, form, Google SDK, route guard, session hook
    account/            # Hồ sơ, sổ địa chỉ qua API và liên kết Google
    catalog/            # API cho trang chủ, tìm kiếm, bộ lọc, chi tiết và variants
    cart/               # API giỏ theo variant, số lượng, chọn dòng, xóa và trạng thái tồn kho
    checkout/           # Báo giá, đặt hàng thật, phí giao và thanh toán payOS
    orders/             # Lịch sử/chi tiết đơn chính chủ và API thanh toán
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

Thanh toán dùng `PaymentGateway`/`PayOSAdapter` ở backend; frontend hiển thị mã
VietQR tại checkout cùng số tài khoản, chủ tài khoản, BIN ngân hàng, số tiền và nội dung
chuyển khoản từ API. Nội dung cho QR mới là mã đơn; tải lại trang vẫn lấy dữ liệu
đã lưu trên `orders`. Thông tin chuyển khoản ẩn khi đơn hết hạn hoặc đã kết thúc.
Phí giao mặc định 25.000đ, cấu hình backend bằng
`CHECKOUT_SHIPPING_FEE` hoặc `app.payment.shipping-fee`. Không đưa API/checksum key vào Vite.
Hướng dẫn kênh merchant và webhook: `backend/docs/payments-api.md` trong workspace.
QR chỉ khả dụng khi backend bật và cấu hình payOS; COD vẫn hoạt động. Query `payment=paid`
hay `status=paid` không đánh dấu thanh toán. Retry sau lỗi mạng giữ nguyên khóa/nội dung đơn.
