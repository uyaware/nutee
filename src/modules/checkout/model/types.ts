import type { CartItem } from "@/modules/cart/model/types";
export interface DiscountQuote {
    items: CartItem[];
    subtotal: number;
    promotionDiscount: number;
    voucherDiscount: number;
    discount: number;
    total: number;
    voucherCode: string | null;
    shippingConfirmed: boolean;
}
export interface AvailableVoucher {
    id: string;
    code: string;
    type: "fixed" | "percent";
    value: number;
    minOrder: number;
    maxDiscount: number | null;
    endsAt: string;
    remaining: number;
    maxUsesPerUser: number;
    remainingPerUser: number;
}
