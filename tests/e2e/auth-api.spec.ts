import { test, expect } from "@playwright/test";

const user = {
  id: "api-user",
  username: "api_tester",
  email: "api@example.com",
  fullName: "API Tester",
  role: "CUSTOMER",
};
const session = { expiresIn: 900, refreshExpiresIn: 604800, user };
test.beforeEach(async ({ page, context }) => {
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
      return route.fulfill({ status: 403, json: { code: "CSRF_INVALID" } });
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
    if (path.endsWith("/reset-password")) return route.fulfill({ status: 204 });
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
    const remember = path.endsWith("/refresh")
      ? headers.cookie?.includes("rememberLogin=true")
      : path.endsWith("/google")
        ? url.searchParams.get("remember") === "true"
        : route.request().postDataJSON()?.remember === true;
    // Simulate backend Set-Cookie using the browser cookie jar; application JS never reads JWTs.
    await context.addCookies([
      {
        name: "accessToken",
        value: "api-access",
        domain: "localhost",
        path: "/api/v1",
        httpOnly: true,
        sameSite: "Lax",
        expires: remember ? Date.now() / 1000 + 900 : -1,
      },
      {
        name: "refreshToken",
        value: "api-refresh",
        domain: "localhost",
        path: "/api/v1",
        httpOnly: true,
        sameSite: "Lax",
        expires: remember ? Date.now() / 1000 + 604800 : -1,
      },
      {
        name: "rememberLogin",
        value: String(!!remember),
        domain: "localhost",
        path: "/api/v1",
        httpOnly: true,
        sameSite: "Lax",
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
  await page.getByLabel("Mật khẩu", { exact: true }).fill("StrongPassword123!");
  await page.getByRole("checkbox", { name: "Ghi nhớ đăng nhập" }).check();
  const request = page.waitForRequest("**/api/v1/auth/login");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  expect((await request).postDataJSON()).toEqual({
    identifier: user.email,
    password: "StrongPassword123!",
    remember: true,
  });
  await expect(page).toHaveURL(/\/cart$/);
  const cookies = (await context.cookies()).filter((cookie) =>
    ["accessToken", "refreshToken"].includes(cookie.name),
  );
  expect(cookies).toHaveLength(2);
  expect(
    cookies.every(
      (cookie) =>
        cookie.httpOnly && cookie.path === "/api/v1" && cookie.expires > 0,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(() => localStorage.getItem("nutee:auth:customer")),
  ).toBeNull();
  expect(
    await page.evaluate(() => sessionStorage.getItem("nutee:auth:customer")),
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
    (await context.cookies()).some((cookie) => cookie.name === "refreshToken"),
  ).toBe(false);
});

test("registration uses API cookies and never stores JWTs or the real password in browser storage", async ({
  page,
  context,
}) => {
  await page.goto("/register?returnTo=%2Fcart");
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("StrongPassword123!");
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
  await expect(page).toHaveURL(/\/cart$/);
  expect(
    await page.evaluate(() => localStorage.getItem("nutee:db:v1")),
  ).not.toContain("StrongPassword123!");
  expect(
    await page.evaluate(() => sessionStorage.getItem("nutee:auth:customer")),
  ).toBeNull();
  expect(
    (await context.cookies()).find((cookie) => cookie.name === "refreshToken"),
  ).toMatchObject({ httpOnly: true, expires: -1 });
});

test("forgot and reset password submit API shapes with CSRF and reject mismatched confirmation", async ({
  page,
}) => {
  await page.goto("/forgot-password");
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  const forgot = page.waitForRequest("**/api/v1/auth/forgot-password");
  await page
    .getByRole("button", { name: "Gửi liên kết đặt lại mật khẩu" })
    .click();
  expect((await forgot).postDataJSON()).toEqual({ email: user.email });
  await expect(page.getByRole("alert")).toContainText(
    "Nếu email có tài khoản phù hợp",
  );
  const token = "a".repeat(43);
  await page.goto(`/reset-password#token=${token}`);
  await page
    .getByLabel("Mật khẩu mới", { exact: true })
    .fill("ReplacementPassword123!");
  await page.getByLabel("Xác nhận mật khẩu", { exact: true }).fill("different");
  await page.getByRole("button", { name: "Lưu mật khẩu mới" }).click();
  await expect(page.getByText("Mật khẩu xác nhận không khớp.")).toBeVisible();
  await page
    .getByLabel("Xác nhận mật khẩu", { exact: true })
    .fill("ReplacementPassword123!");
  const reset = page.waitForRequest("**/api/v1/auth/reset-password");
  await page.getByRole("button", { name: "Lưu mật khẩu mới" }).click();
  expect((await reset).postDataJSON()).toEqual({
    token,
    password: "ReplacementPassword123!",
  });
  await expect(page.getByRole("alert")).toContainText("Đã đổi mật khẩu");
});

test("Google callback establishes an HttpOnly cookie session", async ({
  page,
  context,
}) => {
  await page.goto("/login?returnTo=%2Fcart");
  const request = page.waitForRequest(
    "**/api/v1/auth/social/google?remember=false",
  );
  await page.getByRole("button", { name: "Google test sign in" }).click();
  expect((await request).postDataJSON()).toEqual({
    credential: "google-test-credential",
  });
  await expect(page).toHaveURL(/\/cart$/);
  expect(
    (await context.cookies()).find((cookie) => cookie.name === "accessToken")
      ?.httpOnly,
  ).toBe(true);
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
