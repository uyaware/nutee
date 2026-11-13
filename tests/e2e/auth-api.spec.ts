import { test, expect } from "@playwright/test";

const user = {
    id: "api-user",
    username: "api_tester",
    email: "api@example.com",
    fullName: "API Tester",
    role: "CUSTOMER",
    emailVerified: true,
    imageUrl: null,
};
const session = { expiresIn: 900, refreshExpiresIn: 604800, user };
test.beforeEach(async ({ page, context }) => {
    await page.route("**/api/v1/account/profile", (route) =>
        route.fulfill({
            json: {
                user,
                phone: "0912345678",
                googleLinked: false,
                addresses: [],
            },
        }),
    );
    await page.route("**/api/v1/cart", (route) =>
        route.fulfill({
            json: {
                ownerId: user.id,
                items: [],
                quantity: 0,
                subtotal: 0,
                hasIssues: false,
            },
        }),
    );
    await page.route(
        (url) =>
            ["/api/v1/products", "/api/v1/categories", "/api/v1/brands"].some(
                (path) => url.pathname.startsWith(path),
            ),
        (route) => {
            const path = new URL(route.request().url()).pathname;
            return route.fulfill({
                json: path.endsWith("/facets")
                    ? { brands: [], categories: [], specifications: [] }
                    : path.endsWith("/brands") || path.endsWith("/categories")
                      ? []
                      : { content: [], page: 0, size: 12, totalElements: 0 },
            });
        },
    );
    await page.route("https://accounts.google.com/gsi/client", (route) =>
        route.fulfill({
            contentType: "application/javascript",
            body: `window.google = { accounts: { id: {
      initialize(options) { window.googleCallback = options.callback; },
      renderButton(element) { const button = document.createElement('button'); button.textContent = 'Google test sign in'; button.onclick = () => window.googleCallback({ credential: 'google-test-credential' }); element.appendChild(button); }
    } } };`,
        }),
    );
    await page.route("**/api/v1/auth/**", async (route) => {
        const url = new URL(route.request().url());
        const path = url.pathname;
        const headers = await route.request().allHeaders();
        if (path.endsWith("/csrf")) {
            await context.addCookies([
                {
                    name: "XSRF-TOKEN",
                    value: "csrf-cookie",
                    domain: "localhost",
                    path: "/api/v1",
                    httpOnly: true,
                    sameSite: "Lax",
                },
            ]);
            return route.fulfill({
                json: { token: "csrf-value", headerName: "X-XSRF-TOKEN" },
            });
        }
        if (
            route.request().method() === "POST" &&
            headers["x-xsrf-token"] !== "csrf-value"
        ) {
            return route.fulfill({
                status: 403,
                json: { code: "CSRF_INVALID" },
            });
        }
        if (path.endsWith("/me"))
            return route.fulfill(
                headers.cookie?.includes("accessToken=api-access")
                    ? { json: user }
                    : { status: 401, json: {} },
            );
        if (path.endsWith("/google/nonce"))
            return route.fulfill({ json: { nonce: "test-nonce" } });
        if (path.endsWith("/forgot-password"))
            return route.fulfill({
                json: {
                    message:
                        "Nếu email có tài khoản phù hợp, bạn sẽ nhận được liên kết đặt lại mật khẩu.",
                },
            });
        if (path.endsWith("/reset-password"))
            return route.fulfill({ status: 204 });
        if (path.endsWith("/logout")) {
            await context.clearCookies();
            return route.fulfill({ status: 204 });
        }
        if (
            path.endsWith("/refresh") &&
            !headers.cookie?.includes("refreshToken=api-refresh")
        ) {
            return route.fulfill({ status: 401, json: {} });
        }
        // Simulate backend Set-Cookie using the browser cookie jar; application JS never reads JWTs.
        await context.addCookies([
            {
                name: "accessToken",
                value: "api-access",
                domain: "localhost",
                path: "/api/v1",
                httpOnly: true,
                sameSite: "Lax",
                expires: Date.now() / 1000 + 900,
            },
            {
                name: "refreshToken",
                value: "api-refresh",
                domain: "localhost",
                path: "/api/v1",
                httpOnly: true,
                sameSite: "Lax",
                expires: Date.now() / 1000 + 604800,
            },
        ]);
        return route.fulfill({
            status: path.endsWith("/register") ? 201 : 200,
            json: session,
        });
    });
});

test("login uses HttpOnly cookies, automatically refreshes, and logs out without token bodies", async ({
    page,
    context,
}) => {
    await page.goto("/login?returnTo=%2Fcart");
    await page.getByLabel("Email", { exact: true }).fill(user.email);
    await page
        .getByLabel("Mật khẩu", { exact: true })
        .fill("StrongPassword123!");
    const request = page.waitForRequest("**/api/v1/auth/login");
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    expect((await request).postDataJSON()).toEqual({
        identifier: user.email,
        password: "StrongPassword123!",
    });
    await expect(page).toHaveURL(/\/cart$/);
    const cookies = (await context.cookies()).filter((cookie) =>
        ["accessToken", "refreshToken"].includes(cookie.name),
    );
    expect(cookies).toHaveLength(2);
    expect(
        cookies.every(
            (cookie) =>
                cookie.httpOnly &&
                cookie.path === "/api/v1" &&
                cookie.expires > 0,
        ),
    ).toBe(true);
    expect(
        await page.evaluate(() => localStorage.getItem("nutee:auth:customer")),
    ).toBeNull();
    expect(
        await page.evaluate(() =>
            sessionStorage.getItem("nutee:auth:customer"),
        ),
    ).toBeNull();
    await context.addCookies([
        {
            name: "accessToken",
            value: "",
            domain: "localhost",
            path: "/api/v1",
            expires: 1,
        },
    ]);
    const refresh = page.waitForRequest("**/api/v1/auth/refresh");
    await page.goto("/account/profile");
    const refreshed = await refresh;
    expect(refreshed.postData()).toBeNull();
    expect((await refreshed.allHeaders()).cookie).toContain(
        "refreshToken=api-refresh",
    );
    await expect(
        page.getByRole("button", { name: "Đăng xuất cửa hàng" }),
    ).toBeVisible();
    const logout = page.waitForRequest("**/api/v1/auth/logout");
    await page.getByRole("button", { name: "Đăng xuất cửa hàng" }).click();
    expect((await logout).postData()).toBeNull();
    await expect(page).toHaveURL(/\/login/);
    expect(
        (await context.cookies()).some(
            (cookie) => cookie.name === "refreshToken",
        ),
    ).toBe(false);
});

for (const destination of ["/cart", "/account/profile"]) {
    test(`registration uses API cookies and redirects to ${destination}`, async ({
        page,
        context,
    }) => {
        if (destination === "/cart") {
            await page.goto("/register?returnTo=%2Fcart");
        } else {
            await page.goto("/login");
            await page
                .getByRole("link", { name: "Tạo tài khoản", exact: true })
                .click();
            await expect(page).toHaveURL(/\/register$/);
            await expect(
                page.getByRole("heading", { name: "Tạo tài khoản" }),
            ).toBeVisible();
        }
        await page.getByLabel("Email", { exact: true }).fill(user.email);
        await page
            .getByLabel("Mật khẩu", { exact: true })
            .fill("StrongPassword123!");
        await page
            .getByLabel("Xác nhận mật khẩu", { exact: true })
            .fill("StrongPassword123!");
        const request = page.waitForRequest("**/api/v1/auth/register");
        await page
            .getByRole("button", { name: "Tạo tài khoản", exact: true })
            .click();
        expect((await request).postDataJSON()).toEqual({
            email: user.email,
            password: "StrongPassword123!",
        });
        await expect(page).toHaveURL(new URL(destination, page.url()).href);
        expect(
            await page.evaluate(
                () => localStorage.getItem("nutee:db:v1") ?? "",
            ),
        ).not.toContain("StrongPassword123!");
        expect(
            await page.evaluate(() =>
                sessionStorage.getItem("nutee:auth:customer"),
            ),
        ).toBeNull();
        const refreshCookie = (await context.cookies()).find((cookie) => cookie.name === "refreshToken");
        expect(refreshCookie?.httpOnly).toBe(true);
        expect(refreshCookie?.expires).toBeGreaterThan(0);
    });
}

test("forgot and reset password submit API shapes with CSRF and reject mismatched confirmation", async ({
    page,
}) => {
    await page.goto("/forgot-password");
    await page.getByLabel("Email", { exact: true }).fill(user.email);
    const forgot = page.waitForRequest("**/api/v1/auth/forgot-password");
    await page
        .getByRole("button", { name: "Gửi mã OTP" })
        .click();
    expect((await forgot).postDataJSON()).toEqual({ email: user.email });
    await expect(page.getByRole("alert")).toContainText(
        "Nếu email có tài khoản phù hợp",
    );
    const otp = "012345";
    await page.getByRole("button", { name: "Gửi lại mã OTP" }).click();
    await expect(page.getByText("Vui lòng đợi đủ 60 giây trước khi gửi lại mã.")).toBeVisible();
    await page.getByLabel("Mã OTP", { exact: true }).fill(otp);
    await page
        .getByLabel("Mật khẩu mới", { exact: true })
        .fill("ReplacementPassword123!");
    await page
        .getByLabel("Xác nhận mật khẩu", { exact: true })
        .fill("different");
    await page.getByRole("button", { name: "Lưu mật khẩu mới" }).click();
    await expect(page.getByText("Mật khẩu xác nhận không khớp.")).toBeVisible();
    await page
        .getByLabel("Xác nhận mật khẩu", { exact: true })
        .fill("ReplacementPassword123!");
    const reset = page.waitForRequest("**/api/v1/auth/reset-password");
    await page.getByRole("button", { name: "Lưu mật khẩu mới" }).click();
    expect((await reset).postDataJSON()).toEqual({
        email: user.email,
        otp,
        password: "ReplacementPassword123!",
    });
    await expect(page.getByRole("alert")).toContainText("Đã đổi mật khẩu");
});

test("Google login and API profile work when browser storage is blocked", async ({
    page,
    context,
}) => {
    await page.addInitScript(() => {
        for (const key of ["localStorage", "sessionStorage"]) {
            Object.defineProperty(window, key, {
                configurable: true,
                get() {
                    throw new Error("Browser storage must not be used");
                },
            });
        }
    });
    await page.goto("/login");
    const request = page.waitForRequest(
        "**/api/v1/auth/social/google",
    );
    await page.getByRole("button", { name: "Google test sign in" }).click();
    expect((await request).postDataJSON()).toEqual({
        credential: "google-test-credential",
    });
    await expect(page).toHaveURL(/\/account\/profile$/);
    await expect(page.getByLabel("Email", { exact: true })).toHaveValue(
        user.email,
    );
    expect(
        (await context.cookies()).find(
            (cookie) => cookie.name === "accessToken",
        )?.httpOnly,
    ).toBe(true);
    await page.reload();
    await expect(page.getByLabel("Email", { exact: true })).toHaveValue(
        user.email,
    );
});

test("invalid credentials stay on login and show the API error", async ({
    page,
}) => {
    await page.route("**/api/v1/auth/login", (route) =>
        route.fulfill({ status: 401, json: { detail: "Invalid credentials" } }),
    );
    await page.goto("/login");
    await page.getByLabel("Email", { exact: true }).fill(user.email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill("wrong");
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText(
        "Thông tin đăng nhập không hợp lệ",
    );
    await expect(page).toHaveURL(/\/login$/);
});

test("preserves storefront and management screens with empty data", async ({
    page,
}) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(
        page.getByRole("heading", { name: /Đồ án chuyên ngành/ }),
    ).toBeVisible();
    await page.goto("/products");
    await expect(
        page.getByText("Không tìm thấy sản phẩm", { exact: true }),
    ).toBeVisible();
    await page.goto("/cart");
    await expect(
        page.getByRole("heading", { name: "Giỏ hàng của bạn" }),
    ).toBeVisible();
    await expect(
        page.getByText("Giỏ hàng đang trống", { exact: true }),
    ).toBeVisible();
    await page.route("**/api/v1/auth/me", (route) =>
        route.fulfill({ json: { ...user, role: "ADMIN" } }),
    );
    await page.route("**/api/v1/management/products?*", (route) =>
        route.fulfill({ json: { content: [], totalElements: 0 } }),
    );
    await page.goto("/management/products");
    await expect(
        page.getByRole("heading", { name: "Sản phẩm", exact: true }),
    ).toBeVisible();
    await expect(
        page.getByRole("table", { name: "Danh sách sản phẩm" }),
    ).toBeVisible();
    expect(errors).toEqual([]);
});
