import {
  Alert,
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Link, useSearchParams } from "react-router-dom";
import {
  afterSaleLabels,
  afterSaleTypes,
  prototypeAfterSales,
  requestProduct,
  type AfterSaleStatus,
} from "../../mocks/operations";
import type { Portal } from "../types/database";
import { dateTime } from "../lib/format";

export function AfterSaleBadge({ status }: { status: AfterSaleStatus }) {
  return (
    <Chip
      size="small"
      variant="outlined"
      label={afterSaleLabels[status]}
      color={
        status === "completed" || status === "approved"
          ? "success"
          : status === "rejected"
            ? "error"
            : status === "pending"
              ? "warning"
              : "primary"
      }
    />
  );
}

export default function PrototypeAfterSales({ portal }: { portal: Portal }) {
  const customer = portal === "customer";
  const base = customer ? "/account/after-sales" : "/management/after-sales";
  const [params, setParams] = useSearchParams();
  const requested = params.get("status") ?? "all";
  const status = Object.hasOwn(afterSaleLabels, requested) ? requested : "all";
  const q = params.get("q") ?? "";
  const requestedType = params.get("type") ?? "all";
  const type = Object.hasOwn(afterSaleTypes, requestedType)
    ? requestedType
    : "all";
  const rows = prototypeAfterSales.filter((request) => {
    const { order, item } = requestProduct(request);
    return (
      (!customer || request.userId === "customer-1") &&
      (status === "all" || request.status === status) &&
      (type === "all" || request.type === type) &&
      `${request.id} ${order?.id} ${item?.name} ${order?.address.recipient}`
        .toLocaleLowerCase("vi")
        .includes(q.trim().toLocaleLowerCase("vi"))
    );
  });
  const size = 5;
  const page = Math.min(
    Math.max(0, Math.floor(Number(params.get("page")) || 0)),
    Math.max(0, Math.ceil(rows.length / size) - 1),
  );
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value && (key === "q" || value !== "all")) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true, preventScrollReset: true });
  };
  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        gap={2}
      >
        <Stack spacing={1}>
          <Typography variant="h1">
            {customer ? "Bảo hành & đổi trả" : "Quản lý hậu mãi"}
          </Typography>
          <Typography color="text.secondary">
            {customer
              ? "Gửi yêu cầu từ sản phẩm đã nhận và theo dõi tiến trình xử lý."
              : "Tiếp nhận, kiểm tra và ghi kết quả xử lý các yêu cầu của khách hàng."}
          </Typography>
        </Stack>
        {customer && (
          <Button
            component={Link}
            to={`${base}/new`}
            variant="contained"
            sx={{ alignSelf: "flex-start" }}
          >
            Tạo yêu cầu
          </Button>
        )}
      </Stack>
      <Alert severity="info">
        Danh sách mẫu cho các trạng thái hậu mãi. Gửi hoặc xử lý yêu cầu không
        cập nhật dữ liệu.
      </Alert>
      <Paper variant="outlined" sx={{ minWidth: 0 }}>
        <Tabs
          value={status}
          onChange={(_, value: string) => update("status", value)}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="Trạng thái yêu cầu hậu mãi"
        >
          <Tab value="all" label="Tất cả" />
          {Object.entries(afterSaleLabels).map(([value, label]) => (
            <Tab key={value} value={value} label={label} />
          ))}
        </Tabs>
      </Paper>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        gap={2}
        sx={{ minWidth: 0 }}
      >
        <TextField
          label="Tìm kiếm yêu cầu"
          placeholder="Mã yêu cầu, đơn hoặc tên sản phẩm"
          value={q}
          onChange={(event) => update("q", event.target.value)}
          sx={{ flex: "1 1 0", minWidth: 0 }}
        />
        <TextField
          select
          label="Loại yêu cầu"
          value={type}
          onChange={(event) => update("type", event.target.value)}
          sx={{ width: { xs: "100%", sm: 220 }, flexShrink: 0 }}
        >
          <MenuItem value="all">Tất cả yêu cầu</MenuItem>
          {Object.entries(afterSaleTypes).map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      <Paper variant="outlined" sx={{ minWidth: 0 }}>
        <TableContainer>
          <Table sx={{ minWidth: 740 }} aria-label="Danh sách yêu cầu hậu mãi">
            <TableHead>
              <TableRow>
                {[
                  "Yêu cầu",
                  "Sản phẩm / đơn hàng",
                  "Loại",
                  "Trạng thái",
                  "Thao tác",
                ].map((label) => (
                  <TableCell key={label}>{label}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.slice(page * size, (page + 1) * size).map((request) => {
                const { order, item } = requestProduct(request);
                return (
                  <TableRow key={request.id} hover>
                    <TableCell component="th" scope="row">
                      {request.id.toUpperCase()}
                      <br />
                      {dateTime(request.createdAt)}
                    </TableCell>
                    <TableCell>
                      {item?.name}
                      <br />
                      {order?.id.toUpperCase()}
                      {!customer && ` · ${order?.address.recipient}`}
                    </TableCell>
                    <TableCell>{afterSaleTypes[request.type]}</TableCell>
                    <TableCell>
                      <AfterSaleBadge status={request.status} />
                    </TableCell>
                    <TableCell>
                      <Button
                        component={Link}
                        to={`${base}/${request.id}`}
                        state={{ backTo: `${base}?${params}` }}
                      >
                        {customer ? "Xem chi tiết" : "Xem / xử lý"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!rows.length && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    Chưa có yêu cầu phù hợp.{" "}
                    <Button onClick={() => setParams({})}>Xem tất cả</Button>
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
            `${from}–${to} / ${count} yêu cầu`
          }
          getItemAriaLabel={(type) =>
            type === "next" ? "Trang tiếp theo" : "Trang trước"
          }
        />
      </Paper>
      {customer && (
        <Button
          component={Link}
          to="/account/orders?status=delivered"
          sx={{ alignSelf: "flex-start" }}
        >
          Xem các đơn đã giao
        </Button>
      )}
    </Stack>
  );
}
