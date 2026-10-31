import { z } from "zod";
import type { ApiClient } from "@/shared/api/apiClient";
import type { ApiPage } from "@/modules/catalog/model/api";
import { mapApiCartItem, type ApiCartItem } from "@/modules/cart/model/api";
import type {
    AvailableVoucher,
    DiscountQuote,
} from "@/modules/checkout/model/types";

const quoteSchema = z.object({
    variantIds: z
        .array(z.number().int().positive().max(2147483647))
        .min(1)
        .max(200),
    voucherCode: z.string().trim().toUpperCase().max(20),
});
export function createCheckoutService(api: ApiClient) {
    return {
        async quote(
            variantIds: number[],
            voucherCode: string,
        ): Promise<DiscountQuote> {
            const body = quoteSchema.parse({ variantIds, voucherCode });
            const result = await api.request<
                Omit<DiscountQuote, "items"> & { items: ApiCartItem[] }
            >("/checkout/quote", { method: "POST", body });
            return { ...result, items: result.items.map(mapApiCartItem) };
        },
        vouchers: (page: number) =>
            api.request<ApiPage<AvailableVoucher>>(
                `/vouchers?page=${page}&size=20`,
            ),
    };
}
