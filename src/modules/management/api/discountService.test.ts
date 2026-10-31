import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/shared/api/apiClient";
import { createDiscountService } from "@/modules/management/api/discountService";
import { emptyDiscount } from "@/modules/management/model/discounts";

describe("discount management API", () => {
    it("keeps promotion product assignments separate from voucher customer assignments", async () => {
        const fetch = vi.fn<typeof globalThis.fetch>(async (url) =>
            Response.json(
                String(url).endsWith("/csrf")
                    ? { token: "csrf", headerName: "X-XSRF-TOKEN" }
                    : {
                          id: "rule-id",
                          ...emptyDiscount("promotions"),
                          code: "SAVE10",
                          products: [{ id: 7, name: "Laptop" }],
                      },
            ),
        );
        const service = createDiscountService(createApiClient({ fetch }));
        const promotion = {
            ...emptyDiscount("promotions"),
            code: " save10 ",
            productIds: [7],
        };
        await service.save("promotions", undefined, promotion);
        let body = JSON.parse(fetch.mock.calls.at(-1)![1]!.body as string);
        expect(body).toMatchObject({ code: "SAVE10", productIds: [7] });
        expect(body).not.toHaveProperty("userIds");
        expect(body).not.toHaveProperty("minOrder");
        await service.save("vouchers", "rule-id", {
            ...emptyDiscount("vouchers"),
            code: "SAVE20",
            minOrder: 1000000,
            maxDiscount: 200000,
        });
        body = JSON.parse(fetch.mock.calls.at(-1)![1]!.body as string);
        expect(body).toMatchObject({
            scope: "all",
            userIds: [],
            minOrder: 1000000,
            maxDiscount: 200000,
        });
        expect(body).not.toHaveProperty("productIds");
        expect(fetch.mock.calls.at(-1)?.[0]).toBe(
            "/api/v1/management/vouchers/rule-id",
        );
    });
    it("validates ranges and assignments before sending writes", async () => {
        const fetch = vi.fn<typeof globalThis.fetch>();
        const service = createDiscountService(createApiClient({ fetch }));
        await expect(
            service.save("promotions", undefined, {
                ...emptyDiscount("promotions"),
                code: "INVALID",
                type: "percent",
                value: 101,
            }),
        ).rejects.toThrow();
        await expect(
            service.save("vouchers", undefined, {
                ...emptyDiscount("vouchers"),
                code: "PRIVATE",
                scope: "user",
            }),
        ).rejects.toThrow();
        expect(fetch).not.toHaveBeenCalled();
    });
});
