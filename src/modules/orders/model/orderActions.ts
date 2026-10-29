import type { Order } from "@/shared/types/database";

export const orderActions: Partial<
  Record<Order["status"], { status: Order["status"]; label: string }[]>
> = {
  pending: [
    { status: "confirmed", label: "Xác nhận đơn" },
    { status: "cancelled", label: "Hủy đơn" },
  ],
  confirmed: [
    { status: "packing", label: "Bắt đầu đóng gói" },
    { status: "cancelled", label: "Hủy đơn" },
  ],
  packing: [
    { status: "shipping", label: "Bàn giao vận chuyển" },
    { status: "cancelled", label: "Hủy đơn" },
  ],
  shipping: [{ status: "delivered", label: "Xác nhận đã giao" }],
};
