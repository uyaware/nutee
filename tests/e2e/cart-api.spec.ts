import { test, expect, type Page } from "@playwright/test";
import { product } from "../fixtures/catalog";
import type { ApiCart, ApiCartItem } from "@/modules/cart/model/api";

const user = {
    id: "cart-customer",
    username: "cart_user",
    email: "cart@example.invalid",
    fullName: "Cart user",
    role: "CUSTOMER",
    emailVerified: true,
    imageUrl: null,
};

function item(variantId: number, quantity: number): ApiCartItem {
    const variant = product.variants.find((value) => value.id === variantId)!;
    return {
        variantId,
        productId: product.id,
        sku: variant.sku,
        name: product.name,
        imageUrl:
            product.images.find((image) => image.id === variant.imageId)?.url ??
            "",
        price: variant.price,
        quantity,
        stock: variant.quantity,
        status: "available",
        lineTotal: variant.price * quantity,
        specifications: variant.specifications,
    };
}

async function setup(
    page: Page,
    options: {
        guest?: boolean;
        items?: ApiCartItem[];
        rejectAdd?: boolean;
    } = {},
) {
    const state = {
        items: options.items ?? [],
        writes: [] as { method: string; path: string; body: unknown }[],
        cartReads: 0,
    };
    const snapshot = (): ApiCart => ({
        ownerId: user.id,
        items: state.items,
        quantity: state.items.reduce((sum, row) => sum + row.quantity, 0),
        subtotal: state.items
            .filter((row) => row.status === "available")
            .reduce((sum, row) => sum + (row.lineTotal ?? 0), 0),
        hasIssues: state.items.some((row) => row.status !== "available"),
    });
    await page.addInitScript(() => {
        for (const storage of ["localStorage", "sessionStorage"])
            Object.defineProperty(window, storage, {
                get() {
                    throw new Error("Browser storage is disabled in this test");
                },
            });
    });
    await page.route("**/api/v1/**", async (route) => {
        const request = route.request();
        const path = new URL(request.url()).pathname.replace("/api/v1", "");
        const method = request.method();
        if (path === "/auth/csrf")
            return route.fulfill({
                json: { token: "cart-csrf", headerName: "X-XSRF-TOKEN" },
            });
        if (path === "/auth/me")
            return route.fulfill(
                options.guest ? { status: 401, json: {} } : { json: user },
            );
        if (path.startsWith("/auth/"))
            return route.fulfill({ status: 401, json: {} });
        if (path === "/cart" || path.startsWith("/cart/")) {
            if (options.guest) return route.fulfill({ status: 401, json: {} });
            if (method === "GET") {
                state.cartReads++;
                return route.fulfill({ json: snapshot() });
            }
            expect((await request.allHeaders())["x-xsrf-token"]).toBe(
                "cart-csrf",
            );
            const body = request.postData()
                ? request.postDataJSON()
                : undefined;
            state.writes.push({ method, path, body });
            if (method === "POST") {
                if (options.rejectAdd)
                    return route.fulfill({
                        status: 409,
                        json: { detail: "Không đủ tồn kho hiện tại." },
                    });
                const existing = state.items.find(
                    (row) => row.variantId === body.variantId,
                );
                if (existing) {
                    existing.quantity += body.quantity;
                    existing.lineTotal = existing.price! * existing.quantity;
                } else state.items.push(item(body.variantId, body.quantity));
            } else if (method === "PUT") {
                const row = state.items.find(
                    (row) => row.variantId === Number(path.split("/").at(-1)),
                )!;
                row.quantity = body.quantity;
                row.lineTotal = row.price! * row.quantity;
                row.status = "available";
            } else if (path === "/cart") state.items = [];
            else
                state.items = state.items.filter(
                    (row) => row.variantId !== Number(path.split("/").at(-1)),
                );
            return route.fulfill({ json: snapshot() });
        }
        if (path === "/products/7") return route.fulfill({ json: product });
        if (path === "/categories")
            return route.fulfill({ json: product.categories });
        if (path === "/brands") return route.fulfill({ json: product.brands });
        if (path === "/products/facets")
            return route.fulfill({
                json: {
                    brands: product.brands,
                    categories: product.categories,
                    specifications: [],
                },
            });
        return route.fulfill({
            json: { content: [], page: 0, size: 10, totalElements: 0 },
        });
    });
    return state;
}

test("adds the selected variants, updates the badge and quantities, selects checkout items, removes and clears", async ({
    page,
}) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const state = await setup(page);
    await page.goto("/products/7");
    await page
        .getByRole("spinbutton", { name: "Số lượng", exact: true })
        .fill("2");
    await page
        .getByRole("button", { name: "Thêm vào giỏ", exact: true })
        .click();
    await expect(
        page.getByText("Đã thêm vào giỏ.", { exact: true }),
    ).toBeVisible();
    expect(state.writes[0].body).toEqual({ variantId: 12, quantity: 2 });
    await expect(
        page.getByRole("link", { name: "Giỏ hàng, 2 sản phẩm", exact: true }),
    ).toBeVisible();
    await page.getByRole("combobox", { name: "Phiên bản" }).click();
    await page.getByRole("option", { name: /SKU-8/ }).click();
    await page
        .getByRole("button", { name: "Thêm vào giỏ", exact: true })
        .click();
    await expect(
        page.getByRole("link", { name: "Giỏ hàng, 3 sản phẩm", exact: true }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Xem giỏ hàng", exact: true }).click();
    await expect(page.getByRole("article")).toHaveCount(2);
    await page
        .getByRole("button", {
            name: `Tăng số lượng ${product.name} (SKU-16)`,
            exact: true,
        })
        .click();
    await expect(
        page.getByLabel(`Số lượng ${product.name} (SKU-16)`, { exact: true }),
    ).toHaveText("3");
    await page
        .getByRole("checkbox", {
            name: `Chọn ${product.name} (SKU-8)`,
            exact: true,
        })
        .uncheck();
    await page
        .getByRole("link", { name: "Thanh toán (3)", exact: true })
        .click();
    await expect(page).toHaveURL(/\/checkout\?items=12$/);
    await expect(
        page.getByText("16 GB / 512 GB", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("8 GB / 256 GB", { exact: true })).toHaveCount(
        0,
    );
    await expect(
        page.getByText(/Đặt hàng trực tuyến hiện chưa khả dụng/),
    ).toBeVisible();
    await page
        .getByRole("button", { name: "Kiểm tra đơn hàng", exact: true })
        .click();
    await expect(
        page.getByRole("button", { name: "Đặt hàng", exact: true }),
    ).toBeDisabled();
    await page
        .getByRole("link", { name: "Quay lại giỏ hàng", exact: true })
        .click();
    await page
        .getByRole("button", {
            name: `Xóa ${product.name} (SKU-8) khỏi giỏ`,
            exact: true,
        })
        .click();
    await expect(page.getByRole("article")).toHaveCount(1);
    await page
        .getByRole("button", { name: "Xóa giỏ hàng", exact: true })
        .click();
    await page
        .getByRole("button", { name: "Xóa toàn bộ", exact: true })
        .click();
    await expect(
        page.getByText("Giỏ hàng đang trống", { exact: true }),
    ).toBeVisible();
    await expect(
        page.getByRole("link", { name: "Giỏ hàng, 0 sản phẩm", exact: true }),
    ).toBeVisible();
    expect(state.writes.map(({ method }) => method)).toEqual([
        "POST",
        "POST",
        "PUT",
        "DELETE",
        "DELETE",
    ]);
    expect(errors).toEqual([]);
});

test("requires login and preserves the selected variant in the return URL without browser storage", async ({
    page,
}) => {
    const state = await setup(page, { guest: true });
    await page.goto("/products/7");
    await page
        .getByRole("button", { name: "Thêm vào giỏ", exact: true })
        .click();
    await expect(page).toHaveURL(/\/login\?/);
    expect(new URL(page.url()).searchParams.get("returnTo")).toBe(
        "/products/7?variant=12",
    );
    expect(state.writes).toHaveLength(0);
    expect(state.cartReads).toBe(0);
});

test("shows stock conflicts without claiming success and lets customers fix or remove unavailable rows on mobile", async ({
    page,
}) => {
    const insufficient = {
        ...item(12, 4),
        status: "insufficient-stock" as const,
    };
    const soldOut = {
        ...item(11, 1),
        stock: 0,
        status: "out-of-stock" as const,
    };
    await setup(page, { items: [insufficient, soldOut], rejectAdd: true });
    await page.goto("/products/7");
    await page
        .getByRole("button", { name: "Thêm vào giỏ", exact: true })
        .click();
    await expect(
        page.getByText("Không đủ tồn kho hiện tại.", { exact: true }),
    ).toBeVisible();
    await expect(
        page.getByText("Đã thêm vào giỏ.", { exact: true }),
    ).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/cart");
    await expect(
        page.getByText("Cần giảm số lượng", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Tạm hết hàng", { exact: true })).toBeVisible();
    await expect(
        page.getByRole("checkbox", {
            name: `Chọn ${product.name} (SKU-8)`,
            exact: true,
        }),
    ).toBeDisabled();
    await page
        .getByRole("button", {
            name: `Giảm số lượng ${product.name} (SKU-16)`,
            exact: true,
        })
        .click();
    await expect(
        page.getByLabel(`Số lượng ${product.name} (SKU-16)`, { exact: true }),
    ).toHaveText("3");
    await expect(
        page.getByRole("checkbox", {
            name: `Chọn ${product.name} (SKU-16)`,
            exact: true,
        }),
    ).toBeEnabled();
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth > window.innerWidth,
        ),
    ).toBe(false);
});
