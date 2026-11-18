import { test, expect, type Page } from "@playwright/test";
import { product } from "../fixtures/catalog";

const customer = {
    id: "00000000-0000-0000-0000-000000000001",
    username: "discount_user",
    email: "discount@example.invalid",
    fullName: "Discount User",
    role: "CUSTOMER",
    emailVerified: true,
    imageUrl: null,
};
async function management(page: Page) {
    const state = {
        rules: [] as Record<string, unknown>[],
        reject: false,
        rejectDelete: false,
        productOptions: [{ id: 7, name: "Laptop ưu đãi", published: true, imageUrl: "/images/laptop.svg", minPrice: 10000000, maxPrice: 12000000, promotionId: null as string | null, promotionCode: null as string | null }],
        customerOptions: [{ id: customer.id, name: customer.fullName, email: customer.email, username: customer.username, imageUrl: null }],
        writes: [] as {
            method: string;
            path: string;
            body: Record<string, unknown>;
        }[],
    };
    await page.route("**/api/v1/**", async (route) => {
        const request = route.request();
        const path = new URL(request.url()).pathname.replace("/api/v1", "");
        if (path === "/auth/me")
            return route.fulfill({ json: { ...customer, role: "ADMIN" } });
        if (path === "/auth/csrf")
            return route.fulfill({
                json: { token: "csrf", headerName: "X-XSRF-TOKEN" },
            });
        if (path.endsWith("/products"))
            return route.fulfill({
                json: {
                    content: state.productOptions,
                    page: 0,
                    size: 50,
                    totalElements: 1,
                },
            });
        if (path.endsWith("/customers"))
            return route.fulfill({
                json: {
                    content: state.customerOptions,
                    page: 0,
                    size: 50,
                    totalElements: 1,
                },
            });
        const method = request.method();
        if (method !== "GET") {
            expect((await request.allHeaders())["x-xsrf-token"]).toBe("csrf");
            const body = request.postData()
                ? (request.postDataJSON() as Record<string, unknown>)
                : {};
            state.writes.push({ method, path, body });
            if (state.reject || (state.rejectDelete && method === "DELETE"))
                return route.fulfill({
                    status: 409,
                    json: {
                        detail: "Ưu đãi đang được sử dụng. Vui lòng kiểm tra lại.",
                    },
                });
            if (method === "DELETE") {
                state.rules = [];
                return route.fulfill({ status: 204 });
            }
            if (method === "PATCH") {
                Object.assign(state.rules[0], body, {
                    status: body.isActive ? "active" : "paused",
                });
                return route.fulfill({ json: state.rules[0] });
            }
            const saved = {
                ...body,
                id: "11111111-1111-1111-1111-111111111111",
                status: body.isActive ? "active" : "paused",
                products: body.productIds
                    ? [{ id: 7, name: "Laptop ưu đãi" }]
                    : [],
                users:
                    body.scope === "user"
                        ? [
                              {
                                  id: customer.id,
                                  name: customer.fullName,
                                  email: customer.email,
                              },
                          ]
                        : [],
            };
            state.rules = [saved];
            return route.fulfill({
                status: method === "POST" ? 201 : 200,
                json: saved,
            });
        }
        if (/\/management\/(promotions|vouchers)$/.test(path))
            return route.fulfill({
                json: {
                    content: state.rules,
                    page: 0,
                    size: 20,
                    totalElements: state.rules.length,
                },
            });
        if (path.startsWith("/management/"))
            return route.fulfill({ json: state.rules[0] });
        return route.fulfill({ json: [] });
    });
    return state;
}

test("admin creates, pauses, edits and deletes a product promotion through the API", async ({
    page,
}) => {
    const state = await management(page);
    await page.goto("/management/promotions");
    await page
        .getByRole("link", { name: "Tạo promotion", exact: true })
        .click();
    await page
        .getByRole("textbox", { name: "Mã promotion", exact: true })
        .fill("SALE10");
    await page.getByLabel("Chọn sản phẩm").fill("Laptop");
    await page
        .getByRole("option", { name: /Laptop ưu đãi/ })
        .click();
    await page
        .getByRole("button", { name: "Lưu thay đổi", exact: true })
        .click();
    await expect(page).toHaveURL(/\/management\/promotions$/);
    await expect(
        page.getByRole("row").filter({ hasText: "SALE10" }),
    ).toBeVisible();
    expect(state.writes[0].body.productIds).toEqual([7]);
    await page.getByRole("button", { name: "Tạm dừng", exact: true }).click();
    await page
        .getByRole("dialog")
        .getByRole("button", { name: "Xác nhận", exact: true })
        .click();
    await expect(page.getByText("Tạm dừng", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Chỉnh sửa", exact: true }).click();
    await page
        .getByRole("spinbutton", { name: "Mức giảm (VND)", exact: true })
        .fill("50000");
    await page
        .getByRole("button", { name: "Lưu thay đổi", exact: true })
        .click();
    await expect(page).toHaveURL(/\/management\/promotions$/);
    await page.getByRole("link", { name: "Chỉnh sửa", exact: true }).click();
    await page
        .getByRole("button", { name: "Xóa promotion", exact: true })
        .click();
    await page
        .getByRole("button", { name: "Xác nhận xóa", exact: true })
        .click();
    await expect(page).toHaveURL(/\/management\/promotions$/);
    await expect(page.getByText("Chưa có promotion phù hợp.")).toBeVisible();
});

test("promotion product selector shows product details and blocks conflicts", async ({ page }) => {
    const state = await management(page);
    state.productOptions.push({ id: 8, name: "Sản phẩm đã gắn", published: true, imageUrl: "/images/mouse.svg", minPrice: 500000, maxPrice: 500000, promotionId: "other-rule", promotionCode: "OTHER" });
    state.productOptions.push({ id: 9, name: "Sản phẩm ẩn", published: false, imageUrl: "/images/mouse.svg", minPrice: 500000, maxPrice: 500000, promotionId: null, promotionCode: null });
    await page.goto("/management/promotions/new");
    await page.getByLabel("Chọn sản phẩm").click();
    const available = page.getByRole("option", { name: /Laptop ưu đãi/ });
    await expect(available).toContainText("ID: 7");
    await expect(available).toContainText("10.000.000");
    await expect(page.getByRole("option", { name: /Sản phẩm đã gắn/ })).toHaveAttribute("aria-disabled", "true");
    await available.click();
    await expect(page.getByText("Đã chọn 1 sản phẩm")).toBeVisible();
    await expect(page.getByRole("link", { name: /Quản lý sản phẩm Laptop ưu đãi/ })).toHaveAttribute("href", "/management/products/7/edit");
    await expect(page.getByRole("link", { name: /Quản lý sản phẩm Laptop ưu đãi/ })).toHaveAttribute("target", "_blank");
    await page.getByLabel("Chọn sản phẩm").click();
    await page.getByRole("option", { name: /Sản phẩm ẩn/ }).click();
    await expect(page.getByRole("link", { name: /Quản lý sản phẩm Sản phẩm ẩn/ })).toHaveAttribute("href", "/management/products/9/edit");
    await page.getByRole("combobox", { name: "Áp dụng cho" }).click();
    await page.getByRole("option", { name: "Tất cả sản phẩm hiện có" }).click();
    await expect(page.getByText(/Sản phẩm thêm sau không tự tham gia/)).toBeVisible();
    await page.getByRole("textbox", { name: "Mã promotion" }).fill("ALL10");
    await page.getByRole("button", { name: "Lưu thay đổi" }).click();
    await expect(page).toHaveURL(/\/management\/promotions$/);
    expect(state.writes[0].body).toMatchObject({ scope: "all", productIds: [] });
});

test("management product editor links to the customer page when published", async ({ page }) => {
    await management(page);
    let published = true;
    await page.route("**/api/v1/management/products/7", (route) => route.fulfill({ json: {
        id: 7, name: "Laptop ưu đãi", description: "", published, brandId: null,
        categoryIds: [], defaultVariantId: null, updatedAt: "2026-01-01T00:00:00Z", images: [], variants: [],
    } }));
    await page.route("**/api/v1/management/taxonomy/**", (route) => route.fulfill({ json: [] }));
    await page.goto("/management/products/7/edit");
    const storeLink = page.getByLabel("Xem trên cửa hàng (mở tab mới)");
    await expect(storeLink).toHaveAttribute("href", "/products/7");
    await expect(storeLink).toHaveAttribute("target", "_blank");
    published = false;
    await page.reload();
    await expect(storeLink).toHaveAttribute("aria-disabled", "true");
});

test("admin assigns a voucher to customers and preserves edits when the API refuses a save or deletion", async ({
    page,
}) => {
    const state = await management(page);
    state.reject = true;
    await page.goto("/management/vouchers/new");
    await page
        .getByRole("textbox", { name: "Mã voucher", exact: true })
        .fill("PRIVATE10");
    await page.getByRole("combobox", { name: /^Áp dụng cho/ }).click();
    await page
        .getByRole("option", { name: "Khách hàng được chọn", exact: true })
        .click();
    await page.getByLabel("Chọn khách hàng").fill("discount");
    await page.getByRole("option", { name: /Discount User/ }).click();
    await page
        .getByRole("button", { name: "Lưu thay đổi", exact: true })
        .click();
    await expect(page.getByRole("alert")).toContainText(
        "Ưu đãi đang được sử dụng",
    );
    await expect(
        page.getByRole("textbox", { name: "Mã voucher", exact: true }),
    ).toHaveValue("PRIVATE10");
    state.reject = false;
    await page
        .getByRole("button", { name: "Lưu thay đổi", exact: true })
        .click();
    await expect(page).toHaveURL(/\/management\/vouchers$/);
    expect(state.writes.at(-1)?.body.userIds).toEqual([customer.id]);
    await page.getByRole("link", { name: "Chỉnh sửa", exact: true }).click();
    state.rejectDelete = true;
    await page
        .getByRole("button", { name: "Xóa voucher", exact: true })
        .click();
    await page
        .getByRole("button", { name: "Xác nhận xóa", exact: true })
        .click();
    await expect(
        page.getByRole("dialog").getByRole("alert"),
    ).toContainText("Ưu đãi đang được sử dụng");
    expect(state.rules).toHaveLength(1);
});

test("voucher scope and selected customers stay clear and removable", async ({ page }) => {
    const state = await management(page);
    state.customerOptions.push({ id: "00000000-0000-0000-0000-000000000002", name: "Second User", email: "second@example.invalid", username: "second", imageUrl: null });
    await page.goto("/management/vouchers/new");
    await expect(page.getByText(/bao gồm cả khách hàng đăng ký sau này/)).toBeVisible();
    await page.getByRole("combobox", { name: "Áp dụng cho" }).click();
    await page.getByRole("option", { name: "Khách hàng được chọn" }).click();
    await page.getByLabel("Chọn khách hàng").click();
    const first = page.getByRole("option", { name: /Discount User/ });
    await expect(first).toContainText(customer.email);
    await first.click();
    await page.getByLabel("Chọn khách hàng").click();
    await page.getByRole("option", { name: /Second User/ }).click();
    await expect(page.getByText("Đã chọn 2 khách hàng")).toBeVisible();
    await page.getByRole("button", { name: "Bỏ chọn Discount User" }).click();
    await expect(page.getByText("Đã chọn 1 khách hàng")).toBeVisible();
    await page.getByRole("textbox", { name: "Mã voucher" }).fill("PERSONAL");
    await page.getByRole("button", { name: "Lưu thay đổi" }).click();
    await expect(page).toHaveURL(/\/management\/vouchers$/);
    expect(state.writes[0].body).toMatchObject({ scope: "user", userIds: ["00000000-0000-0000-0000-000000000002"] });
});

test("account management offers staff and admin roles only", async ({ page }) => {
    await management(page);
    await page.route("**/api/v1/management/users?*", (route) => route.fulfill({ json: { content: [], page: 0, size: 20, totalElements: 0 } }));
    await page.goto("/management/users");
    await page.getByRole("button", { name: "Thêm tài khoản" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("combobox", { name: "Vai trò" }).click();
    await expect(page.getByRole("option", { name: "Nhân viên" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Quản trị viên" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Khách hàng" })).toHaveCount(0);
});

test("staff detail shows two balanced sections and saves access changes", async ({ page }) => {
    await management(page);
    const employee = { id: "00000000-0000-0000-0000-000000000003", name: "Nhân viên A", email: "staff@example.invalid", phone: null, role: "staff", isActive: true };
    await page.route("**/api/v1/management/users/00000000-0000-0000-0000-000000000003**", async (route) => {
        if (route.request().method() === "PUT") Object.assign(employee, route.request().postDataJSON());
        await route.fulfill({ json: employee });
    });
    await page.goto(`/management/users/${employee.id}`);
    const info = page.getByRole("heading", { name: "Thông tin tài khoản" }).locator("xpath=../..");
    const access = page.getByRole("heading", { name: "Vai trò và quyền truy cập" }).locator("xpath=../..");
    const infoBox = await info.boundingBox();
    const accessBox = await access.boundingBox();
    expect(infoBox).not.toBeNull();
    expect(accessBox).not.toBeNull();
    expect(Math.abs(infoBox!.width - accessBox!.width)).toBeLessThan(2);
    await page.getByRole("combobox", { name: "Vai trò" }).click();
    await page.getByRole("option", { name: "Quản trị viên" }).click();
    await expect(page.getByText("Vai trò đang chọn")).toBeVisible();
    await page.getByRole("button", { name: "Lưu thay đổi" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Xác nhận" }).click();
    await expect(page.getByText("Đã lưu quyền tài khoản.")).toBeVisible();
    expect(employee.role).toBe("admin");
});

test("checkout gets server quotes, applies and removes vouchers and does not keep a stale discounted total on failure", async ({
    page,
}) => {
    const line = {
        variantId: 12,
        productId: 7,
        sku: "SKU-16",
        name: product.name,
        imageUrl: "",
        price: 9000000,
        originalPrice: 10000000,
        promotionCode: "SALE10",
        quantity: 1,
        stock: 3,
        status: "available",
        lineTotal: 9000000,
        specifications: [{ name: "configuration", value: "16 GB / 512 GB" }],
    };
    const requests: Record<string, unknown>[] = [];
    await page.setViewportSize({ width: 375, height: 812 });
    await page.route("**/api/v1/**", async (route) => {
        const request = route.request();
        const path = new URL(request.url()).pathname.replace("/api/v1", "");
        if (path === "/auth/me") return route.fulfill({ json: customer });
        if (path === "/auth/csrf")
            return route.fulfill({
                json: { token: "csrf", headerName: "X-XSRF-TOKEN" },
            });
        if (path === "/account/profile")
            return route.fulfill({
                json: {
                    user: customer,
                    phone: "0912345678",
                    googleLinked: false,
                    addresses: [],
                },
            });
        if (path === "/cart")
            return route.fulfill({
                json: {
                    ownerId: customer.id,
                    items: [line],
                    quantity: 1,
                    subtotal: 9000000,
                    hasIssues: false,
                },
            });
        if (path === "/vouchers")
            return route.fulfill({
                json: { content: [], page: 0, size: 20, totalElements: 0 },
            });
        if (path === "/checkout/config")
            return route.fulfill({
                json: { shippingFee: 25000, payosEnabled: true },
            });
        if (path === "/checkout/quote") {
            // Config is served separately; this endpoint quotes merchandise only.
            expect((await request.allHeaders())["x-xsrf-token"]).toBe("csrf");
            const body = request.postDataJSON() as {
                variantIds: number[];
                voucherCode: string;
            };
            requests.push(body);
            if (body.voucherCode === "EXPIRED")
                return route.fulfill({
                    status: 409,
                    json: { detail: "Voucher đã hết hạn." },
                });
            const amount = body.voucherCode ? 500000 : 0;
            return route.fulfill({
                json: {
                    items: [line],
                    subtotal: 10000000,
                    promotionDiscount: 1000000,
                    voucherDiscount: amount,
                    discount: 1000000 + amount,
                    total: 9000000 - amount,
                    voucherCode: body.voucherCode || null,
                    shippingConfirmed: false,
                },
            });
        }
        return route.fulfill({ json: [] });
    });
    await page.goto("/checkout?items=12");
    await expect(page.getByText("9.000.000 ₫", { exact: true })).toHaveCount(1);
    await expect(page.getByText("9.025.000 ₫", { exact: true })).toBeVisible();
    await page.getByLabel("Mã voucher", { exact: true }).fill("EXPIRED");
    await page.getByRole("button", { name: "Áp dụng", exact: true }).click();
    await expect(
        page.getByRole("alert").filter({ hasText: "Voucher đã hết hạn" }),
    ).toBeVisible();
    await expect(page.getByText("Tổng tiền hàng", { exact: true })).toHaveCount(
        0,
    );
    await page.getByLabel("Mã voucher", { exact: true }).fill("SAVE10");
    await page.getByRole("button", { name: "Áp dụng", exact: true }).click();
    await expect(page.getByText("8.525.000 ₫", { exact: true })).toBeVisible();
    await expect(
        page.getByText("Voucher SAVE10", { exact: true }),
    ).toBeVisible();
    expect(requests.at(-1)).toEqual({
        variantIds: [12],
        voucherCode: "SAVE10",
    });
    await page.getByRole("button", { name: "Bỏ voucher", exact: true }).click();
    await expect(page.getByText("9.025.000 ₫", { exact: true })).toBeVisible();
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth > window.innerWidth,
        ),
    ).toBe(false);
});
