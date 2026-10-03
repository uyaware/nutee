import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import {
  Link,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { paymentLabels, findPrototypeOrder } from "../../mocks/checkout";
import { orderActions, prototypeAfterSales } from "../../mocks/operations";
import { dateTime, money } from "../lib/format";
import type { Order, Portal } from "../types/database";
import { StatusBadge } from "./StatusBadge";
import { EmptyState } from "./Feedback";
import { PrototypeWorkflow } from "./PrototypeWorkflow";
import { usePrototypeWorkflow } from "../lib/usePrototypeWorkflow";
import { StatusHistoryStepper } from "./StatusHistoryStepper";
import {
  OrderProducts,
  OrderTotals,
} from "../../portals/customer/components/CheckoutSummary";

const steps: { status: Order["status"]; label: string }[] = [
  { status: "pending", label: "Đặt hàng" },
  { status: "confirmed", label: "Xác nhận" },
  { status: "packing", label: "Đóng gói" },
  { status: "shipping", label: "Đang giao" },
  { status: "delivered", label: "Đã giao" },
];

export function PrototypeOrderDetail({ portal }: { portal: Portal }) {
  const { id } = useParams();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState(
    "Tôi muốn thay đổi sản phẩm trong đơn hàng.",
  );
  const customer = portal === "customer";
  const orderBase = customer ? "/account/orders" : "/management/orders";
  const order = findPrototypeOrder(id, customer ? location.state : null);
  const workflow = usePrototypeWorkflow(
    order?.status ?? "pending",
    orderActions,
  );
  if (!order || (customer && order.userId !== "customer-1"))
    return (
      <Stack spacing={2}>
        <EmptyState
          title="Không tìm thấy đơn hàng"
          description="Kiểm tra mã đơn hoặc quay lại danh sách đơn hàng."
        />
        <Button component={Link} to={orderBase}>
          Về danh sách đơn hàng
        </Button>
      </Stack>
    );
  const status = customer
    ? params.get("cancelled") === "1"
      ? "cancelled"
      : order.status
    : workflow.status;
  const cancelled = status === "cancelled";
  const backTo =
    !customer &&
    typeof location.state?.backTo === "string" &&
    location.state.backTo.startsWith(`${orderBase}?`)
      ? location.state.backTo
      : orderBase;
  const paid =
    order.paymentStatus === "paid" ||
    (order.paymentMethod === "qr" && params.get("payment") === "paid");
  return (
    <Stack spacing={3}>
      <Button
        component={Link}
        to={backTo}
        startIcon={<ArrowBackRounded />}
        sx={{ alignSelf: "flex-start" }}
      >
        Quay lại đơn hàng
      </Button>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ sm: "center" }}
        gap={2}
      >
        <Box>
          <Typography variant="h1">Đơn {order.id.toUpperCase()}</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Đặt ngày {dateTime(order.createdAt)}
          </Typography>
        </Box>
        <Box>
          <StatusBadge status={status} />
        </Box>
      </Stack>
      {!cancelled && (
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
          <Stepper
            activeStep={steps.findIndex((step) => step.status === status)}
            alternativeLabel
            sx={{
              "& .MuiStepLabel-label": { fontSize: { xs: 11, sm: 13 } },
              "& .MuiStep-root": { px: { xs: 0.5, sm: 1 } },
            }}
          >
            {steps.map((step) => (
              <Step key={step.status} completed={status === "delivered"}>
                <StepLabel>{step.label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>
      )}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            lg: "minmax(0, 1fr) 300px",
          },
          gap: 3,
          alignItems: "start",
        }}
      >
        <Stack spacing={3}>
          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
            <Stack spacing={3}>
              <Typography variant="h2">Sản phẩm trong đơn</Typography>
              <OrderProducts items={order.items} />
              {customer && status === "delivered" && (
                <Stack spacing={2}>
                  {order.items.map((item) => (
                    <Stack
                      key={item.id}
                      direction={{ xs: "column", sm: "row" }}
                      justifyContent="space-between"
                      gap={1}
                    >
                      <Typography variant="body2">
                        {item.name} · Bảo hành {item.warrantyCode}
                      </Typography>
                      <Stack direction="row" gap={1} flexWrap="wrap">
                        <Button
                          component={Link}
                          to={`${orderBase}/${order.id}/review/${item.id}`}
                          variant="outlined"
                        >
                          Viết đánh giá
                        </Button>
                        <Button
                          component={Link}
                          to={`/account/after-sales/new?orderId=${order.id}&itemId=${item.id}`}
                          variant="outlined"
                        >
                          Bảo hành / đổi trả
                        </Button>
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              )}
              <Divider />
              <OrderTotals quote={order} />
            </Stack>
          </Paper>
          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
            <Stack spacing={2}>
              <Typography variant="h2">Lịch sử đơn hàng</Typography>
              <StatusHistoryStepper
                label="Lịch sử trạng thái đơn hàng"
                finished={status === "delivered" || cancelled}
                entries={[
                  ...order.history.map((entry) => ({
                    title:
                      steps.find((step) => step.status === entry.status)
                        ?.label ?? "Đã hủy",
                    description: `${dateTime(entry.at)} · ${entry.actorId.startsWith("customer") ? "Khách hàng" : "Nhân viên vận hành"}`,
                    negative: entry.status === "cancelled",
                  })),
                  ...(customer
                    ? []
                    : workflow.preview.map((entry) => ({
                        title:
                          steps.find((step) => step.status === entry.status)
                            ?.label ?? "Đã hủy",
                        description: "Nhân viên vận hành",
                        note: entry.note,
                        negative: entry.status === "cancelled",
                      }))),
                  ...(customer &&
                  params.get("cancelled") === "1" &&
                  order.status !== "cancelled"
                    ? [
                        {
                          title: "Đã hủy",
                          description: "Khách hàng",
                          note: reason,
                          negative: true,
                        },
                      ]
                    : []),
                ]}
              />
            </Stack>
          </Paper>
        </Stack>
        <Stack spacing={3}>
          {!customer && (
            <Paper variant="outlined" sx={{ p: 3 }}>
              <PrototypeWorkflow
                status={status}
                actions={orderActions}
                path={workflow.path}
              />
            </Paper>
          )}
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={1.5}>
              <Typography variant="h3" component="h2">
                Thông tin giao hàng
              </Typography>
              <Typography fontWeight={600}>
                {order.address.recipient}
              </Typography>
              <Typography>{order.address.phone}</Typography>
              <Typography color="text.secondary">
                {order.address.line}
              </Typography>
              <Divider />
              <Typography variant="body2" color="text.secondary">
                Giao hàng tiêu chuẩn
              </Typography>
            </Stack>
          </Paper>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={1.5}>
              <Typography variant="h3" component="h2">
                Thanh toán
              </Typography>
              <Typography>
                {order.paymentMethod === "cod"
                  ? "Thanh toán khi nhận hàng (COD)"
                  : "Chuyển khoản bằng QR"}
              </Typography>
              <Typography color={paid ? "success.main" : "text.secondary"}>
                {paid
                  ? "Đã thanh toán"
                  : order.paymentMethod === "cod" && !cancelled
                    ? "Thanh toán khi nhận hàng"
                    : paymentLabels[order.paymentStatus]}
              </Typography>
              <Typography fontWeight={600}>{money(order.total)}</Typography>
              {customer &&
                !cancelled &&
                order.paymentMethod === "qr" &&
                !paid && (
                  <Button
                    component={Link}
                    to={`/orders/${order.id}/payment`}
                    state={location.state}
                    variant="contained"
                  >
                    Thanh toán ngay
                  </Button>
                )}
            </Stack>
          </Paper>
          {customer && !cancelled && order.status === "pending" && (
            <Button
              variant="outlined"
              color="error"
              onClick={() => setCancelOpen(true)}
            >
              Hủy đơn hàng
            </Button>
          )}
          {customer && (
            <Button component={Link} to="/products" variant="outlined">
              Tiếp tục mua sắm
            </Button>
          )}
          {prototypeAfterSales
            .filter((request) =>
              order.items.some((item) => item.id === request.orderItemId),
            )
            .map((request) => (
              <Button
                key={request.id}
                component={Link}
                to={`${customer ? "/account" : "/management"}/after-sales/${request.id}`}
                variant="outlined"
              >
                Xem hậu mãi {request.id.toUpperCase()}
              </Button>
            ))}
        </Stack>
      </Box>
      <Dialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="cancel-order-title"
      >
        <DialogTitle id="cancel-order-title">
          Hủy đơn {order.id.toUpperCase()}?
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3 }}>
            Nhập lý do hủy trước khi xác nhận.
          </DialogContentText>
          <TextField
            label="Lý do hủy đơn"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            multiline
            minRows={3}
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, flexWrap: "wrap", gap: 1 }}>
          <Button onClick={() => setCancelOpen(false)}>Giữ đơn hàng</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              const next = new URLSearchParams(params);
              next.set("cancelled", "1");
              setParams(next, { state: location.state });
              setCancelOpen(false);
            }}
          >
            Xác nhận hủy
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
