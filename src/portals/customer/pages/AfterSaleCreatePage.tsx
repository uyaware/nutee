import { useState } from "react";
import {
  Alert,
  Button,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { prototypeOrders } from "../../../mocks/checkout";
import {
  afterSaleTypes,
  demoAfterSale,
  type AfterSaleRequest,
} from "../../../mocks/operations";
import { dateTime } from "../../../shared/lib/format";
import { EmptyState } from "../../../shared/components/Feedback";
import { OrderProducts } from "../components/CheckoutSummary";

export default function AfterSaleCreatePage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [type, setType] = useState<AfterSaleRequest["type"]>("warranty");
  const [reason, setReason] = useState(
    "Thiết bị hoạt động không ổn định, cần kiểm tra.",
  );
  const eligible = prototypeOrders.filter(
    (order) => order.userId === "customer-1" && order.status === "delivered",
  );
  const order = params.has("orderId")
    ? eligible.find((entry) => entry.id === params.get("orderId"))
    : eligible[0];
  const item = params.has("itemId")
    ? order?.items.find((entry) => entry.id === params.get("itemId"))
    : order?.items[0];
  if (!order || !item)
    return (
      <Stack spacing={2}>
        <EmptyState
          title="Chọn sản phẩm từ đơn đã giao"
          description="Form hậu mãi dành cho sản phẩm thuộc đơn mẫu đã giao của khách hàng."
        />
        <Button component={Link} to="/account/orders?status=delivered">
          Xem đơn đã giao
        </Button>
        <Button component={Link} to="/account/after-sales/new">
          Mở yêu cầu mẫu
        </Button>
      </Stack>
    );
  return (
    <Stack spacing={3} sx={{ maxWidth: 800 }}>
      <Button
        component={Link}
        to="/account/after-sales"
        startIcon={<ArrowBackRounded />}
        sx={{ alignSelf: "flex-start" }}
      >
        Quay lại hậu mãi
      </Button>
      <Typography variant="h1">Tạo yêu cầu bảo hành / đổi trả</Typography>
      <Alert severity="info">
        Form minh họa từ đơn đã giao. Gửi yêu cầu mở trang xác nhận, không lưu
        hoặc gửi dữ liệu thực tế.
      </Alert>
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack
          component="form"
          spacing={3}
          onSubmit={(event) => {
            event.preventDefault();
            if (!reason.trim()) return;
            const data = new FormData(event.currentTarget as HTMLFormElement);
            const request: AfterSaleRequest = {
              ...demoAfterSale,
              orderItemId: item.id,
              type,
              quantity: Number(data.get("quantity")),
              reason: reason.trim(),
            };
            navigate("/account/after-sales/demo-request?sent=1", {
              state: { request },
            });
          }}
        >
          <TextField
            select
            label="Đơn hàng đã giao"
            value={order.id}
            onChange={(event) => setParams({ orderId: event.target.value })}
          >
            {eligible.map((entry) => (
              <MenuItem key={entry.id} value={entry.id}>
                {entry.id.toUpperCase()} · {dateTime(entry.createdAt)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Sản phẩm cần hỗ trợ"
            value={item.id}
            onChange={(event) =>
              setParams({ orderId: order.id, itemId: event.target.value })
            }
          >
            {order.items.map((entry) => (
              <MenuItem key={entry.id} value={entry.id}>
                {entry.name}
              </MenuItem>
            ))}
          </TextField>
          <OrderProducts items={[item]} />
          <Typography color="text.secondary">
            Mã bảo hành: {item.warrantyCode ?? "Chưa có"} · Hạn:{" "}
            {item.warrantyExpiresAt
              ? dateTime(item.warrantyExpiresAt)
              : "Chưa có"}
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
            <TextField
              select
              label="Loại yêu cầu"
              value={type}
              onChange={(event) =>
                setType(event.target.value as AfterSaleRequest["type"])
              }
              sx={{ flex: 1 }}
            >
              {Object.entries(afterSaleTypes).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              key={item.id}
              name="quantity"
              label="Số lượng"
              type="number"
              defaultValue={1}
              required
              slotProps={{ htmlInput: { min: 1, max: item.quantity, step: 1 } }}
              helperText={`Đã mua ${item.quantity} sản phẩm`}
              sx={{ flex: 1 }}
            />
          </Stack>
          <TextField
            label="Lý do và mô tả vấn đề"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required
            multiline
            minRows={4}
            slotProps={{ htmlInput: { maxLength: 2000 } }}
          />
          <Stack
            direction={{ xs: "column-reverse", sm: "row" }}
            justifyContent="space-between"
            gap={2}
          >
            <Button
              component={Link}
              to={`/account/orders/${order.id}`}
              variant="outlined"
            >
              Quay lại đơn hàng
            </Button>
            <Button type="submit" variant="contained" disabled={!reason.trim()}>
              Gửi yêu cầu
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}
