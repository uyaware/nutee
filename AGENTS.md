# Nguyên tắc frontend NUTEE

- Giữ code đơn giản, dễ đọc và dễ tìm theo chức năng; áp dụng KISS, DRY, SOLID thực tế.
- Khi yêu cầu chưa rõ, hỏi người dùng trước khi thêm chức năng hoặc mở rộng phạm vi.
- Mỗi chức năng nằm trong `src/modules/<module>`: `pages`, `components`, `api`,
  `model`, `hooks` khi thực sự có file tương ứng; không tạo thư mục rỗng cho đủ mẫu.
- Backoffice thuộc `modules/management/<feature>`; thành phần quản trị dùng chung
  nằm ngay trong `modules/management/components`, `hooks` hoặc `model`.
- `src/app` chỉ ghép router, layout và các dịch vụ; không đặt nghiệp vụ module vào đây.
- `src/shared` chứa UI, HTTP client, storage và tiện ích dùng chung.
- Import nội bộ dùng alias `@/` trỏ tới `src`; không tạo chuỗi `../../../../`.
- Import trực tiếp file cần dùng; tránh barrel file re-export toàn module gây vòng phụ thuộc.
- Interface/schema/type thuộc module nào thì đặt trong `model` của module đó.
- Không thêm lớp trung gian, service interface hoặc design pattern nếu chưa có nhu cầu cụ thể.
- Không thay đổi UI, URL, storage key, validation hay API contract khi chỉ tổ chức lại file.
- JWT do backend đặt vào cookie HttpOnly; API dùng client chung và giữ CSRF/refresh hiện có.
- Khi bỏ service dùng localStorage, phải giữ HTML/JSX, CSS, component, router và JS giao diện.
  Không xóa hoặc thay cả trang bằng placeholder nếu người dùng không yêu cầu.
- Không dùng service localStorage/sessionStorage hoặc database trình duyệt; không lưu bản sao
  người dùng sau đăng nhập. Chức năng có API phải gọi client chung `/api/v1`, API lỗi phải báo lỗi.
- Chức năng chưa có API giữ nguyên giao diện với dữ liệu rỗng theo lựa chọn của người dùng;
  form có thể giữ draft trong React state, nhưng không giả lập lưu thành công hoặc tự thêm endpoint.
  Mock HTTP chỉ được phép trong test.
- Chỉ hỗ trợ provider đã được yêu cầu; hiện tại là Google, không thêm provider hoặc mock khác.
- Test unit đặt cạnh service/model; test tích hợp giữa module nằm trong `app`;
  test giao diện nằm trong `tests/e2e`. Ưu tiên cập nhật test đang có, không sinh test lặp.
- Không đưa `.env.local`, mật khẩu hoặc token thật vào Git.
