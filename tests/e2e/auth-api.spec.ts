import { test, expect } from "@playwright/test";

const user = {
  id: "api-user",
  username: "api_tester",
  email: "api@example.com",
  fullName: "API Tester",
  role: "CUSTOMER",
};
const tokens = {
  accessToken: "api-access",
  refreshToken: "api-refresh",
  expiresIn: 900,
  refreshExpiresIn: 604800,
  user,
};
test.beforeEach(async ({ page }) => {
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
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/me")) return route.fulfill({ json: user });
    if (path.endsWith("/google/nonce"))
      return route.fulfill({ json: { nonce: "test-nonce" } });
    if (path.endsWith("/forgot-password"))
      return route.fulfill({
        json: {
          message:
            "Nếu email có tài khoản phù hợp, bạn sẽ nhận được liên kết đặt lại mật khẩu.",
        },
      });
    if (path.endsWith("/logout") || path.endsWith("/reset-password"))
      return route.fulfill({ status: 204 });
    return route.fulfill({
      status: path.endsWith("/register") ? 201 : 200,
      json: tokens,
    });
  });
});

test("login sends API credentials, remembers login, survives reload and logs out", async ({
  page,
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
  });
  await expect(page).toHaveURL(/\/cart$/);
  expect(
    await page.evaluate(() => localStorage.getItem("nutee:auth:customer")),
  ).toContain("api-refresh");
  await page.reload();
  await page.goto("/account/profile");
  await expect(
    page.getByRole("button", { name: "Đăng xuất cửa hàng" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Đăng xuất cửa hàng" }).click();
  await expect(page).toHaveURL(/\/login/);
  expect(
    await page.evaluate(() => localStorage.getItem("nutee:auth:customer")),
  ).toBeNull();
});

test("registration uses the backend and never stores the password in the prototype database", async ({
  page,
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
  ).toContain("api-refresh");
});

test("forgot and reset password submit real API shapes and reject mismatched confirmation", async ({
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

test("Google callback submits the Google ID token and establishes an API session", async ({
  page,
}) => {
  await page.goto("/login?returnTo=%2Fcart");
  const request = page.waitForRequest("**/api/v1/auth/google");
  await page.getByRole("button", { name: "Google test sign in" }).click();
  expect((await request).postDataJSON()).toEqual({
    idToken: "google-test-credential",
  });
  await expect(page).toHaveURL(/\/cart$/);
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
