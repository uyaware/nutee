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
        failPayment: false,
        omitQr: false,
        paymentCreates: 0,
        refreshRequests: 0,
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
        qrCode:
            state.created && !state.omitQr
                ? "00020101021238570010A000000727012700069704220113113366668888020899998888530370454061000005802VN62230819THANH TOAN DON HANG6304BE36"
                : null,
        expiresAt: order().paymentExpiresAt,
        bankBin: state.created && !state.omitQr ? "970422" : null,
        accountNumber: state.created && !state.omitQr ? "113366668888" : null,
        accountName: state.created && !state.omitQr ? "NUTEE TEST" : null,
        transferContent: state.created && !state.omitQr ? order().code : null,
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
            if (state.method === "qr" && !state.failPayment)
                state.created = true;
            return route.fulfill({
                status: 201,
                json: {
                    ...order(),
                    payment: state.created ? payment() : null,
                    paymentError: state.failPayment
                        ? "Đơn hàng đã tạo, nhưng chưa thể tạo mã QR. Vui lòng thử lại."
                        : null,
                },
            });
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
            if (req.method() === "POST") {
                state.paymentCreates++;
                state.created = true;
            }
            return route.fulfill({ json: payment() });
        }
        if (path === "/orders/42/payment/refresh") {
            state.refreshRequests++;
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

test("checkout retries the identical order and displays the server-provided QR immediately", async ({
    page,
}, testInfo) => {
    const state = await setup(page);
    await page.goto("/checkout?items=11");
    await expect(page.getByText("125.000 ₫", { exact: true })).toBeVisible();
    await page.getByRole("radio", { name: /Chuyển khoản bằng mã QR/ }).check();
    await page
        .getByRole("button", { name: "Kiểm tra đơn hàng", exact: true })
        .click();
    await page.getByRole("button", { name: "Đặt hàng", exact: true }).click();
    await expect(page.getByTestId("system-error-banner")).toBeVisible();
    await expect(
        page.getByRole("button", { name: "Quay lại", exact: true }),
    ).toBeDisabled();
    await page
        .getByRole("button", { name: "Thử lại đặt hàng", exact: true })
        .click();
    await expect(page).toHaveURL(/\/checkout\?order=42$/);
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
    await expect(
        page.getByRole("img", { name: "Mã QR thanh toán VietQR" }),
    ).toBeVisible();
    expect(state.paymentCreates).toBe(0);
    await expect(page.getByText("125.000 ₫", { exact: true })).toHaveCount(1);
    await expect(page.getByText("Số tiền", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("main").getByRole("alert")).toHaveCount(1);
    await expect(
        page.getByRole("button", { name: "Kiểm tra thanh toán với payOS" }),
    ).toHaveCount(0);
    const title = page.getByRole("heading", {
        name: "Thanh toán qua VietQR",
        exact: true,
    });
    const status = page.getByText("Chờ thanh toán", { exact: true });
    const titleBounds = await title.boundingBox();
    const statusBounds = await status.boundingBox();
    expect(statusBounds!.x).toBeGreaterThan(
        titleBounds!.x + titleBounds!.width,
    );
    expect(
        Math.abs(
            statusBounds!.y +
                statusBounds!.height / 2 -
                titleBounds!.y -
                titleBounds!.height / 2,
        ),
    ).toBeLessThan(5);
    const qr = page.getByRole("img", { name: "Mã QR thanh toán VietQR" });
    const details = page.getByRole("heading", {
        name: "Thông tin thanh toán",
        exact: true,
    });
    const qrBounds = await qr.boundingBox();
    const detailsBounds = await details.boundingBox();
    expect(detailsBounds!.x).toBeGreaterThan(qrBounds!.x + qrBounds!.width);
    await page.screenshot({
        path: testInfo.outputPath("payment-desktop.png"),
        fullPage: true,
    });
    await expect(page.getByText("113366668888", { exact: true })).toBeVisible();
    await expect(page.getByText("NUTEE TEST", { exact: true })).toBeVisible();
    await expect(page.getByText("NUTEE00042", { exact: true })).toBeVisible();
    await page.reload();
    await expect(
        page.getByRole("img", { name: "Mã QR thanh toán VietQR" }),
    ).toBeVisible();
    await expect(
        page.getByRole("link", { name: "Mở trang thanh toán", exact: true }),
    ).toHaveAttribute("href", "https://pay.payos.vn/web/test-link");
    await expect(page.getByText("113366668888", { exact: true })).toBeVisible();
    await expect(
        page.getByText("Thanh toán thành công", { exact: true }),
    ).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(details).toBeVisible();
    const mobileQr = await qr.boundingBox();
    const mobileDetails = await details.boundingBox();
    expect(mobileDetails!.y).toBeGreaterThan(mobileQr!.y + mobileQr!.height);
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
    ).toBe(true);
    await page.screenshot({
        path: testInfo.outputPath("payment-mobile.png"),
        fullPage: true,
    });
});

test("browser refresh reads backend payment status without trusting query parameters", async ({
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
        page.getByRole("heading", {
            name: "Thanh toán qua VietQR",
            exact: true,
        }),
    ).toBeVisible();
    await page.reload();
    await expect(
        page.getByRole("heading", {
            name: "Thanh toán qua VietQR",
            exact: true,
        }),
    ).toBeVisible();
    expect(state.refreshRequests).toBe(0);
    await expect(
        page.getByRole("heading", {
            name: "Thanh toán thành công",
            exact: true,
        }),
    ).toHaveCount(0);
    state.paid = true;
    await page.reload();
    await expect(
        page.getByRole("heading", {
            name: "Thanh toán thành công",
            exact: true,
        }),
    ).toBeVisible();
    await expect(
        page.getByRole("link", { name: "Mở trang thanh toán", exact: true }),
    ).toHaveCount(0);
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

test("returning from payOS verifies once with the server and never trusts a forged paid status", async ({
    page,
}) => {
    const state = await setup(page);
    state.created = true;
    await page.goto(
        "/orders/42/payment?code=00&id=test-link&orderCode=123&status=PAID",
    );
    await expect(page.getByTestId("system-error-banner")).toBeVisible();
    expect(state.refreshRequests).toBe(1);
    await expect(
        page.getByRole("heading", {
            name: "Thanh toán thành công",
            exact: true,
        }),
    ).toHaveCount(0);
    await page.reload();
    await expect(
        page.getByRole("heading", {
            name: "Thanh toán thành công",
            exact: true,
        }),
    ).toBeVisible();
    expect(state.refreshRequests).toBe(2);
});

test("payment provider error keeps the created order and retries only the QR", async ({
    page,
}) => {
    const state = await setup(page);
    state.rejectOrder = false;
    state.failPayment = true;
    await page.goto("/checkout?items=11");
    await page.getByRole("radio", { name: /Chuyển khoản bằng mã QR/ }).check();
    await page
        .getByRole("button", { name: "Kiểm tra đơn hàng", exact: true })
        .click();
    await page.getByRole("button", { name: "Đặt hàng", exact: true }).click();
    await expect(
        page.getByRole("alert").filter({ hasText: "Đơn hàng đã tạo" }),
    ).toBeVisible();
    expect(state.requests).toHaveLength(1);
    await page.getByRole("button", { name: "Thử lại tạo mã QR" }).click();
    await expect(
        page.getByRole("img", { name: "Mã QR thanh toán VietQR" }),
    ).toBeVisible();
    expect(state.requests).toHaveLength(1);
    expect(state.paymentCreates).toBe(1);
});

test("a payment without a saved QR opens the payment link only when requested", async ({
    page,
}) => {
    const state = await setup(page);
    state.created = true;
    state.omitQr = true;
    await page.context().route("https://pay.payos.vn/**", (route) =>
        route.fulfill({
            contentType: "text/html",
            body: "<h1>Trang thanh toán payOS</h1>",
        }),
    );
    await page.goto("/orders/42/payment");
    await expect(
        page.getByRole("alert").filter({ hasText: "Chưa thể hiển thị mã QR" }),
    ).toBeVisible();
    await expect(
        page.getByRole("img", { name: "Mã QR thanh toán VietQR" }),
    ).toHaveCount(0);
    await expect(page).toHaveURL(/\/orders\/42\/payment$/);
    const paymentLink = page.getByRole("link", {
        name: "Mở trang thanh toán",
        exact: true,
    });
    await expect(paymentLink).toHaveAttribute(
        "href",
        "https://pay.payos.vn/web/test-link",
    );
    await expect(paymentLink).toHaveAttribute("rel", "noopener noreferrer");
    const popupReady = page.waitForEvent("popup");
    await paymentLink.click();
    const popup = await popupReady;
    await expect(popup).toHaveURL("https://pay.payos.vn/web/test-link");
    await expect(page).toHaveURL(/\/orders\/42\/payment$/);
    expect(state.paid).toBe(false);
    await popup.close();
});
