import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/shared/api/apiClient";
import { createCartService } from "@/modules/cart/api/cartService";
import type { ApiCart } from "@/modules/cart/model/api";

const response: ApiCart = {
    ownerId: "customer-1",
    quantity: 2,
    subtotal: 24000000,
    hasIssues: false,
    items: [
        {
            productId: 7,
            variantId: 12,
            sku: "SKU-16",
            name: "Laptop",
            imageUrl: null,
            price: 12000000,
            quantity: 2,
            stock: 3,
            status: "available",
            lineTotal: 24000000,
            specifications: [
                { name: "configuration", value: "16 GB / 512 GB" },
            ],
        },
    ],
};

describe("cart API", () => {
    it("uses variant IDs and authenticated CSRF requests for the full cart lifecycle", async () => {
        const fetch = vi.fn<typeof globalThis.fetch>(async (url) =>
            Response.json(
                String(url).endsWith("/auth/csrf")
                    ? { token: "csrf", headerName: "X-XSRF-TOKEN" }
                    : response,
            ),
        );
        const cart = createCartService(createApiClient({ fetch }));
        const loaded = await cart.get();
        expect(loaded.items[0]).toMatchObject({
            productId: "7",
            variantId: "12",
            sku: "SKU-16",
            configuration: "16 GB / 512 GB",
            imageUrl: "",
        });
        await cart.add("12", 2);
        await cart.setQuantity("12", 1);
        await cart.remove("12");
        await cart.clear();
        const requests = fetch.mock.calls.filter(
            ([url]) => !String(url).endsWith("/auth/csrf"),
        );
        expect(requests.map(([url, init]) => [url, init?.method])).toEqual([
            ["/api/v1/cart", "GET"],
            ["/api/v1/cart/items", "POST"],
            ["/api/v1/cart/items/12", "PUT"],
            ["/api/v1/cart/items/12", "DELETE"],
            ["/api/v1/cart", "DELETE"],
        ]);
        expect(JSON.parse(requests[1][1]!.body as string)).toEqual({
            variantId: 12,
            quantity: 2,
        });
        expect(JSON.parse(requests[2][1]!.body as string)).toEqual({
            quantity: 1,
        });
        for (const [, init] of requests) {
            expect(init?.credentials).toBe("include");
            if (init?.method !== "GET")
                expect(new Headers(init?.headers).get("X-XSRF-TOKEN")).toBe(
                    "csrf",
                );
        }
    });

    it("rejects invalid IDs and quantities before sending a mutation", async () => {
        const fetch = vi.fn<typeof globalThis.fetch>();
        const cart = createCartService(createApiClient({ fetch }));
        for (const id of ["0", "-1", "1.5", "abc", "2147483648"]) {
            await expect(cart.add(id, 1)).rejects.toMatchObject({
                code: "VALIDATION",
            });
        }
        for (const amount of [0, -1, 100, 1.5]) {
            await expect(cart.setQuantity("12", amount)).rejects.toMatchObject({
                code: "VALIDATION",
            });
        }
        expect(fetch).not.toHaveBeenCalled();
    });

    it("surfaces stock conflicts without retrying the add or inventing a successful cart", async () => {
        const fetch = vi.fn<typeof globalThis.fetch>(async (url) =>
            String(url).endsWith("/auth/csrf")
                ? Response.json({ token: "csrf", headerName: "X-XSRF-TOKEN" })
                : Response.json(
                      { detail: "Không đủ tồn kho." },
                      { status: 409 },
                  ),
        );
        const cart = createCartService(createApiClient({ fetch }));
        await expect(cart.add("12", 2)).rejects.toMatchObject({
            code: "CONFLICT",
            message: "Không đủ tồn kho.",
        });
        expect(
            fetch.mock.calls.filter(([url]) =>
                String(url).endsWith("/cart/items"),
            ),
        ).toHaveLength(1);
    });
});
