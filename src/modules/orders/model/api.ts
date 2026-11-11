import { z } from "zod";

export const createOrderSchema = z.object({
    idempotencyKey: z.uuid(),
    variantIds: z.array(z.number().int().positive()).min(1).max(200),
    voucherCode: z.string().trim().toUpperCase().max(20),
    expectedTotal: z.number().int().nonnegative(),
    addressId: z.number().int().positive("Chọn địa chỉ đã lưu để giao hàng."),
    note: z.string().trim().max(1000),
    paymentMethod: z.enum(["cod", "qr"]),
});
export type CreateOrder = z.infer<typeof createOrderSchema>;
export interface OrderHistoryEntry {
    status: string | null;
    occurredAt: string | null;
    actorName?: string | null;
}
export interface CustomerOrder {
    id: number;
    code: string;
    status: string;
    paymentMethod: "cod" | "qr";
    paymentStatus: string;
    subtotal: number;
    promotionDiscount: number;
    voucherDiscount: number;
    discount: number;
    shipping: number;
    total: number;
    addressId: number | null;
    recipient: string | null;
    phone: string | null;
    addressLine: string | null;
    note: string | null;
    createdAt: string;
    paymentExpiresAt: string | null;
    payment?: Payment | null;
    paymentError?: string | null;
    items: {
        id: number;
        productId: number;
        variantId: number;
        name: string;
        sku: string | null;
        imageUrl: string | null;
        configuration: string | null;
        quantity: number;
        price: number;
        originalPrice: number;
    }[];
}
export interface Payment {
    orderId: number;
    status: string;
    amount: number;
    checkoutUrl: string | null;
    qrCode: string | null;
    bankBin: string | null;
    accountNumber: string | null;
    accountName: string | null;
    transferContent: string | null;
    expiresAt: string | null;
}
export const paymentLabels: Record<string, string> = {
    unpaid: "Chưa thanh toán",
    pending: "Chờ thanh toán",
    new: "Chưa tạo link",
    creating: "Đang tạo link",
    error: "Chưa kết nối được payOS",
    paid: "Đã thanh toán",
    cancelled: "Đã hủy",
    expired: "Đã hết hạn",
    review: "Cần đối soát thanh toán",
};
export const orderProducts = (order: CustomerOrder) =>
    order.items.map((item) => ({
        ...item,
        id: String(item.id),
        productId: String(item.productId),
        imageUrl: item.imageUrl ?? "",
        configuration: item.configuration ?? "",
    }));
