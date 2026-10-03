import {
  Alert,
  Box,
  Button,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import {
  Link,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  afterSaleActions,
  afterSaleLabels,
  afterSaleTypes,
  demoAfterSale,
  prototypeAfterSales,
  requestProduct,
  type AfterSaleRequest,
} from "../../mocks/operations";
import type { Portal } from "../types/database";
import { dateTime } from "../lib/format";
import { EmptyState } from "./Feedback";
import { AfterSaleBadge } from "./PrototypeAfterSales";
import { PrototypeWorkflow } from "./PrototypeWorkflow";
import { usePrototypeWorkflow } from "../lib/usePrototypeWorkflow";
import { StatusHistoryStepper } from "./StatusHistoryStepper";
import { OrderProducts } from "../../portals/customer/components/CheckoutSummary";

export default function PrototypeAfterSaleDetail({
  portal,
}: {
  portal: Portal;
}) {
  const customer = portal === "customer";
  const base = customer ? "/account/after-sales" : "/management/after-sales";
  const { id } = useParams();
  const location = useLocation();
  const [params] = useSearchParams();
  const state = location.state as {
    request?: AfterSaleRequest;
    backTo?: string;
  } | null;
  const request =
    id === "demo-request"
      ? customer && state?.request?.id === id
        ? state.request
        : demoAfterSale
      : prototypeAfterSales.find((entry) => entry.id === id);
  const workflow = usePrototypeWorkflow(
    request?.status ?? "pending",
    afterSaleActions,
  );
  if (!request || (customer && request.userId !== "customer-1"))
    return (
      <Stack spacing={2}>
        <EmptyState
          title="Không tìm thấy yêu cầu mẫu"
          description="Chọn một yêu cầu trong danh sách để xem chi tiết."
        />
        <Button component={Link} to={base}>
          Về danh sách hậu mãi
        </Button>
      </Stack>
    );
  const { order, item } = requestProduct(request);
  const status = customer ? request.status : workflow.status;
  const backTo = state?.backTo?.startsWith(`${base}?`) ? state.backTo : base;
  return (
    <Stack spacing={3}>
      <Button
        component={Link}
        to={backTo}
        startIcon={<ArrowBackRounded />}
        sx={{ alignSelf: "flex-start" }}
      >
        Quay lại hậu mãi
      </Button>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ sm: "center" }}
        gap={2}
      >
        <Stack spacing={1}>
          <Typography variant="h1">
            Yêu cầu {request.id.toUpperCase()}
          </Typography>
          <Typography color="text.secondary">
            Gửi lúc {dateTime(request.createdAt)}
          </Typography>
        </Stack>
        <Box>
          <AfterSaleBadge status={status} />
        </Box>
      </Stack>
      {customer && params.get("sent") === "1" && (
        <Alert severity="success">
          Đã mở xác nhận gửi yêu cầu mẫu. Nội dung chỉ dùng trên màn hình này,
          không lưu vào danh sách hoặc gửi đến nhân viên.
        </Alert>
      )}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            lg: "minmax(0, 1fr) 320px",
          },
          gap: 3,
          alignItems: "start",
        }}
      >
        <Stack spacing={3}>
          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
            <Stack spacing={2}>
              <Typography variant="h2">Thông tin yêu cầu</Typography>
              {item && <OrderProducts items={[item]} />}
              <Divider />
              <Typography>
                <strong>Loại yêu cầu:</strong> {afterSaleTypes[request.type]}
              </Typography>
              <Typography>
                <strong>Số lượng:</strong> {request.quantity}
              </Typography>
              <Typography
                sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
              >
                <strong>Lý do / mô tả:</strong> {request.reason}
              </Typography>
              <Typography>
                <strong>Mã bảo hành:</strong> {item?.warrantyCode ?? "Chưa có"}
              </Typography>
              <Typography>
                <strong>Hạn bảo hành:</strong>{" "}
                {item?.warrantyExpiresAt
                  ? dateTime(item.warrantyExpiresAt)
                  : "Chưa có"}
              </Typography>
              {order && (
                <Button
                  component={Link}
                  to={`${customer ? "/account" : "/management"}/orders/${order.id}`}
                  variant="outlined"
                  sx={{ alignSelf: "flex-start" }}
                >
                  Xem đơn {order.id.toUpperCase()}
                </Button>
              )}
            </Stack>
          </Paper>
          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
            <Stack spacing={2}>
              <Typography variant="h2">Tiến trình xử lý</Typography>
              <StatusHistoryStepper
                label="Lịch sử trạng thái yêu cầu hậu mãi"
                finished={status === "completed" || status === "rejected"}
                entries={[
                  ...request.history.map((entry) => ({
                    title: afterSaleLabels[entry.status],
                    description: `${dateTime(entry.at)} · ${entry.actorId.startsWith("customer") ? "Khách hàng" : "Nhân viên vận hành"}`,
                    note: entry.note,
                    negative: entry.status === "rejected",
                  })),
                  ...(customer
                    ? []
                    : workflow.preview.map((entry) => ({
                        title: afterSaleLabels[entry.status],
                        description: "Bước xử lý minh họa · Nhân viên vận hành",
                        note: entry.note,
                        negative: entry.status === "rejected",
                      }))),
                ]}
              />
            </Stack>
          </Paper>
        </Stack>
        <Stack spacing={3}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={1.5}>
              <Typography variant="h3" component="h2">
                Liên hệ khách hàng
              </Typography>
              <Typography fontWeight={600}>
                {order?.address.recipient}
              </Typography>
              <Typography>{order?.address.phone}</Typography>
              <Typography color="text.secondary">
                {order?.address.line}
              </Typography>
            </Stack>
          </Paper>
          {customer ? (
            <Alert severity="info">
              Nhân viên kiểm tra yêu cầu và ghi kết quả theo từng bước. Đây là
              tiến trình mẫu, chưa có đồng bộ giữa hai portal.
            </Alert>
          ) : (
            <Paper variant="outlined" sx={{ p: 3 }}>
              <PrototypeWorkflow
                status={status}
                actions={afterSaleActions}
                path={workflow.path}
              />
            </Paper>
          )}
          {customer && (
            <Button
              component={Link}
              to="/account/after-sales/new"
              variant="outlined"
            >
              Tạo yêu cầu khác
            </Button>
          )}
        </Stack>
      </Box>
    </Stack>
  );
}
