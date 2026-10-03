# NUTEE frontend — M0–M5 prototype

React + Vite + TypeScript strict, Material UI/MUI Icons, TanStack Query, React Hook Form/Zod. Giao diện tiếng Việt, VND; palette xanh/than theo `public/logo_nutee.png`.

## Chạy trên Windows PowerShell

Node 22.12+ (môi trường hiện tại 22.13.0).

```powershell
npm.cmd install
npm.cmd run dev
```

Sau lần cài đầu tiên, dùng `npm.cmd ci` để cài đúng phiên bản dependencies trong `package-lock.json` trên máy khác hoặc CI.

Mở `http://localhost:5173/` cho customer; `http://localhost:5173/management` cho staff/admin. Chạy cùng server/origin để chia sẻ localStorage. Auth riêng tại `/login` và `/management/login`. Header storefront: logo về trang chủ + menu Danh mục bên trái, tìm kiếm ở giữa, giỏ/đăng nhập bên phải. Mobile đưa tìm kiếm xuống hàng thứ hai. Các trang `/demo`, `/management/demo`, `/design-system` đã được bỏ; khôi phục/reset chỉ xuất hiện khi đọc dữ liệu bị lỗi.

Catalog tại `/products`, chi tiết tại `/products/:id`. Tìm theo tên/SKU/hãng/cấu hình; lọc danh mục/hãng/giá/còn hàng/thông số, sắp xếp và phân trang. Bộ lọc nằm trong URL nên reload hoặc chia sẻ link giữ lựa chọn. Mobile dùng Drawer. Gallery/thông số/đánh giá hiện chỉ đọc.

M3: thêm sản phẩm từ trang chi tiết vào `/cart`, tăng/giảm/xóa và lưu giỏ sau reload. Guest chỉ lưu ID sản phẩm/số lượng; login customer gộp với giỏ tài khoản, kiểm tra tồn kho và báo điều chỉnh. Logout giữ giỏ tài khoản; giỏ khách mới rỗng. Hai customer có giỏ riêng; phiên backoffice giữ độc lập.

Tài khoản có navigation hồ sơ/địa chỉ/bảo mật/đơn hàng. `/account/addresses` hỗ trợ thêm/sửa/xóa/chọn mặc định, validation, xác nhận xóa và conflict giữa các tab. `/register` tạo customer demo với mật khẩu chung bên dưới. `/verify-email`, `/forgot-password`, `/reset-password`, `/account/security` là màn hướng dẫn giới hạn auth demo: chưa gửi email, đổi mật khẩu hay OAuth. Xem [nghiệm thu M3](docs/m3-acceptance.md).

M4 là prototype theo yêu cầu: giỏ hàng có checkbox từng món/chọn tất cả; chỉ sản phẩm được chọn được tính vào tạm tính và chuyển sang checkout. `/checkout` hiển thị giao hàng và lựa chọn COD/QR trên cùng màn, sau đó kiểm tra/xác nhận đơn. Mở trực tiếp `/checkout` vẫn có hai sản phẩm mẫu, hai địa chỉ và mã NUTEE100 có sẵn. Nút đặt hàng mở `/orders/demo-cod/success` hoặc `/orders/demo-qr/payment`; màn QR có nút xem trạng thái chờ/thành công/thất bại/hết hạn. Sản phẩm, tổng tiền và địa chỉ được chuyển qua các màn bằng state điều hướng để xem prototype, không tạo/lưu đơn hoặc cập nhật giỏ/tồn kho. `/account/orders` và backoffice vẫn hiển thị danh sách đơn mẫu cố định. Các route customer yêu cầu đăng nhập demo. Không thêm hoặc chạy test. Xem [phạm vi M4](docs/m4-prototype.md).

M5 tiếp tục ở mức prototype: `/management/orders` có bảng tìm kiếm/lọc/sắp xếp/phân trang; chi tiết đơn có nút xác nhận → đóng gói → giao → đã giao, hủy và ghi chú trong timeline. `/account/after-sales` có danh sách/chi tiết và form tạo bảo hành/đổi trả từ sản phẩm thuộc đơn mẫu đã giao; `/management/after-sales` có tiếp nhận → kiểm tra → chấp thuận hoặc từ chối → xử lý → hoàn tất. Menu và các nút liên kết giữa đơn/hậu mãi đã nối đủ. Thao tác chỉ đổi màn hình bằng URL/state, không ghi repository hay đồng bộ portal; dashboard dùng cùng fixture với danh sách. Không viết/chạy test trong M5. Xem [phạm vi và luồng M5](docs/m5-prototype.md).

| Role     | Email               | Mật khẩu demo |
| -------- | ------------------- | ------------- |
| Customer | customer@nutee.demo | 12345678      |
| Staff    | staff@nutee.demo    | 12345678      |
| Admin    | admin@nutee.demo    | 12345678      |

Customer thứ hai: `customer2@nutee.demo`, cùng mật khẩu; dùng kiểm tra ownership. Phiên mỗi portal 8 giờ. Không dùng thông tin đăng nhập thật.

## Kiểm tra

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run format:check
npm.cmd run build
npm.cmd run test:e2e
npm.cmd run preview
```

E2E dùng Chrome đã cài (`channel: chrome`) và tự mở Vite port 4173. Nếu chưa có Chrome, cài Chrome hoặc chuyển cấu hình Playwright sang Chromium và chạy `npx.cmd playwright install chromium`.

`build` tạo `dist/`; preview tại port 4173. Production static hosting cần fallback mọi deep link về `index.html`. Dev/preview là hai origin theo port: dữ liệu demo ở 5173 không tự chuyển sang 4173. Dùng `localhost` nhất quán; địa chỉ IP LAN là origin khác và Web Locks có thể không có trên HTTP LAN.

## Tổ chức

- `src/app`: providers/root routing, storage cache invalidation.
- `src/portals/customer`, `src/portals/backoffice`: route trees, layouts, auth entry riêng, lazy routes.
- `src/shared`: token/theme, DTO/schema, permissions/guards, components, format.
- `src/services`: async contracts/orchestration; UI không gọi localStorage.
- `src/repositories/local`: persistence/session adapter, revision, Web Locks, reset/export.
- `src/mocks`: relational seed và test utilities.
- `design-system/nutee`: master + catalog/dashboard/checkout overrides.
