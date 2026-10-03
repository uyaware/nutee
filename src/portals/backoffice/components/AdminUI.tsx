import type { ReactNode } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from "@mui/material";
import { Link } from "react-router-dom";
import { BoxTitle } from "../../../shared/components/OrdersPage";
import { useAdminFilters } from "./useAdminFilters";

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        gap={2}
        alignItems={{ sm: "flex-start" }}
      >
        <BoxTitle title={title} description={description} />
        {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
      </Stack>
    </Stack>
  );
}

export function AdminSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, minWidth: 0 }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h3" component="h2">
            {title}
          </Typography>
          {description && (
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              {description}
            </Typography>
          )}
        </Box>
        {children}
      </Stack>
    </Paper>
  );
}

export function AdminTable<T extends { id: string }>({
  rows,
  columns,
  renderRow,
  minWidth = 720,
  label,
}: {
  rows: T[];
  columns: string[];
  renderRow: (row: T) => ReactNode;
  minWidth?: number;
  label: string;
}) {
  const { params, update, reset } = useAdminFilters();
  const size = 8;
  const requested = Number(params.get("page"));
  const page = Math.min(
    Number.isFinite(requested) ? Math.max(0, Math.floor(requested)) : 0,
    Math.max(0, Math.ceil(rows.length / size) - 1),
  );
  return (
    <Paper variant="outlined" sx={{ minWidth: 0 }}>
      <TableContainer tabIndex={0} role="region" aria-label={label}>
        <Table sx={{ minWidth }} aria-label={label}>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell key={column} scope="col">
                  {column}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.slice(page * size, (page + 1) * size).map((row) => (
              <TableRow key={row.id} hover>
                {renderRow(row)}
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  align="center"
                  sx={{ py: 5 }}
                >
                  <Typography>Không có dữ liệu phù hợp.</Typography>
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
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
        getItemAriaLabel={(type) =>
          type === "next" ? "Trang tiếp theo" : "Trang trước"
        }
        sx={{ "& .MuiTablePagination-toolbar": { px: { xs: 1, sm: 2 } } }}
      />
    </Paper>
  );
}

export function AdminConfirm({
  open,
  title,
  description,
  onClose,
  onConfirm,
  label = "Xác nhận",
  danger = false,
}: {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  onConfirm: () => void;
  label?: string;
  danger?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      aria-labelledby="admin-confirm-title"
    >
      <DialogTitle id="admin-confirm-title">{title}</DialogTitle>
      <DialogContent>
        <Typography sx={{ overflowWrap: "anywhere" }}>{description}</Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Quay lại</Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color={danger ? "error" : "primary"}
        >
          {label}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function AdminMissing({ label, to }: { label: string; to: string }) {
  return (
    <Stack spacing={2}>
      <Typography variant="h2" component="h1">
        Không tìm thấy {label}
      </Typography>
      <Typography color="text.secondary">
        Kiểm tra đường dẫn hoặc quay về danh sách để chọn lại.
      </Typography>
      <Button component={Link} to={to} sx={{ alignSelf: "flex-start" }}>
        Về danh sách
      </Button>
    </Stack>
  );
}
