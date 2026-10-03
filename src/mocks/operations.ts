import { createSeed } from "./seed";
import { prototypeOrders } from "./checkout";
import type { Database, Order } from "../shared/types/database";

export type AfterSaleRequest = Database["afterSaleRequests"][number];
export type AfterSaleStatus = AfterSaleRequest["status"];
export const afterSaleLabels: Record<AfterSaleStatus, string> = {
  pending: "Chờ tiếp nhận",
  reviewing: "Đang kiểm tra",
  approved: "Đã chấp thuận",
  rejected: "Đã từ chối",
  processing: "Đang xử lý",
  completed: "Hoàn tất",
};
export const afterSaleTypes = { warranty: "Bảo hành", return: "Đổi / trả" };
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
export const afterSaleActions: Partial<
  Record<AfterSaleStatus, { status: AfterSaleStatus; label: string }[]>
> = {
  pending: [{ status: "reviewing", label: "Tiếp nhận yêu cầu" }],
  reviewing: [
    { status: "approved", label: "Chấp thuận" },
    { status: "rejected", label: "Từ chối" },
  ],
  approved: [{ status: "processing", label: "Bắt đầu xử lý" }],
  processing: [{ status: "completed", label: "Hoàn tất xử lý" }],
};

// Fixed, read-only fixtures shared by both prototype portals.
const seed = createSeed(new Date("2026-10-03T03:00:00.000Z"));
export const prototypeAfterSales: AfterSaleRequest[] =
  seed.afterSaleRequests.map((request, index) => ({
    ...request,
    type: index % 2 ? "return" : "warranty",
    reason:
      index % 2
        ? "Sản phẩm không phù hợp nhu cầu sử dụng."
        : "Thiết bị hoạt động không ổn định, cần kiểm tra.",
    history: [
      {
        status: "pending",
        at: request.createdAt,
        actorId: request.userId,
        note: "Khách hàng gửi yêu cầu.",
      },
      ...(request.status === "pending" ? [] : request.history),
    ],
  }));
export const demoAfterSale: AfterSaleRequest = {
  id: "demo-request",
  userId: "customer-1",
  orderItemId: "oi-5",
  type: "warranty",
  quantity: 1,
  reason: "Thiết bị hoạt động không ổn định, cần kiểm tra.",
  status: "pending",
  createdAt: "2026-10-03T03:00:00.000Z",
  history: [
    {
      status: "pending",
      at: "2026-10-03T03:00:00.000Z",
      actorId: "customer-1",
      note: "Khách hàng gửi yêu cầu.",
    },
  ],
};

export function requestProduct(request: AfterSaleRequest) {
  const order = prototypeOrders.find((order) =>
    order.items.some((item) => item.id === request.orderItemId),
  );
  return {
    order,
    item: order?.items.find((item) => item.id === request.orderItemId),
  };
}
