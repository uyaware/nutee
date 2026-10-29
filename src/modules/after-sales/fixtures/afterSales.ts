import { prototypeOrders } from "@/modules/orders/fixtures/orders";
import type { Database } from "@/shared/types/database";

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

export const prototypeAfterSales: AfterSaleRequest[] = [];
// Giá trị ban đầu cho form, không phải yêu cầu đã được tạo.
export const demoAfterSale: AfterSaleRequest = {
  id: "",
  userId: "",
  orderItemId: "",
  type: "warranty",
  quantity: 1,
  reason: "",
  status: "pending",
  createdAt: "",
  history: [],
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
