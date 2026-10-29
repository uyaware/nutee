import type { Order } from "@/shared/types/database";
import type { PrototypeOrder } from "@/modules/orders/model/types";

export const prototypeOrders: PrototypeOrder[] = [];
export function findPrototypeOrder(
  id: string | undefined,
  _navigationState?: { order?: PrototypeOrder } | null,
) {
  void _navigationState;
  return prototypeOrders.find((order) => order.id === id);
}

export const paymentLabels: Record<Order["paymentStatus"], string> = {
  pending: "Chờ thanh toán",
  paid: "Đã thanh toán",
  failed: "Thanh toán thất bại",
  expired: "Đã hết hạn",
};
