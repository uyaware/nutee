import { test, expect, type Page } from "@playwright/test";

const item = {
    id: 11,
    productId: 1,
    variantId: 5,
    name: "Laptop hậu mãi",
    sku: "TEST-5",
    imageUrl: null,
    configuration: "16 GB",
    quantity: 3,
    price: 10000000,
    originalPrice: 10000000,
};
const order = {
    id: 2,
    code: "AFTER00001",
    status: "delivered",
    paymentMethod: "cod",
    paymentStatus: "paid",
    subtotal: 30000000,
    promotionDiscount: 0,
    voucherDiscount: 0,
    discount: 0,
    shipping: 0,
    total: 30000000,
    addressId: 1,
    recipient: "Khách thử nghiệm",
    phone: "0912345678",
    addressLine: "TP Hồ Chí Minh",
    note: null,
    createdAt: "2026-11-01T00:00:00Z",
    paymentExpiresAt: null,
    items: [item],
};

async function setup(page: Page, role = "CUSTOMER") {
    const user = {
        id: "00000000-0000-0000-0000-000000000001",
        username: "buyer",
        email: "buyer@example.invalid",
        fullName: "Khách thử nghiệm",
        role,
        emailVerified: true,
        imageUrl: null,
    };
    const request = {
        id: 4,
        orderId: 2,
        orderCode: order.code,
        orderItemId: 11,
        userId: user.id,
        type: "warranty",
        quantity: 3,
        reason: "Thiết bị không khởi động",
        description: null,
        status: "pending",
        createdAt: order.createdAt,
        item: { ...item, id: "11", productId: "1", warrantyExpiresAt: null },
        customer: {
            name: user.fullName,
            phone: order.phone,
            addressLine: order.addressLine,
        },
        history: [
            {
                status: "pending",
                at: order.createdAt,
                actorId: user.id,
                actorName: user.fullName,
            },
        ],
    };
    const state = {
        created: false,
        reject: false,
        writes: [] as { path: string; body: unknown }[],
        request,
    };
    await page.addInitScript(() => {
        for (const name of ["localStorage", "sessionStorage"])
            Object.defineProperty(window, name, {
                get() {
                    throw new Error("Browser storage is disabled");
                },
            });
    });
    await page.route("**/api/v1/**", async (route) => {
        const http = route.request();
        const url = new URL(http.url());
        const path = url.pathname.replace("/api/v1", "");
        const paged = (content: unknown[]) => ({
            content,
            page: 0,
            size: 5,
            totalElements: content.length,
            totalPages: content.length ? 1 : 0,
        });
        if (path === "/auth/me") return route.fulfill({ json: user });
        if (path === "/auth/csrf")
            return route.fulfill({
                json: { token: "after-sale-csrf", headerName: "X-XSRF-TOKEN" },
            });
        if (path === "/orders") return route.fulfill({ json: paged([order]) });
        if (path === "/orders/2") return route.fulfill({ json: order });
        if (path === "/orders/2/history")
            return route.fulfill({
                json: [{ status: "delivered", occurredAt: order.createdAt }],
            });
        if (path === "/categories" || path === "/brands")
            return route.fulfill({ json: [] });
        if (http.method() === "POST") {
            expect((await http.allHeaders())["x-xsrf-token"]).toBe(
                "after-sale-csrf",
            );
            state.writes.push({ path, body: http.postDataJSON() });
            if (state.reject)
                return route.fulfill({
                    status: 409,
                    json: {
                        detail: "Yêu cầu đã tồn tại. Vui lòng kiểm tra lại.",
                    },
                });
            if (path.endsWith("/4/status")) {
                const body = http.postDataJSON();
                expect(body.expectedStatus).toBe(state.request.status);
                state.request.status = body.status;
                state.request.history.push({
                    status: body.status,
                    at: new Date().toISOString(),
                    actorId: user.id,
                    actorName: "Nhân viên",
                });
            } else {
                expect(path).toBe("/after-sales");
                state.request.reason = http.postDataJSON().reason;
                state.created = true;
            }
            return route.fulfill({
                status: path === "/after-sales" ? 201 : 200,
                json: state.request,
            });
        }
        if (path.endsWith("/after-sales/4"))
            return route.fulfill({ json: state.request });
        if (path.endsWith("/after-sales")) {
            const status = url.searchParams.get("status");
            return route.fulfill({
                json: paged(
                    state.created &&
                        (status === "all" || status === state.request.status)
                        ? [state.request]
                        : [],
                ),
            });
        }
        return route.fulfill({ json: paged([]) });
    });
    return state;
}

test("creates a real full-line request, preserves failed draft, and reloads from API on mobile", async ({
    page,
}) => {
    const state = await setup(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/account/orders/2");
    await page
        .getByRole("link", { name: "Bảo hành / đổi trả: Laptop hậu mãi" })
        .click();
    await expect(page.getByLabel("Số lượng", { exact: true })).toHaveValue("3");
    await expect(page.getByLabel("Số lượng", { exact: true })).toHaveAttribute(
        "readonly",
        "",
    );
    await page
        .getByLabel("Lý do và mô tả vấn đề")
        .fill("Thiết bị không khởi động");
    state.reject = true;
    await page
        .getByRole("button", { name: "Gửi yêu cầu", exact: true })
        .click();
    await expect(page.getByRole("alert")).toContainText("Yêu cầu đã tồn tại");
    await expect(page.getByLabel("Lý do và mô tả vấn đề")).toHaveValue(
        "Thiết bị không khởi động",
    );
    await expect(page).toHaveURL(/after-sales\/new/);
    state.reject = false;
    await page
        .getByRole("button", { name: "Gửi yêu cầu", exact: true })
        .click();
    await expect(page).toHaveURL(/\/account\/after-sales\/4$/);
    expect(state.writes.at(-1)?.body).toEqual({
        orderItemId: 11,
        type: "warranty",
        reason: "Thiết bị không khởi động",
    });
    await page.reload();
    await expect(
        page.getByRole("heading", { name: "Yêu cầu 4", exact: true }),
    ).toBeVisible();
    await expect(
        page.getByText("Thiết bị không khởi động", { exact: false }),
    ).toBeVisible();
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
        ),
    ).toBe(true);
    await page.getByRole("link", { name: "Quay lại hậu mãi" }).click();
    await expect(
        page.getByRole("link", { name: "Xem chi tiết" }),
    ).toBeVisible();
    await page.getByRole("tab", { name: "Hoàn tất", exact: true }).click();
    await expect(
        page.getByText("Chưa có yêu cầu phù hợp.", { exact: false }),
    ).toBeVisible();
});

test("staff confirms API transitions and preserves errors without a fake successful status", async ({
    page,
}) => {
    const state = await setup(page, "STAFF");
    state.created = true;
    await page.goto("/management/after-sales/4");
    await page.getByRole("button", { name: "Tiếp nhận yêu cầu" }).click();
    state.reject = true;
    await page
        .getByRole("dialog")
        .getByRole("button", { name: "Xác nhận", exact: true })
        .click();
    await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
        "Yêu cầu đã tồn tại",
    );
    expect(state.request.status).toBe("pending");
    state.reject = false;
    await page
        .getByRole("dialog")
        .getByRole("button", { name: "Xác nhận", exact: true })
        .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
        page.getByRole("button", { name: "Chấp thuận", exact: true }),
    ).toBeVisible();
    expect(state.writes.at(-1)?.body).toEqual({
        expectedStatus: "pending",
        status: "reviewing",
    });
    await page.reload();
    await expect(
        page.getByRole("button", { name: "Chấp thuận", exact: true }),
    ).toBeVisible();
});
