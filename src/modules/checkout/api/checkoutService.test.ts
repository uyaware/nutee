import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/shared/api/apiClient";
import { createCheckoutService } from "@/modules/checkout/api/checkoutService";

describe("checkout discount quote", () => {
    it("sends only cart variant IDs and normalized code with cookies/CSRF and trusts server totals", async () => {
        const fetch = vi.fn<typeof globalThis.fetch>(async (url) =>
            Response.json(
                String(url).endsWith("/csrf")
                    ? { token: "csrf", headerName: "X-XSRF-TOKEN" }
                    : {
                          items: [],
                          subtotal: 10000000,
                          promotionDiscount: 1000000,
                          voucherDiscount: 500000,
                          discount: 1500000,
                          total: 8500000,
                          voucherCode: "SAVE10",
                          shippingConfirmed: false,
                      },
            ),
        );
        const checkout = createCheckoutService(createApiClient({ fetch }));
        expect(await checkout.quote([11], " save10 ")).toMatchObject({
            total: 8500000,
            voucherCode: "SAVE10",
        });
        expect(fetch).toHaveBeenLastCalledWith(
            "/api/v1/checkout/quote",
            expect.objectContaining({
                method: "POST",
                credentials: "include",
                body: JSON.stringify({
                    variantIds: [11],
                    voucherCode: "SAVE10",
                }),
            }),
        );
        expect(
            new Headers(fetch.mock.calls.at(-1)![1]?.headers).get(
                "X-XSRF-TOKEN",
            ),
        ).toBe("csrf");
    });
    it("rejects invalid selections and preserves API voucher failures", async () => {
        const fetch = vi.fn<typeof globalThis.fetch>(async (url) =>
            String(url).endsWith("/csrf")
                ? Response.json({ token: "csrf", headerName: "X-XSRF-TOKEN" })
                : Response.json(
                      { detail: "Voucher đã hết lượt." },
                      { status: 409 },
                  ),
        );
        const checkout = createCheckoutService(createApiClient({ fetch }));
        await expect(checkout.quote([], "SAVE")).rejects.toThrow();
        expect(fetch).not.toHaveBeenCalled();
        await expect(checkout.quote([11], "SAVE")).rejects.toMatchObject({
            code: "CONFLICT",
            message: "Voucher đã hết lượt.",
        });
    });
});
