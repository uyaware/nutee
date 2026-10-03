import { useAdminFilters } from "../components/useAdminFilters";
import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  TableCell,
  TextField,
  Typography,
} from "@mui/material";
import { Link } from "react-router-dom";
import { prototypePayments } from "../../../mocks/admin";
import { paymentLabels } from "../../../mocks/checkout";
import { dateTime, money } from "../../../shared/lib/format";
import { AdminPageHeader, AdminTable } from "../components/AdminUI";

export default function PaymentsPage() {
  const { params, q, search, update } = useAdminFilters();
  const [selected, setSelected] = useState<
    (typeof prototypePayments)[number] | null
  >(null);
  const status = Object.hasOwn(paymentLabels, params.get("status") ?? "")
    ? params.get("status")!
    : "all";
  const method = ["cod", "qr"].includes(params.get("method") ?? "")
    ? params.get("method")!
    : "all";
  const sort = params.get("sort") === "oldest" ? "oldest" : "newest";
  const rows = prototypePayments
    .filter(
      (p) =>
        `${p.id} ${p.orderId} ${p.reference} ${p.recipient}`
          .toLocaleLowerCase("vi")
          .includes(search) &&
        (status === "all" || p.status === status) &&
        (method === "all" || p.method === method),
    )
    .sort(
      (a, b) =>
        (sort === "oldest" ? 1 : -1) * a.createdAt.localeCompare(b.createdAt),
    );
  return (
    <Stack spacing={3}>
      <AdminPageHeader
        title="Giao dịch thanh toán"
        description="Tra cứu giao dịch mẫu và thông tin tham chiếu của từng đơn hàng."
      />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
          gap: 2,
        }}
      >
        {[
          {
            label: "Đã thanh toán",
            value: money(
              rows
                .filter((p) => p.status === "paid")
                .reduce((sum, p) => sum + p.amount, 0),
            ),
          },
          {
            label: "Đang chờ",
            value: `${rows.filter((p) => p.status === "pending").length} giao dịch`,
          },
          {
            label: "Thất bại / hết hạn",
            value: `${rows.filter((p) => p.status === "failed" || p.status === "expired").length} giao dịch`,
          },
        ].map((m) => (
          <Paper key={m.label} variant="outlined" sx={{ p: 2.5 }}>
            <Typography color="text.secondary">{m.label}</Typography>
            <Typography
              variant="h3"
              component="p"
              sx={{ mt: 1, fontVariantNumeric: "tabular-nums" }}
            >
              {m.value}
            </Typography>
          </Paper>
        ))}
      </Box>
      <Typography variant="body2" color="text.secondary">
        Chỉ số theo bộ lọc hiện tại. Giao dịch chỉ đọc; mã tham chiếu dùng để
        minh họa.
      </Typography>
      <Stack direction={{ xs: "column", lg: "row" }} gap={2}>
        <TextField
          label="Tìm giao dịch, mã đơn hoặc tham chiếu"
          value={q}
          onChange={(e) => update("q", e.target.value)}
          sx={{ flex: 2 }}
        />
        <TextField
          select
          label="Trạng thái"
          value={status}
          onChange={(e) => update("status", e.target.value)}
          sx={{ flex: 1 }}
        >
          <MenuItem value="all">Tất cả</MenuItem>
          {Object.entries(paymentLabels).map(([key, label]) => (
            <MenuItem key={key} value={key}>
              {label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Phương thức"
          value={method}
          onChange={(e) => update("method", e.target.value)}
          sx={{ flex: 1 }}
        >
          <MenuItem value="all">Tất cả</MenuItem>
          <MenuItem value="cod">COD</MenuItem>
          <MenuItem value="qr">QR demo</MenuItem>
        </TextField>
        <TextField
          select
          label="Sắp xếp"
          value={sort}
          onChange={(e) => update("sort", e.target.value)}
          sx={{ flex: 1 }}
        >
          <MenuItem value="newest">Mới nhất</MenuItem>
          <MenuItem value="oldest">Cũ nhất</MenuItem>
        </TextField>
      </Stack>
      <AdminTable
        label="Danh sách giao dịch thanh toán"
        rows={rows}
        minWidth={920}
        columns={[
          "Giao dịch / tham chiếu",
          "Đơn hàng",
          "Phương thức",
          "Số tiền",
          "Trạng thái",
          "Thời gian",
          "Thao tác",
        ]}
        renderRow={(p) => (
          <>
            <TableCell component="th" scope="row">
              <Typography fontWeight={600}>{p.id.toUpperCase()}</Typography>
              <Typography variant="caption" color="text.secondary">
                {p.reference}
              </Typography>
            </TableCell>
            <TableCell>
              <Button component={Link} to={`/management/orders/${p.orderId}`}>
                {p.orderId.toUpperCase()}
              </Button>
            </TableCell>
            <TableCell>{p.method === "cod" ? "COD" : "QR demo"}</TableCell>
            <TableCell sx={{ whiteSpace: "nowrap" }}>
              {money(p.amount)}
            </TableCell>
            <TableCell>
              <Chip
                size="small"
                variant="outlined"
                color={
                  p.status === "paid"
                    ? "success"
                    : p.status === "pending"
                      ? "warning"
                      : "error"
                }
                label={paymentLabels[p.status]}
              />
            </TableCell>
            <TableCell>{dateTime(p.createdAt)}</TableCell>
            <TableCell>
              <Button onClick={() => setSelected(p)}>Chi tiết</Button>
            </TableCell>
          </>
        )}
      />
      <Dialog
        open={!!selected}
        onClose={() => setSelected(null)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="payment-detail-title"
      >
        <DialogTitle id="payment-detail-title">Chi tiết giao dịch</DialogTitle>
        <DialogContent>
          {selected && (
            <Stack spacing={2}>
              <Typography fontWeight={700}>
                {selected.id.toUpperCase()}
              </Typography>
              <Typography>Tham chiếu: {selected.reference}</Typography>
              <Typography>Khách hàng: {selected.recipient}</Typography>
              <Typography>Số tiền: {money(selected.amount)}</Typography>
              <Typography>
                Phương thức:{" "}
                {selected.method === "cod" ? "Thu hộ COD" : "QR demo"}
              </Typography>
              <Typography>
                Trạng thái: {paymentLabels[selected.status]}
              </Typography>
              <Typography>Thời gian: {dateTime(selected.createdAt)}</Typography>
              <Typography color="text.secondary">
                Thông tin mẫu để xem giao diện tra cứu. Đối soát thực tế sẽ dùng
                dữ liệu từ hệ thống thanh toán.
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSelected(null)}>Đóng</Button>
          {selected && (
            <Button
              component={Link}
              to={`/management/orders/${selected.orderId}`}
              variant="outlined"
              onClick={() => setSelected(null)}
            >
              Xem đơn hàng
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
