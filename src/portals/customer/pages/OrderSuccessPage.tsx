import { Alert, Box, Button, Paper, Stack, Typography } from "@mui/material";
import CheckCircleOutlineRounded from "@mui/icons-material/CheckCircleOutlineRounded";
import {
  Link,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { findPrototypeOrder } from "../../../mocks/checkout";
import { EmptyState } from "../../../shared/components/Feedback";
import { OrderProducts, OrderTotals } from "../components/CheckoutSummary";

export default function OrderSuccessPage() {
  const { id } = useParams();
  const location = useLocation();
  const [params] = useSearchParams();
  const order = findPrototypeOrder(id, location.state);
  if (!order || order.userId !== "customer-1")
    return (
      <EmptyState
        title="Không tìm thấy đơn hàng"
        description="Bạn có thể xem các đơn có sẵn trong lịch sử đơn hàng."
      />
    );
  const paid =
    order.paymentStatus === "paid" || params.get("payment") === "paid";
  return (
    <Paper
      variant="outlined"
      sx={{ maxWidth: 760, mx: "auto", p: { xs: 2.5, sm: 5 } }}
    >
      <Stack spacing={3}>
        <Stack spacing={2} alignItems="center" textAlign="center">
          <CheckCircleOutlineRounded color="success" sx={{ fontSize: 72 }} />
          <Typography variant="h1">Đặt hàng thành công!</Typography>
          <Typography color="text.secondary">
            Cảm ơn bạn đã chọn NUTEE. Đơn hàng của bạn đang chờ xác nhận.
          </Typography>
          <Typography fontWeight={600}>
            Mã đơn: {order.id.toUpperCase()}
          </Typography>
        </Stack>
        <Alert
          severity={
            paid || order.paymentMethod === "cod" ? "success" : "warning"
          }
        >
          {order.paymentMethod === "cod"
            ? "Thanh toán khi nhận hàng. Dự kiến giao ngày 05–07/10/2026."
            : paid
              ? "Thanh toán QR thành công · Dự kiến giao ngày 05–07/10/2026."
              : "Đơn hàng đang chờ thanh toán QR."}
        </Alert>
        <Box>
          <Typography variant="h3" component="h2" sx={{ mb: 1 }}>
            Địa chỉ nhận hàng
          </Typography>
          <Typography>
            {order.address.recipient} · {order.address.phone}
          </Typography>
          <Typography color="text.secondary">{order.address.line}</Typography>
        </Box>
        <OrderProducts items={order.items} />
        <OrderTotals quote={order} />
        <Stack direction={{ xs: "column", sm: "row" }} gap={1.5}>
          <Button
            component={Link}
            to={`/account/orders/${order.id}${paid ? "?payment=paid" : ""}`}
            state={location.state}
            variant="contained"
            fullWidth
          >
            Theo dõi đơn hàng
          </Button>
          <Button component={Link} to="/products" variant="outlined" fullWidth>
            Tiếp tục mua sắm
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
