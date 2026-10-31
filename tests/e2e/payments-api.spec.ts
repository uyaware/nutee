import { test, expect, type Page } from "@playwright/test";

const user = {
    id: "00000000-0000-0000-0000-000000000001",
    username: "buyer",
    fullName: "Người mua",
    email: "buyer@example.invalid",
    role: "CUSTOMER",
    emailVerified: true,
    imageUrl: null,
};
async function setup(page: Page) {
    const state = {
        payosEnabled: true,
        method: "qr",
        paid: false,
        created: false,
        rejectOrder: true,
        rejectRefresh: true,
        requests: [] as Record<string, unknown>[],
    };
    const item = {
        id: 1,
        variantId: 11,
        productId: 1,
        sku: "TEST",
        name: "Laptop thử nghiệm",
        imageUrl: "",
        configuration: "8 GB / 256 GB",
        quantity: 1,
        price: 100000,
        originalPrice: 100000,
    };
    const order = () => ({
        id: 42,
        code: "NUTEE00042",
        status: state.paid ? "confirmed" : "pending",
        paymentMethod: state.method,
        paymentStatus: state.paid
            ? "paid"
            : state.method === "cod"
              ? "unpaid"
              : "pending",
        subtotal: 100000,
        promotionDiscount: 0,
        voucherDiscount: 0,
        discount: 0,
        shipping: 25000,
        total: 125000,
        addressId: 1,
        recipient: user.fullName,
        phone: "0912345678",
        addressLine: "12 Đường A, Phường 1, TP Hồ Chí Minh",
        note: "",
        createdAt: new Date().toISOString(),
        paymentExpiresAt: new Date(Date.now() + 900000).toISOString(),
        items: [item],
    });
    const payment = () => ({
        orderId: 42,
        status: state.paid ? "paid" : "pending",
        amount: 125000,
        checkoutUrl: state.created
            ? "https://pay.payos.vn/web/test-link"
            : null,
        expiresAt: order().paymentExpiresAt,
    });
    await page.addInitScript(() => {
        for (const key of ["localStorage", "sessionStorage"])
            Object.defineProperty(window, key, {
                get() {
                    throw new Error("Browser storage disabled");
                },
            });
    });
    await page.route("**/api/v1/**", async (route) => {
        const req = route.request();
        const path = new URL(req.url()).pathname.replace("/api/v1", "");
        if (path === "/auth/me") return route.fulfill({ json: user });
        if (path === "/auth/csrf")
            return route.fulfill({
                json: { token: "payment-csrf", headerName: "X-XSRF-TOKEN" },
            });
        if (req.method() === "POST")
            expect((await req.allHeaders())["x-xsrf-token"]).toBe(
                "payment-csrf",
            );
        if (path === "/account/profile")
            return route.fulfill({
                json: {
                    user,
                    googleLinked: false,
                    phone: "0912345678",
                    addresses: [
                        {
                            id: 1,
                            provinceCity: "TP Hồ Chí Minh",
                            wardCommune: "Phường 1",
                            street: "12 Đường A",
                            isDefault: true,
                        },
                    ],
                },
            });
        if (path === "/checkout/config")
            return route.fulfill({
                json: { shippingFee: 25000, payosEnabled: state.payosEnabled },
            });
        if (path === "/cart")
            return route.fulfill({
                json: {
                    ownerId: user.id,
                    items: [
                        {
                            ...item,
                            stock: 2,
                            status: "available",
                            lineTotal: 100000,
                            specifications: [],
                        },
                    ],
                    quantity: 1,
                    subtotal: 100000,
                    hasIssues: false,
                },
            });
        if (path === "/vouchers")
            return route.fulfill({
                json: { content: [], page: 0, size: 20, totalElements: 0 },
            });
        if (path === "/checkout/quote")
            return route.fulfill({
                json: {
                    items: [
                        {
                            ...item,
                            stock: 2,
                            status: "available",
                            lineTotal: 100000,
                            specifications: [],
                        },
                    ],
                    subtotal: 100000,
                    promotionDiscount: 0,
                    voucherDiscount: 0,
                    discount: 0,
                    total: 100000,
                    voucherCode: null,
                    shippingConfirmed: false,
                },
            });
        if (path === "/orders" && req.method() === "POST") {
            state.requests.push(req.postDataJSON());
            state.method = req.postDataJSON().paymentMethod;
            if (state.rejectOrder) {
                state.rejectOrder = false;
                return route.fulfill({
                    status: 502,
                    json: { detail: "Chưa nhận được kết quả đặt hàng." },
                });
            }
            return route.fulfill({ status: 201, json: order() });
        }
        if (path === "/orders")
            return route.fulfill({
                json: {
                    content: [order()],
                    page: 0,
                    size: 20,
                    totalElements: 1,
                },
            });
        if (path === "/orders/42") return route.fulfill({ json: order() });
        if (path === "/orders/42/payment") {
            if (req.method() === "POST") state.created = true;
            return route.fulfill({ json: payment() });
        }
        if (path === "/orders/42/payment/refresh") {
            if (state.rejectRefresh) {
                state.rejectRefresh = false;
                return route.fulfill({
                    status: 502,
                    json: { detail: "Chưa thể kiểm tra thanh toán với payOS." },
                });
            }
            state.paid = true;
            return route.fulfill({ json: payment() });
        }
        if (path === "/orders/42/cancel")
            return route.fulfill({ json: order() });
        return route.fulfill({
            json: { content: [], page: 0, size: 20, totalElements: 0 },
        });
    });
    return state;
}

test("checkout includes configured delivery fee and retries the identical order before opening a real hosted payment link", async ({
    page,
}) => {
    const state = await setup(page);
    await page.goto("/checkout?items=11");
    await expect(page.getByText("125.000 ₫", { exact: true })).toBeVisible();
    await page.getByRole("radio", { name: /Chuyển khoản bằng mã QR/ }).check();
    await page
        .getByRole("button", { name: "Kiểm tra đơn hàng", exact: true })
        .click();
    await page.getByRole("button", { name: "Đặt hàng", exact: true }).click();
    await expect(
        page
            .getByRole("alert")
            .filter({ hasText: "Chưa nhận được kết quả đặt hàng" }),
    ).toBeVisible();
    await expect(
        page.getByRole("button", { name: "Quay lại", exact: true }),
    ).toBeDisabled();
    await page
        .getByRole("button", { name: "Thử lại đặt hàng", exact: true })
        .click();
    await expect(page).toHaveURL(/\/orders\/42\/payment$/);
    expect(state.requests).toHaveLength(2);
    expect(state.requests[1]).toEqual(state.requests[0]);
    expect(state.requests[0]).toMatchObject({
        expectedTotal: 125000,
        addressId: 1,
        paymentMethod: "qr",
        variantIds: [11],
    });
    expect(state.requests[0]).not.toHaveProperty("recipient");
    expect(state.requests[0]).not.toHaveProperty("phone");
    expect(state.requests[0]).not.toHaveProperty("addressLine");
    await page
        .getByRole("button", { name: "Tạo link thanh toán payOS", exact: true })
        .click();
    await expect(
        page.getByRole("link", { name: "Mở trang thanh toán payOS" }),
    ).toHaveAttribute("href", "https://pay.payos.vn/web/test-link");
    await expect(
        page.getByText("Thanh toán thành công", { exact: true }),
    ).toHaveCount(0);
});

test("browser query parameters cannot mark an order paid and provider errors remain visible until the server confirms", async ({
    page,
}) => {
    const state = await setup(page);
    state.created = true;
    await page.goto("/orders/42/success?payment=paid&status=paid");
    await expect(
        page.getByRole("heading", { name: "Trạng thái đơn hàng", exact: true }),
    ).toBeVisible();
    await expect(
        page.getByText("Hệ thống đã xác nhận thanh toán.", { exact: true }),
    ).toHaveCount(0);
    await page
        .getByRole("link", { name: "Kiểm tra thanh toán", exact: true })
        .click();
    await expect(
        page.getByRole("heading", { name: "Thanh toán an toàn qua payOS" }),
    ).toBeVisible();
    await page
        .getByRole("button", { name: "Kiểm tra thanh toán với payOS" })
        .click();
    await expect(
        page
            .getByRole("alert")
            .filter({ hasText: "Chưa thể kiểm tra thanh toán" }),
    ).toBeVisible();
    await expect(
        page.getByText("Thanh toán thành công", { exact: true }),
    ).toHaveCount(0);
    await page
        .getByRole("button", { name: "Kiểm tra thanh toán với payOS" })
        .click();
    await expect(
        page.getByRole("heading", {
            name: "Thanh toán thành công",
            exact: true,
        }),
    ).toBeVisible();
    await page
        .getByRole("link", { name: "Xem xác nhận đơn hàng", exact: true })
        .click();
    await expect(
        page.getByText("Hệ thống đã xác nhận thanh toán.", { exact: true }),
    ).toBeVisible();
    await page
        .getByRole("link", { name: "Theo dõi đơn hàng", exact: true })
        .click();
    await expect(
        page.getByRole("heading", { name: "Đơn hàng NUTEE00042", exact: true }),
    ).toBeVisible();
});

test("COD places an order with the configured fee while payOS is disabled", async ({
    page,
}) => {
    const state = await setup(page);
    state.payosEnabled = false;
    state.rejectOrder = false;
    await page.goto("/checkout?items=11");
    await expect(
        page.getByRole("radio", { name: /Chuyển khoản bằng mã QR/ }),
    ).toBeDisabled();
    await page
        .getByRole("button", { name: "Kiểm tra đơn hàng", exact: true })
        .click();
    await page.getByRole("button", { name: "Đặt hàng", exact: true }).click();
    await expect(page).toHaveURL(/\/orders\/42\/success$/);
    await expect(
        page.getByText(
            "Thanh toán khi nhận hàng. Cửa hàng sẽ xác nhận thời gian giao hàng.",
            { exact: true },
        ),
    ).toBeVisible();
    expect(state.requests[0]).toMatchObject({
        expectedTotal: 125000,
        paymentMethod: "cod",
    });
    expect(state.created).toBe(false);
});
