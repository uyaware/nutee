import { Chip } from "@mui/material";
import type { Order } from "@/shared/types/database";
const statusLabels: Record<Order["status"], string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  packing: "Đang đóng gói",
  shipping: "Đang giao",
  delivered: "Đã giao",
  cancelled: "Đã hủy",
};
export function StatusBadge({ status }: { status: Order["status"] }) {
  return (
    <Chip
      size="small"
      label={statusLabels[status]}
      color={
        status === "delivered"
          ? "success"
          : status === "cancelled"
            ? "default"
            : status === "pending"
              ? "warning"
              : "primary"
      }
      variant="outlined"
    />
  );
}
