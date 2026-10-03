import {
  Box,
  Button,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { Link, useSearchParams } from "react-router-dom";
import { prototypeOrders } from "../../mocks/checkout";
import type { Portal } from "../types/database";
import { dateTime, money } from "../lib/format";
import { StatusBadge } from "./StatusBadge";
import { EmptyState } from "./Feedback";
import { OrderProducts } from "../../portals/customer/components/CheckoutSummary";

const filters = [
  { value: "all", label: "Tất cả" },
  { value: "pending", label: "Chờ xác nhận" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "packing", label: "Đóng gói" },
  { value: "shipping", label: "Đang giao" },
  { value: "delivered", label: "Đã giao" },
  { value: "cancelled", label: "Đã hủy" },
];

export function PrototypeOrderHistory({
  portal,
  compact = false,
}: {
  portal: Portal;
  compact?: boolean;
}) {
  const [params, setParams] = useSearchParams();
  const customer = portal === "customer";
  const requested = params.get("status") ?? "all";
  const status = filters.some((filter) => filter.value === requested)
    ? requested
    : "all";
  const search = params.get("q") ?? "";
  const orders = prototypeOrders.filter(
    (order) =>
      (!customer || order.userId === "customer-1") &&
      (compact ||
        ((status === "all" || order.status === status) &&
          order.id.toLowerCase().includes(search.toLowerCase()))),
  );
  const orderBase = customer ? "/account/orders" : "/management/orders";
  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value && value !== "all") next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };
  return (
    <Stack spacing={3}>
      <Box>
        <Typography
          variant={compact ? "h3" : "h1"}
          component={compact ? "h2" : "h1"}
        >
          {compact
            ? "Đơn hàng gần đây"
            : customer
              ? "Đơn hàng của bạn"
              : "Đơn hàng"}
        </Typography>
        {!compact && (
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Theo dõi thông tin và trạng thái đơn hàng.
          </Typography>
        )}
      </Box>
      {!compact && (
        <>
          <Paper variant="outlined" sx={{ minWidth: 0 }}>
            <Tabs
              value={status}
              onChange={(_, value: string) => updateParam("status", value)}
              variant="scrollable"
              scrollButtons="auto"
              aria-label="Lọc trạng thái đơn hàng"
            >
              {filters.map((filter) => (
                <Tab
                  key={filter.value}
                  label={filter.label}
                  value={filter.value}
                  sx={{ minHeight: 52 }}
                />
              ))}
            </Tabs>
          </Paper>
          <TextField
            label="Tìm theo mã đơn"
            value={search}
            onChange={(event) => updateParam("q", event.target.value)}
            placeholder="Nhập mã đơn hàng"
            sx={{ maxWidth: 440 }}
          />
        </>
      )}
      {!orders.length && (
        <Paper variant="outlined">
          <EmptyState
            title="Chưa có đơn trong mục này"
            description="Chọn trạng thái khác hoặc xóa từ khóa để xem đơn hàng."
          />
          <Button onClick={() => setParams({})} sx={{ m: 2 }}>
            Xem tất cả đơn hàng
          </Button>
        </Paper>
      )}
      {orders.slice(0, compact ? 5 : orders.length).map((order) => (
        <Paper
          key={order.id}
          component="article"
          variant="outlined"
          sx={{ overflow: "hidden" }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            gap={1.5}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            sx={{
              p: 2,
              bgcolor: "background.default",
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box>
              <Typography fontWeight={600}>{order.id.toUpperCase()}</Typography>
              <Typography variant="body2" color="text.secondary">
                {dateTime(order.createdAt)}
                {!customer && ` · ${order.address.recipient}`}
              </Typography>
            </Box>
            <StatusBadge status={order.status} />
          </Stack>
          <Stack spacing={2.5} sx={{ p: { xs: 2, sm: 3 } }}>
            {!compact && <OrderProducts items={order.items} />}
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              gap={2}
              alignItems={{ sm: "center" }}
            >
              <Box>
                <Typography variant="body2" color="text.secondary">
                  {order.paymentMethod === "cod"
                    ? "Thanh toán khi nhận hàng"
                    : "Thanh toán bằng QR"}
                </Typography>
                <Typography fontWeight={600}>
                  Tổng tiền: {money(order.total)}
                </Typography>
              </Box>
              <Stack direction="row" gap={1} flexWrap="wrap">
                <Button
                  component={Link}
                  to={`${orderBase}/${order.id}`}
                  variant="outlined"
                  aria-label={`Xem chi tiết đơn ${order.id}`}
                >
                  Xem chi tiết
                </Button>
                {customer &&
                  order.paymentMethod === "qr" &&
                  order.paymentStatus === "pending" &&
                  order.status !== "cancelled" && (
                    <Button
                      component={Link}
                      to={`/orders/${order.id}/payment`}
                      variant="contained"
                    >
                      Thanh toán
                    </Button>
                  )}
                {customer && order.status === "delivered" && (
                  <Button
                    component={Link}
                    to={`${orderBase}/${order.id}/review/${order.items[0].id}`}
                    variant="contained"
                  >
                    Đánh giá
                  </Button>
                )}
                {customer && order.status === "delivered" && (
                  <Button
                    component={Link}
                    to={`/account/after-sales/new?orderId=${order.id}&itemId=${order.items[0].id}`}
                    variant="outlined"
                  >
                    Bảo hành / đổi trả
                  </Button>
                )}
              </Stack>
            </Stack>
          </Stack>
        </Paper>
      ))}
      {compact && (
        <Button
          component={Link}
          to={orderBase}
          sx={{ alignSelf: "flex-start" }}
        >
          Xem tất cả đơn hàng
        </Button>
      )}
    </Stack>
  );
}
