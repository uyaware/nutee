import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import QrCode2Rounded from "@mui/icons-material/QrCode2Rounded";
import CheckCircleOutlineRounded from "@mui/icons-material/CheckCircleOutlineRounded";
import TimerOutlined from "@mui/icons-material/TimerOutlined";
import {
  Link,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { paymentLabels, findPrototypeOrder } from "../../../mocks/checkout";
import { money } from "../../../shared/lib/format";
import { EmptyState } from "../../../shared/components/Feedback";
import { OrderTotals } from "../components/CheckoutSummary";

export default function PaymentPage() {
  const { id } = useParams();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const order = findPrototypeOrder(id, location.state);
  if (!order || order.userId !== "customer-1")
    return (
      <EmptyState
        title="Không tìm thấy đơn hàng"
        description="Chọn một đơn trong lịch sử để tiếp tục."
      />
    );
  if (order.paymentMethod !== "qr")
    return (
      <Stack spacing={2}>
        <Alert severity="info">
          Đơn này thanh toán khi nhận hàng, không cần quét mã QR.
        </Alert>
        <Button
          component={Link}
          to={`/account/orders/${order.id}`}
          state={location.state}
        >
          Xem đơn hàng
        </Button>
      </Stack>
    );
  const requestedStatus = params.get("status");
  const status =
    requestedStatus && Object.hasOwn(paymentLabels, requestedStatus)
      ? (requestedStatus as keyof typeof paymentLabels)
      : order.paymentStatus;
  const pending = status === "pending";
  return (
    <Stack spacing={3} sx={{ maxWidth: 1000, mx: "auto" }}>
      <Box>
        <Typography variant="h1">Thanh toán đơn hàng</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Mã đơn {order.id.toUpperCase()} · Chuyển khoản bằng mã QR
        </Typography>
      </Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            md: "minmax(0, 1fr) 340px",
          },
          gap: 3,
          alignItems: "start",
        }}
      >
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 4 } }}>
          <Stack spacing={3} alignItems="center" textAlign="center">
            <Chip
              label={paymentLabels[status]}
              color={
                status === "paid" ? "success" : pending ? "warning" : "error"
              }
              variant="outlined"
            />
            {pending ? (
              <>
                <Typography variant="h2">Quét mã để thanh toán</Typography>
                <Box
                  sx={{
                    p: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    bgcolor: "background.paper",
                  }}
                >
                  <QrCode2Rounded
                    role="img"
                    aria-label="Mã QR thanh toán"
                    sx={{
                      fontSize: { xs: 180, sm: 224 },
                      display: "block",
                      color: "text.primary",
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    NUTEE
                  </Typography>
                </Box>
                <Typography variant="h2" component="p" color="primary.main">
                  {money(order.total)}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <TimerOutlined color="warning" />
                  <Typography>Thời hạn: 15 phút</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Nội dung chuyển khoản: NUTEE {order.id.toUpperCase()}
                </Typography>
              </>
            ) : (
              <>
                {status === "paid" && (
                  <CheckCircleOutlineRounded
                    color="success"
                    sx={{ fontSize: 80 }}
                  />
                )}
                <Typography variant="h2">
                  {status === "paid"
                    ? "Thanh toán thành công"
                    : status === "expired"
                      ? "Mã thanh toán đã hết hạn"
                      : "Thanh toán chưa thành công"}
                </Typography>
                <Typography color="text.secondary">
                  {status === "paid"
                    ? "Bạn có thể xem xác nhận và chi tiết đơn hàng."
                    : "Vui lòng thử lại để tiếp tục thanh toán."}
                </Typography>
                <Button
                  variant="contained"
                  {...(status === "paid"
                    ? {
                        component: Link,
                        to: `/orders/${order.id}/success?payment=paid`,
                        state: location.state,
                      }
                    : {
                        onClick: () =>
                          setParams(
                            { status: "pending" },
                            { state: location.state },
                          ),
                      })}
                >
                  {status === "paid"
                    ? "Xem xác nhận đơn hàng"
                    : "Thử lại thanh toán"}
                </Button>
              </>
            )}
            <Divider flexItem />
            <Typography variant="body2" color="text.secondary">
              Trạng thái thanh toán
            </Typography>
            <Stack
              direction="row"
              gap={1}
              useFlexGap
              flexWrap="wrap"
              justifyContent="center"
            >
              {(["pending", "paid", "failed", "expired"] as const).map(
                (value) => (
                  <Button
                    key={value}
                    variant={status === value ? "contained" : "outlined"}
                    onClick={() =>
                      setParams({ status: value }, { state: location.state })
                    }
                    aria-pressed={status === value}
                  >
                    {value === "pending"
                      ? "Chờ thanh toán"
                      : value === "paid"
                        ? "Thành công"
                        : value === "failed"
                          ? "Thất bại"
                          : "Hết hạn"}
                  </Button>
                ),
              )}
            </Stack>
          </Stack>
        </Paper>
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Stack spacing={3}>
            <Typography variant="h3" component="h2">
              Thông tin thanh toán
            </Typography>
            <Typography>
              {order.items.length} sản phẩm · {order.address.recipient}
            </Typography>
            <OrderTotals quote={order} />
            <Button
              component={Link}
              to={`/account/orders/${order.id}${status === "paid" ? "?payment=paid" : ""}`}
              state={location.state}
              variant="outlined"
            >
              Xem chi tiết đơn hàng
            </Button>
            <Button component={Link} to="/account/orders">
              Về lịch sử đơn hàng
            </Button>
          </Stack>
        </Paper>
      </Box>
    </Stack>
  );
}
