import {
  Button,
  Box,
  InputAdornment,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
} from "@mui/material";
import { Link } from "react-router-dom";
import SearchRounded from "@mui/icons-material/SearchRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import { useAdminFilters } from "../components/useAdminFilters";
import { prototypeOrders, paymentLabels } from "../../../mocks/checkout";
import { BoxTitle } from "../../../shared/components/OrdersPage";
import { StatusBadge } from "../../../shared/components/StatusBadge";
import { dateTime, money } from "../../../shared/lib/format";

const statuses = {
  all: "Tất cả trạng thái",
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  packing: "Đóng gói",
  shipping: "Đang giao",
  delivered: "Đã giao",
  cancelled: "Đã hủy",
};
const normalizeSearch = (value: string) =>
  value
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
export default function OperationsOrdersPage() {
  const { params, q, search, update, reset } = useAdminFilters();
  const words = normalizeSearch(search).split(/\s+/).filter(Boolean);
  const requestedStatus = params.get("status") ?? "all";
  const status = Object.hasOwn(statuses, requestedStatus)
    ? requestedStatus
    : "all";
  const requestedPayment = params.get("payment") ?? "all";
  const payment = Object.hasOwn(paymentLabels, requestedPayment)
    ? requestedPayment
    : "all";
  const sort = params.get("sort") === "oldest" ? "oldest" : "newest";
  const rows = prototypeOrders
    .filter(
      (order) =>
        words.every((word) =>
          normalizeSearch(
            `${order.id} ${order.address.recipient} ${order.address.phone}`,
          ).includes(word),
        ) &&
        (status === "all" || order.status === status) &&
        (payment === "all" || order.paymentStatus === payment),
    )
    .sort(
      (a, b) =>
        (sort === "newest" ? -1 : 1) * a.createdAt.localeCompare(b.createdAt),
    );
  const size = 8;
  const page = Math.min(
    Number.isFinite(Number(params.get("page")))
      ? Math.max(0, Math.floor(Number(params.get("page"))))
      : 0,
    Math.max(0, Math.ceil(rows.length / size) - 1),
  );
  return (
    <Stack spacing={3}>
      <BoxTitle
        title="Quản lý đơn hàng"
        description="Tra cứu đơn, xem chi tiết và xử lý từng bước giao hàng."
      />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            sm: "repeat(3, minmax(0, 1fr))",
            xl: "minmax(320px, 2fr) repeat(3, minmax(0, 1fr))",
          },
          gap: 2,
        }}
      >
        <TextField
          type="search"
          label="Tìm đơn hàng"
          placeholder="Mã đơn, tên người nhận hoặc số điện thoại"
          value={q}
          onChange={(event) => update("q", event.target.value)}
          sx={{ gridColumn: { xs: "1 / -1", xl: "auto" } }}
          slotProps={{
            inputLabel: { shrink: true },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRounded fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: q ? (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="Xóa từ khóa tìm đơn hàng"
                    onClick={() => update("q", "")}
                    edge="end"
                  >
                    <CloseRounded fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : undefined,
            },
          }}
        />
        <TextField
          select
          label="Trạng thái đơn"
          value={status}
          onChange={(event) => update("status", event.target.value)}
        >
          {Object.entries(statuses).map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Thanh toán"
          value={payment}
          onChange={(event) => update("payment", event.target.value)}
        >
          <MenuItem value="all">Tất cả thanh toán</MenuItem>
          {Object.entries(paymentLabels).map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Sắp xếp"
          value={sort}
          onChange={(event) => update("sort", event.target.value)}
        >
          <MenuItem value="newest">Mới nhất</MenuItem>
          <MenuItem value="oldest">Cũ nhất</MenuItem>
        </TextField>
      </Box>
      <Paper variant="outlined" sx={{ minWidth: 0 }}>
        <TableContainer>
          <Table sx={{ minWidth: 820 }} aria-label="Bảng đơn hàng vận hành">
            <TableHead>
              <TableRow>
                {[
                  "Mã đơn / thời gian",
                  "Người nhận",
                  "Trạng thái",
                  "Thanh toán",
                  "Tổng tiền",
                  "Thao tác",
                ].map((label) => (
                  <TableCell key={label}>{label}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.slice(page * size, (page + 1) * size).map((order) => (
                <TableRow key={order.id} hover>
                  <TableCell component="th" scope="row">
                    <Link
                      to={`/management/orders/${order.id}`}
                      state={{ backTo: `/management/orders?${params}` }}
                    >
                      {order.id.toUpperCase()}
                    </Link>
                    <br />
                    {dateTime(order.createdAt)}
                  </TableCell>
                  <TableCell>
                    {order.address.recipient}
                    <br />
                    {order.address.phone}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={order.status} />
                  </TableCell>
                  <TableCell>
                    {order.paymentMethod.toUpperCase()}
                    <br />
                    {paymentLabels[order.paymentStatus]}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {money(order.total)}
                  </TableCell>
                  <TableCell>
                    <Button
                      component={Link}
                      to={`/management/orders/${order.id}`}
                      state={{ backTo: `/management/orders?${params}` }}
                    >
                      Xem / xử lý
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!rows.length && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Không có đơn phù hợp.{" "}
                    <Button onClick={reset}>Xóa bộ lọc</Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={rows.length}
          page={page}
          rowsPerPage={size}
          rowsPerPageOptions={[size]}
          onPageChange={(_, value) => update("page", String(value))}
          labelDisplayedRows={({ from, to, count }) =>
            `${from}–${to} / ${count} đơn`
          }
          getItemAriaLabel={(type) =>
            type === "next" ? "Trang tiếp theo" : "Trang trước"
          }
        />
      </Paper>
    </Stack>
  );
}
