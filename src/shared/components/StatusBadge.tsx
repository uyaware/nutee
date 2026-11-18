import { Chip } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { paymentStatusColor } from "@/shared/lib/paymentStatusColor";
import type { Order } from "@/shared/types/database";
const statusLabels: Record<Order["status"], string> = {
    pending: "Chờ xác nhận",
    confirmed: "Đã xác nhận",
    packing: "Đang đóng gói",
    shipping: "Đang giao",
    delivered: "Đã giao",
    cancelled: "Đã hủy",
};
export function StatusBadge({ status, kind = "order", label, prominent = false }: { status: string | null; kind?: "order" | "payment" | "general"; label?: string; prominent?: boolean }) {
    const tone = kind === "payment"
        ? paymentStatusColor(status ?? "")
        : ["delivered", "completed", "approved", "active", "published"].includes(status ?? "") ? "success"
        : ["cancelled", "rejected", "locked"].includes(status ?? "") ? "error"
        : ["pending", "scheduled"].includes(status ?? "") ? "warning"
        : ["confirmed", "packing", "shipping", "reviewing", "processing"].includes(status ?? "") ? "info" : "default";
    return (
        <Chip
            size="small"
            label={
                label ?? (status && Object.hasOwn(statusLabels, status) && kind === "order"
                    ? statusLabels[status as Order["status"]]
                    : (status ?? "Chưa xác định"))
            }
            sx={(theme) => {
                const color = tone === "default" ? theme.palette.text.secondary : theme.palette[tone].main;
                return {
                    height: prominent ? 36 : 28,
                    fontSize: prominent ? "0.875rem" : undefined,
                    borderRadius: 1,
                    fontWeight: 600,
                    backgroundColor: alpha(color, theme.palette.mode === "dark" ? 0.18 : 0.12),
                    color: tone === "default" ? theme.palette.text.secondary : theme.palette.mode === "dark" ? theme.palette[tone].light : theme.palette[tone].dark,
                    border: `1px solid ${alpha(color, 0.22)}`,
                };
            }}
        />
    );
}
