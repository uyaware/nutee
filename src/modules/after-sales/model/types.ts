import type { OrderDisplayItem } from "@/modules/orders/model/types";

export const afterSaleLabels = {
    pending: "Chờ tiếp nhận",
    reviewing: "Đang kiểm tra",
    approved: "Đã chấp thuận",
    rejected: "Đã từ chối",
    processing: "Đang xử lý",
    completed: "Hoàn tất",
};
export type AfterSaleStatus = keyof typeof afterSaleLabels;
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
export interface AfterSaleRequest {
    id: number;
    orderId: number;
    orderCode: string;
    orderItemId: number;
    userId: string;
    type: keyof typeof afterSaleTypes;
    quantity: number;
    reason: string;
    description: string | null;
    status: AfterSaleStatus;
    createdAt: string;
    item: Omit<OrderDisplayItem, "imageUrl" | "configuration"> & {
        imageUrl: string | null;
        configuration: string | null;
    };
    customer: {
        name: string | null;
        phone: string | null;
        addressLine: string | null;
    };
    history: {
        status: AfterSaleStatus;
        at: string;
        actorId: string;
        actorName: string | null;
    }[];
}
export interface CreateAfterSaleRequest {
    orderItemId: number;
    type: keyof typeof afterSaleTypes;
    reason: string;
    description?: string;
}
