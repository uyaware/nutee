import { useAdminFilters } from "../components/useAdminFilters";
import {
  Box,
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Link } from "react-router-dom";
import { ADMIN_DEMO_NOW, promotionStatus } from "../../../mocks/admin";
import { prototypeOrders } from "../../../mocks/checkout";
import { prototypeAfterSales } from "../../../mocks/operations";
import { money } from "../../../shared/lib/format";
import { useSession } from "../../../shared/auth/useSession";
import { StatusBadge } from "../../../shared/components/StatusBadge";
import { AdminPageHeader, AdminSection } from "../components/AdminUI";
import { useAdminPrototype } from "../components/adminPrototypeContext";

export default function AdminDashboardPage() {
  const { data } = useAdminPrototype();
  const session = useSession("backoffice");
  const { params, update } = useAdminFilters();
  const days = params.get("period") === "7" ? 7 : 30;
  const day = 86400000;
  const end = new Date("2026-10-04T00:00:00+07:00").getTime();
  const start = end - days * day;
  const orders = prototypeOrders.filter(
    (o) =>
      new Date(o.createdAt).getTime() >= start &&
      new Date(o.createdAt).getTime() < end,
  );
  const paid = orders.filter(
    (o) => o.paymentStatus === "paid" && o.status !== "cancelled",
  );
  const paidRevenue = paid.reduce((sum, o) => sum + o.total, 0);
  const requests = prototypeAfterSales.filter(
    (r) => r.status === "pending" || r.status === "reviewing",
  );
  const metrics = [
    {
      label: "Giá trị đơn đã thanh toán",
      value: money(paidRevenue),
      note: "Không gồm đơn đã hủy",
    },
    {
      label: "Đơn hàng trong kỳ",
      value: orders.length,
      note: `Theo ngày tạo đơn · ${days} ngày`,
    },
    {
      label: "Chờ xác nhận trong kỳ",
      value: orders.filter((o) => o.status === "pending").length,
      note: "Cần tiếp nhận và xác nhận",
    },
    {
      label: "Hậu mãi cần xử lý",
      value: requests.length,
      note: "Tất cả yêu cầu chờ / đang kiểm tra",
    },
  ];
  const bucketDays = days === 7 ? 1 : 5;
  const buckets = Array.from({ length: days / bucketDays }, (_, index) => {
    const from = start + index * bucketDays * day;
    const to = from + bucketDays * day;
    const label = new Date(from).toLocaleDateString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      day: "2-digit",
      month: "2-digit",
    });
    const last = new Date(to - day).toLocaleDateString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      day: "2-digit",
      month: "2-digit",
    });
    return {
      label: bucketDays === 1 ? label : `${label}–${last}`,
      value: paid
        .filter(
          (o) =>
            new Date(o.createdAt).getTime() >= from &&
            new Date(o.createdAt).getTime() < to,
        )
        .reduce((sum, o) => sum + o.total, 0),
    };
  });
  const maximum = Math.max(1, ...buckets.map((b) => b.value));
  const statuses = [
    "pending",
    "confirmed",
    "packing",
    "shipping",
    "delivered",
    "cancelled",
  ] as const;
  const lowStock = data.products.filter(
    (p) => p.stock <= 10 && p.status === "published",
  );
  const recent = [...orders]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);
  return (
    <Stack spacing={3}>
      <AdminPageHeader
        title={`Chào ${session.data?.name}.`}
        description="Tổng quan kinh doanh và các công việc cần chú ý."
        action={
          <TextField
            select
            label="Khoảng thời gian"
            value={String(days)}
            onChange={(e) => update("period", e.target.value)}
            sx={{ minWidth: 210 }}
          >
            <MenuItem value="7">7 ngày gần nhất</MenuItem>
            <MenuItem value="30">30 ngày gần nhất</MenuItem>
          </TextField>
        }
      />
      <Typography variant="body2" color="text.secondary">
        Dữ liệu mẫu tại {new Date(ADMIN_DEMO_NOW).toLocaleDateString("vi-VN")}.
        Chỉ số đơn hàng theo ngày tạo đơn; hậu mãi và danh mục thể hiện toàn bộ
        bản xem thử.
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            xl: "repeat(4, minmax(0, 1fr))",
          },
          gap: 2,
        }}
      >
        {metrics.map((m, i) => (
          <Paper
            key={m.label}
            variant="outlined"
            sx={{ p: 3, ...(i === 0 ? { bgcolor: "action.selected" } : {}) }}
          >
            <Typography color="text.secondary">{m.label}</Typography>
            <Typography
              component="p"
              sx={{
                fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
                fontWeight: 700,
                color: i === 0 ? "primary.main" : "text.primary",
                my: 1.5,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {m.value}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {m.note}
            </Typography>
          </Paper>
        ))}
      </Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            xl: "minmax(0, 2fr) minmax(0, 1fr)",
          },
          gap: 3,
        }}
      >
        <AdminSection
          title="Giá trị đơn đã thanh toán theo ngày"
          description="Gộp theo ngày tạo đơn, loại trừ đơn hủy. Số tiền hiển thị bằng VND."
        >
          <Stack
            component="figure"
            sx={{ m: 0 }}
            spacing={2}
            aria-label={`Tổng giá trị ${money(paidRevenue)} trong ${days} ngày`}
          >
            {buckets.map((b) => (
              <Box
                key={b.label}
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "110px minmax(0, 1fr) 120px",
                  },
                  gap: 1,
                  alignItems: "center",
                }}
              >
                <Typography variant="body2">{b.label}</Typography>
                <Box
                  aria-hidden="true"
                  sx={{
                    height: 20,
                    bgcolor: "action.hover",
                    borderRadius: 1,
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      height: "100%",
                      width: `${(b.value / maximum) * 100}%`,
                      bgcolor: "primary.main",
                      borderRadius: 1,
                    }}
                  />
                </Box>
                <Typography
                  variant="body2"
                  fontWeight={600}
                  sx={{
                    textAlign: { sm: "right" },
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {money(b.value)}
                </Typography>
              </Box>
            ))}
            <Typography
              component="figcaption"
              variant="caption"
              color="text.secondary"
            >
              Biểu đồ dữ liệu mẫu · Mỗi hàng là{" "}
              {bucketDays === 1 ? "một ngày" : "5 ngày"}.
            </Typography>
          </Stack>
          <Button
            component={Link}
            to="/management/payments?status=paid"
            sx={{ alignSelf: "flex-start" }}
          >
            Xem giao dịch đã thanh toán
          </Button>
        </AdminSection>
        <AdminSection title="Trạng thái đơn trong kỳ">
          {statuses.map((status) => (
            <Stack
              key={status}
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              gap={2}
            >
              <StatusBadge status={status} />
              <Button
                component={Link}
                to={`/management/orders?status=${status}`}
                aria-label={`Xem đơn ${status}`}
                sx={{ fontVariantNumeric: "tabular-nums" }}
              >
                {orders.filter((o) => o.status === status).length} đơn
              </Button>
            </Stack>
          ))}
          <Button
            component={Link}
            to="/management/after-sales?status=pending"
            variant="outlined"
          >
            Tiếp nhận hậu mãi
          </Button>
        </AdminSection>
      </Box>
      <AdminSection title="Quản lý nhanh">
        <Stack direction="row" gap={1} flexWrap="wrap">
          <Chip
            variant="outlined"
            label={`${data.products.filter((p) => p.status === "published").length} sản phẩm công khai`}
          />
          <Chip
            variant="outlined"
            label={`${data.promotions.filter((p) => promotionStatus(p) === "active").length} mã đang áp dụng`}
          />
          <Chip
            variant="outlined"
            label={`${data.users.filter((u) => u.isActive).length} tài khoản hoạt động`}
          />
        </Stack>
        <Stack direction="row" gap={1.5} flexWrap="wrap">
          {[
            { to: "products/new", label: "Thêm sản phẩm" },
            { to: "brands", label: "Thương hiệu" },
            { to: "categories", label: "Danh mục" },
            { to: "promotions", label: "Khuyến mãi" },
            { to: "users", label: "Tài khoản" },
            { to: "payments", label: "Giao dịch" },
          ].map((link) => (
            <Button
              key={link.to}
              component={Link}
              to={`/management/${link.to}`}
              variant="outlined"
            >
              {link.label}
            </Button>
          ))}
        </Stack>
      </AdminSection>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            xl: "minmax(0, 2fr) minmax(0, 1fr)",
          },
          gap: 3,
          alignItems: "start",
        }}
      >
        <AdminSection title="Đơn gần đây trong kỳ">
          {recent.length ? (
            recent.map((order) => (
              <Stack
                key={order.id}
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                gap={1}
                alignItems={{ sm: "center" }}
              >
                <Box>
                  <Typography fontWeight={600}>
                    {order.address.recipient}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {order.id.toUpperCase()} · {money(order.total)}
                  </Typography>
                </Box>
                <StatusBadge status={order.status} />
                <Button component={Link} to={`/management/orders/${order.id}`}>
                  Xem đơn
                </Button>
              </Stack>
            ))
          ) : (
            <Typography color="text.secondary">
              Chưa có đơn trong khoảng thời gian này.
            </Typography>
          )}
          <Button
            component={Link}
            to="/management/orders"
            sx={{ alignSelf: "flex-start" }}
          >
            Tất cả đơn hàng
          </Button>
        </AdminSection>
        <AdminSection
          title="Sản phẩm tồn thấp"
          description="Sản phẩm công khai còn tối đa 10 chiếc trong bản xem thử."
        >
          {lowStock.length ? (
            lowStock.slice(0, 5).map((p) => (
              <Stack
                key={p.id}
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                gap={1}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography fontWeight={600}>{p.name}</Typography>
                  <Typography
                    variant="caption"
                    color={p.stock ? "text.secondary" : "warning.main"}
                  >
                    {p.stock ? `Còn ${p.stock} chiếc` : "Hết hàng"}
                  </Typography>
                </Box>
                <Button
                  component={Link}
                  to={`/management/products/${p.id}/edit`}
                >
                  Sửa
                </Button>
              </Stack>
            ))
          ) : (
            <Typography color="text.secondary">
              Chưa có sản phẩm tồn thấp.
            </Typography>
          )}
        </AdminSection>
      </Box>
    </Stack>
  );
}
