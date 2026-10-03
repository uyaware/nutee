import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import { Link } from "react-router-dom";
import { prototypeOrders } from "../../../mocks/checkout";
import { prototypeAfterSales } from "../../../mocks/operations";
import { useSession } from "../../../shared/auth/useSession";
import { roleLabels } from "../../../shared/auth/permissions";
import { OrdersPage } from "../../../shared/components/OrdersPage";
import { tokens } from "../../../shared/theme/tokens";
import AdminDashboardPage from "./AdminDashboardPage";

export default function DashboardPage() {
  const session = useSession("backoffice");
  if (session.data?.role === "admin") return <AdminDashboardPage />;
  const data = {
    orders: prototypeOrders.length,
    pending: prototypeOrders.filter((order) => order.status === "pending")
      .length,
    afterSales: prototypeAfterSales.filter(
      (request) =>
        request.status === "pending" || request.status === "reviewing",
    ).length,
    paidRevenue: prototypeOrders
      .filter(
        (order) =>
          order.paymentStatus === "paid" && order.status !== "cancelled",
      )
      .reduce((sum, order) => sum + order.total, 0),
  };
  const metrics = [
    {
      label: "Tổng đơn vận hành",
      value: data.orders,
      note: "Toàn bộ đơn hàng",
    },
    {
      label: "Chờ xác nhận",
      value: data.pending,
      note: "Đơn đang chờ xác nhận",
    },
    {
      label: "Yêu cầu cần xem",
      value: data.afterSales,
      note: "Yêu cầu đang chờ hoặc đang được kiểm tra",
    },
  ];
  return (
    <Stack spacing={4}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        spacing={2}
      >
        <Box>
          <Typography variant="overline" color="text.secondary">
            WORKSPACE / TỔNG QUAN
          </Typography>
          <Typography variant="h2" component="h1">
            Chào {session.data?.name}.
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Không gian vận hành dành cho{" "}
            {roleLabels[session.data!.role].toLowerCase()}.
          </Typography>
        </Box>
        <Button
          component={Link}
          to="/management/orders"
          variant="outlined"
          endIcon={<ArrowForwardRounded />}
          sx={{ alignSelf: "flex-start" }}
        >
          Xem đơn hàng
        </Button>
      </Stack>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            lg: `repeat(${metrics.length}, minmax(0, 1fr))`,
          },
          gap: 2.5,
        }}
      >
        {metrics.map((m, i) => (
          <Paper
            key={m.label}
            variant="outlined"
            sx={{
              p: 3,
              ...(i === 0 ? { bgcolor: tokens.color.blueTint } : {}),
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {m.label}
            </Typography>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: "clamp(1.6rem, 2.5vw, 2rem)",
                my: 2,
                fontVariantNumeric: "tabular-nums",
                color: i === 0 ? "primary.main" : "text.primary",
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
      <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
        <Button
          component={Link}
          to="/management/orders?status=pending"
          variant="contained"
        >
          Xử lý đơn chờ xác nhận
        </Button>
        <Button
          component={Link}
          to="/management/after-sales?status=pending"
          variant="outlined"
        >
          Tiếp nhận yêu cầu
        </Button>
      </Stack>
      <OrdersPage portal="backoffice" compact />
    </Stack>
  );
}
