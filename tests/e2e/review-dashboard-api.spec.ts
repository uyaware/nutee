import { test, expect, type Page } from "@playwright/test";
import { product } from "../fixtures/catalog";

async function setup(page: Page, role = "CUSTOMER") {
    const user = {
        id: "00000000-0000-0000-0000-000000000001",
        username: "reviewer",
        email: "reviewer@example.invalid",
        fullName: "Khách thử nghiệm",
        role,
        emailVerified: true,
        imageUrl: null,
    };
    const item = {
        id: 11,
        productId: product.id,
        variantId: 12,
        name: product.name,
        sku: "SKU-16",
        imageUrl: null,
        configuration: "16 GB",
        quantity: 1,
        price: 10000000,
        originalPrice: 10000000,
    };
    const order = {
        id: 2,
        code: "REVIEW0001",
        status: "delivered",
        paymentMethod: "cod",
        paymentStatus: "paid",
        subtotal: 10000000,
        promotionDiscount: 0,
        voucherDiscount: 0,
        discount: 0,
        shipping: 0,
        total: 10000000,
        addressId: 1,
        recipient: user.fullName,
        phone: "0912345678",
        addressLine: "TP Hồ Chí Minh",
        note: null,
        createdAt: "2026-11-13T02:00:00Z",
        paymentExpiresAt: null,
        items: [item],
    };
    const state = {
        rejectReview: false,
        rejectDashboard: false,
        own: {
            reviewId: null as number | null,
            rating: null as number | null,
            comment: "",
            updatedAt: null as string | null,
        },
        calls: [] as string[],
        writes: [] as unknown[],
    };
    await page.addInitScript(() => {
        for (const key of ["localStorage", "sessionStorage"])
            Object.defineProperty(window, key, {
                get() {
                    throw new Error("Browser storage is disabled");
                },
            });
    });
    await page.route("**/api/v1/**", async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        const path = url.pathname.replace("/api/v1", "");
        state.calls.push(path + url.search);
        const pageData = (content: unknown[]) => ({
            content,
            page: 0,
            size: 20,
            totalElements: content.length,
        });
        if (path === "/auth/me") return route.fulfill({ json: user });
        if (path === "/auth/csrf")
            return route.fulfill({
                json: { token: "review-csrf", headerName: "X-XSRF-TOKEN" },
            });
        if (path === "/orders/2") return route.fulfill({ json: order });
        if (path === "/orders/2/history")
            return route.fulfill({
                json: [{ status: "delivered", occurredAt: order.createdAt }],
            });
        if (path === "/orders/2/items/11/review") {
            if (request.method() === "PUT") {
                expect((await request.allHeaders())["x-xsrf-token"]).toBe(
                    "review-csrf",
                );
                state.writes.push(request.postDataJSON());
                if (state.rejectReview)
                    return route.fulfill({
                        status: 409,
                        json: { detail: "Chưa lưu được đánh giá." },
                    });
                Object.assign(state.own, request.postDataJSON(), {
                    reviewId: 9,
                    updatedAt: "2026-11-13T03:00:00Z",
                });
            }
            return route.fulfill({ json: state.own });
        }
        if (path === `/products/${product.id}`)
            return route.fulfill({
                json: {
                    ...product,
                    avgRating: state.own.rating ?? 0,
                    reviewCount: state.own.reviewId ? 1 : 0,
                },
            });
        if (path === `/products/${product.id}/reviews`)
            return route.fulfill({
                json: pageData(
                    state.own.reviewId
                        ? [
                              {
                                  id: 9,
                                  authorName: user.fullName,
                                  rating: state.own.rating,
                                  comment: state.own.comment,
                                  createdAt: state.own.updatedAt,
                              },
                          ]
                        : [],
                ),
            });
        if (path === "/categories" || path === "/brands")
            return route.fulfill({ json: [] });
        if (path === "/management/dashboard/operations")
            return route.fulfill({
                json: {
                    asOf: "2026-11-13T03:00:00Z",
                    orderCount: 18,
                    pendingCount: 2,
                    afterSaleCount: 3,
                },
            });
        if (path === "/management/dashboard") {
            if (state.rejectDashboard)
                return route.fulfill({
                    status: 400,
                    json: { detail: "Không tải được thống kê." },
                });
            const seven = url.searchParams.get("days") === "7";
            return route.fulfill({
                json: {
                    asOf: "2026-11-13T03:00:00Z",
                    timezone: "Asia/Ho_Chi_Minh",
                    fromDate: seven ? "2026-11-07" : "2026-10-15",
                    throughDate: "2026-11-13",
                    orderCount: seven ? 7 : 31,
                    pendingCount: 2,
                    afterSaleCount: 3,
                    paidValue: seven ? 700000 : 300000,
                    statuses: { pending: 2, delivered: seven ? 5 : 29 },
                    buckets: [
                        { label: "13/11", value: seven ? 700000 : 300000 },
                    ],
                    recentOrders: [
                        {
                            id: 2,
                            code: "DASH000001",
                            recipient: "Khách dashboard",
                            status: "delivered",
                            total: 300000,
                            createdAt: order.createdAt,
                        },
                    ],
                    lowStock: [{ id: 7, name: "Laptop tồn thấp", stock: 2 }],
                    publishedProducts: 12,
                    activePromotions: 3,
                    activeUsers: 9,
                },
            });
        }
        return route.fulfill({ json: pageData([]) });
    });
    return state;
}

test("review submits with CSRF, preserves failed drafts, reloads edits and updates public reviews", async ({
    page,
}) => {
    const state = await setup(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/account/orders/2");
    await page
        .getByRole("link", { name: `Đánh giá: ${product.name}`, exact: true })
        .click();
    await page.getByLabel("Nhận xét của bạn").fill("  Sản phẩm sử dụng tốt  ");
    await page.locator("label").filter({ hasText: "3 sao · Bình thường" }).click();
    state.rejectReview = true;
    await page
        .getByRole("button", { name: "Gửi đánh giá", exact: true })
        .click();
    await expect(page.getByRole("alert")).toContainText(
        "Chưa lưu được đánh giá",
    );
    await expect(page.getByLabel("Nhận xét của bạn")).toHaveValue(
        "  Sản phẩm sử dụng tốt  ",
    );
    await expect(
        page.getByText("Cảm ơn bạn đã chia sẻ!", { exact: true }),
    ).toHaveCount(0);
    state.rejectReview = false;
    await page
        .getByRole("button", { name: "Gửi đánh giá", exact: true })
        .click();
    await expect(
        page.getByRole("heading", { name: "Cảm ơn bạn đã chia sẻ!" }),
    ).toBeVisible();
    expect(state.writes.at(-1)).toEqual({
        rating: 3,
        comment: "Sản phẩm sử dụng tốt",
    });
    await page.goto("/account/orders/2/review/11?sent=1");
    await expect(
        page.getByRole("heading", { name: "Đánh giá sản phẩm", exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Nhận xét của bạn")).toHaveValue(
        "Sản phẩm sử dụng tốt",
    );
    await expect(
        page.getByRole("radio", { name: "3 sao · Bình thường", exact: true }),
    ).toBeChecked();
    await page.locator("label").filter({ hasText: "4 sao · Hài lòng" }).click();
    await page.getByLabel("Nhận xét của bạn").fill("Đánh giá đã cập nhật");
    await page
        .getByRole("button", { name: "Gửi đánh giá", exact: true })
        .click();
    await page.getByRole("link", { name: "Xem sản phẩm", exact: true }).click();
    await expect(
        page.getByText("Đánh giá đã cập nhật", { exact: true }),
    ).toBeVisible();
    expect(state.own.rating).toBe(4);
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
        ),
    ).toBe(true);
});

test("admin dashboard shows API totals, real dates, period changes and truthful load errors", async ({
    page,
}) => {
    const state = await setup(page, "ADMIN");
    await page.goto("/management");
    const paid = () =>
        page
            .getByText("Giá trị đơn đã thanh toán", { exact: true })
            .locator("..");
    await expect(paid()).toContainText("300.000");
    await expect(
        page.getByText("Đơn hàng trong kỳ", { exact: true }).locator(".."),
    ).toContainText("31");
    await expect(
        page.getByText("Laptop tồn thấp", { exact: true }),
    ).toBeVisible();
    await expect(
        page.getByText("12 sản phẩm công khai", { exact: true }),
    ).toBeVisible();
    await expect(
        page.getByText("9 tài khoản hoạt động", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/Số liệu đến ngày 13\/11\/2026/)).toBeVisible();
    await page.getByRole("combobox", { name: "Khoảng thời gian" }).click();
    await page
        .getByRole("option", { name: "7 ngày gần nhất", exact: true })
        .click();
    await expect(paid()).toContainText("700.000");
    expect(
        state.calls.some((path) => path === "/management/dashboard?days=7"),
    ).toBe(true);
    state.rejectDashboard = true;
    await page.reload();
    await expect(
        page.getByText("Không tải được thống kê.", { exact: true }),
    ).toBeVisible();
    await expect(
        page.getByText("Giá trị đơn đã thanh toán", { exact: true }),
    ).toHaveCount(0);
});

test("staff dashboard uses operations counts and does not request admin-only statistics", async ({
    page,
}) => {
    const state = await setup(page, "STAFF");
    await page.goto("/management");
    await expect(
        page.getByText("Tổng đơn vận hành", { exact: true }).locator(".."),
    ).toContainText("18");
    await expect(
        page.getByText("Yêu cầu cần xem", { exact: true }).locator(".."),
    ).toContainText("3");
    expect(
        state.calls.some((path) => path.startsWith("/management/dashboard?")),
    ).toBe(false);
    expect(state.calls).toContain("/management/dashboard/operations");
});
