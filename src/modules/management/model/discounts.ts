import { z } from "zod";

export type DiscountKind = "promotions" | "vouchers";
export interface DiscountOption {
    id: string;
    name: string;
    email?: string;
}
export const discountStatusLabels: Record<string, string> = {
    active: "Đang áp dụng",
    scheduled: "Sắp diễn ra",
    expired: "Hết hạn",
    paused: "Tạm dừng",
};
export const discountLabels = { promotions: "Promotion", vouchers: "Voucher" };

export const discountSchema = z
    .object({
        code: z
            .string()
            .trim()
            .toUpperCase()
            .regex(
                /^[A-Z0-9_-]{3,20}$/,
                "Mã gồm 3–20 ký tự chữ, số, gạch ngang hoặc gạch dưới.",
            ),
        type: z.enum(["fixed", "percent"]),
        value: z.number().int().min(1).max(1000000000),
        startsAt: z.iso.datetime(),
        endsAt: z.iso.datetime(),
        isActive: z.boolean(),
        scope: z.enum(["all", "user", "product"]),
        productIds: z.array(z.number().int().positive()).max(200),
    userIds: z.array(z.guid({ message: "ID khách hàng không hợp lệ." })).max(200),
        minOrder: z.number().int().min(0).max(1000000000000),
        maxDiscount: z.number().int().positive().max(1000000000000).nullable(),
        quantity: z.number().int().min(0).max(2147483647),
        maxUsesPerUser: z.number().int().min(1).max(2147483647),
    })
    .superRefine((rule, context) => {
        if (rule.startsAt >= rule.endsAt)
            context.addIssue({
                code: "custom",
                path: ["endsAt"],
                message: "Thời gian kết thúc phải sau thời gian bắt đầu.",
            });
        if (rule.type === "percent" && rule.value > 100)
            context.addIssue({
                code: "custom",
                path: ["value"],
                message: "Mức giảm phần trăm tối đa 100%.",
            });
        if (rule.scope === "product" && !rule.productIds.length)
            context.addIssue({
                code: "custom",
                path: ["productIds"],
                message: "Chọn ít nhất một sản phẩm.",
            });
        if (rule.scope === "user" && !rule.userIds.length)
            context.addIssue({
                code: "custom",
                path: ["userIds"],
                message: "Chọn ít nhất một khách hàng.",
            });
    });
export type DiscountDraft = z.infer<typeof discountSchema>;
export interface DiscountRule extends DiscountDraft {
    id: string;
    status: string;
    products: DiscountOption[];
    users: DiscountOption[];
}
export function emptyDiscount(kind: DiscountKind): DiscountDraft {
    return {
        code: "",
        type: "fixed",
        value: 100000,
        startsAt: new Date().toISOString(),
        endsAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        isActive: true,
        scope: kind === "promotions" ? "product" : "all",
        productIds: [],
        userIds: [],
        minOrder: 0,
        maxDiscount: null,
        quantity: 100,
        maxUsesPerUser: 1,
    };
}
