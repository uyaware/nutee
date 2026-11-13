import { test, expect, type Page } from "@playwright/test";

const initialUser = {
    id: "account-owner",
    username: "account_user",
    email: "account@example.invalid",
    fullName: "Tên ban đầu",
    role: "CUSTOMER",
    emailVerified: false,
    imageUrl: null,
};
type Address = {
    id: number;
    provinceCity: string;
    wardCommune: string;
    street: string;
    isDefault: boolean;
};

async function setup(
    page: Page,
    options: { rejectLink?: boolean; rejectSave?: boolean } = {},
) {
    const state = {
        user: { ...initialUser },
        phone: "0912345678",
        googleLinked: false,
        addresses: [] as Address[],
        nextId: 1,
        nonces: 0,
        rejectLink: !!options.rejectLink,
        rejectSave: !!options.rejectSave,
        writes: [] as { path: string; method: string; body: unknown }[],
    };
    await page.addInitScript(() => {
        for (const storage of ["localStorage", "sessionStorage"])
            Object.defineProperty(window, storage, {
                get() {
                    throw new Error("Browser storage must not be used");
                },
            });
    });
    await page.route("https://accounts.google.com/gsi/client", (route) =>
        route.fulfill({
            contentType: "application/javascript",
            body: `window.google = { accounts: { id: {
            initialize(options) { window.googleCallback = options.callback; },
            renderButton(element) { const button = document.createElement('button'); button.textContent = 'Google test link';
                button.onclick = () => window.googleCallback({ credential: 'google-link-credential' }); element.appendChild(button); }
        } } };`,
        }),
    );
    await page.route("**/api/v1/**", async (route) => {
        const request = route.request();
        const path = new URL(request.url()).pathname.replace("/api/v1", "");
        const method = request.method();
        const snapshot = () => ({
            user: state.user,
            phone: state.phone,
            googleLinked: state.googleLinked,
            addresses: state.addresses,
        });
        if (path === "/auth/me") return route.fulfill({ json: state.user });
        if (path === "/auth/csrf")
            return route.fulfill({
                json: { token: "account-csrf", headerName: "X-XSRF-TOKEN" },
            });
        if (path === "/auth/social/google/nonce") {
            state.nonces++;
            return route.fulfill({ json: { nonce: `nonce-${state.nonces}` } });
        }
        if (method !== "GET") {
            expect((await request.allHeaders())["x-xsrf-token"]).toBe(
                "account-csrf",
            );
            state.writes.push({
                path,
                method,
                body: request.postData() ? request.postDataJSON() : undefined,
            });
        }
        if (path === "/auth/social/google/link") {
            if (state.rejectLink)
                return route.fulfill({
                    status: 409,
                    json: {
                        detail: "Email Google phải trùng tài khoản đang đăng nhập.",
                    },
                });
            state.googleLinked = true;
            state.user.emailVerified = true;
            return route.fulfill({ json: state.user });
        }
        if (path === "/account/profile") {
            if (method === "PUT") {
                if (state.rejectSave)
                    return route.fulfill({
                        status: 503,
                        json: {
                            detail: "Chưa lưu được hồ sơ. Vui lòng thử lại.",
                        },
                    });
                const body = request.postDataJSON();
                state.user.fullName = body.fullName;
                state.phone = body.phone.startsWith("+84")
                    ? "0" + body.phone.slice(3)
                    : body.phone;
                if (body.address)
                    state.addresses.push({
                        ...body.address,
                        id: state.nextId++,
                    });
            }
            return route.fulfill({ json: snapshot() });
        }
        if (path.startsWith("/account/addresses")) {
            if (state.rejectSave)
                return route.fulfill({
                    status: 409,
                    json: {
                        detail: "Địa chỉ đang được sử dụng. Vui lòng thử lại.",
                    },
                });
            const id = Number(path.split("/")[3]);
            if (
                method === "POST" ||
                (method === "PUT" && !path.endsWith("/default"))
            ) {
                const body = request.postDataJSON();
                const previous = state.addresses.find(
                    (value) => value.id === id,
                );
                const isDefault = Boolean(
                    body.isDefault ||
                    !state.addresses.length ||
                    previous?.isDefault,
                );
                if (isDefault)
                    state.addresses.forEach(
                        (address) => (address.isDefault = false),
                    );
                const saved = {
                    ...body,
                    isDefault,
                    id: method === "POST" ? state.nextId++ : id,
                };
                if (previous) Object.assign(previous, saved);
                else state.addresses.push(saved);
            } else if (path.endsWith("/default")) {
                state.addresses.forEach(
                    (address) => (address.isDefault = address.id === id),
                );
            } else if (method === "DELETE") {
                const wasDefault = state.addresses.find(
                    (address) => address.id === id,
                )?.isDefault;
                state.addresses = state.addresses.filter(
                    (address) => address.id !== id,
                );
                if (wasDefault && state.addresses.length)
                    state.addresses[0].isDefault = true;
            }
            return route.fulfill({
                status: method === "POST" ? 201 : 200,
                json: snapshot(),
            });
        }
        if (path === "/cart")
            return route.fulfill({
                json: {
                    ownerId: state.user.id,
                    items: [],
                    quantity: 0,
                    subtotal: 0,
                    hasIssues: false,
                },
            });
        if (path === "/brands" || path === "/categories")
            return route.fulfill({ json: [] });
        if (path === "/products/facets")
            return route.fulfill({
                json: { brands: [], categories: [], specifications: [] },
            });
        return route.fulfill({
            json: { content: [], page: 0, size: 12, totalElements: 0 },
        });
    });
    return state;
}

test("links Google with a fresh nonce after a conflict and keeps the link after reload", async ({
    page,
}) => {
    const state = await setup(page, { rejectLink: true });
    await page.goto("/account/security");
    await page.getByRole("button", { name: "Google test link" }).click();
    await expect(page.getByRole("alert")).toContainText(
        "Email Google phải trùng",
    );
    await expect(page.getByText("Đã liên kết Google thành công.")).toHaveCount(
        0,
    );
    await expect.poll(() => state.nonces).toBeGreaterThanOrEqual(2);
    state.rejectLink = false;
    await page.getByRole("button", { name: "Google test link" }).click();
    await expect(page.getByRole("alert")).toContainText(
        "Đã liên kết Google thành công.",
    );
    expect(
        state.writes
            .filter((request) => request.path.endsWith("/link"))
            .map((request) => request.body),
    ).toEqual([
        { credential: "google-link-credential" },
        { credential: "google-link-credential" },
    ]);
    expect(
        state.writes.some((request) => request.path === "/auth/social/google"),
    ).toBe(false);
    await page.reload();
    await expect(page.getByText("Tài khoản đã liên kết Google.")).toBeVisible();
    await expect(
        page.getByRole("button", { name: "Google test link" }),
    ).toHaveCount(0);
});

test("updates the profile through the API, preserves drafts on failure and persists after reload", async ({
    page,
}) => {
    const state = await setup(page, { rejectSave: true });
    await page.goto("/account/profile");
    await page.getByLabel("Tên hiển thị", { exact: true }).fill("Tên mới");
    await page.getByLabel("Số điện thoại", { exact: true }).fill("123");
    await expect(
        page.getByRole("button", { name: "Lưu hồ sơ", exact: true }),
    ).toBeDisabled();
    await page
        .getByLabel("Số điện thoại", { exact: true })
        .fill("+84987654321");
    await page.getByRole("button", { name: "Lưu hồ sơ", exact: true }).click();
    await expect(
        page.getByRole("alert").filter({ hasText: "Chưa lưu được hồ sơ" }),
    ).toBeVisible();
    await expect(page.getByLabel("Tên hiển thị", { exact: true })).toHaveValue(
        "Tên mới",
    );
    expect(state.user.fullName).toBe(initialUser.fullName);
    state.rejectSave = false;
    await page.getByRole("button", { name: "Lưu hồ sơ", exact: true }).click();
    await expect(page.getByText("Đã lưu hồ sơ.")).toBeVisible();
    expect(state.writes.at(-1)?.body).toEqual({
        fullName: "Tên mới",
        phone: "+84987654321",
    });
    await page.reload();
    await expect(page.getByLabel("Tên hiển thị", { exact: true })).toHaveValue(
        "Tên mới",
    );
    await expect(page.getByLabel("Số điện thoại", { exact: true })).toHaveValue(
        "0987654321",
    );
});

async function fillAddress(page: Page, street: string) {
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel("Họ và tên", { exact: true })).toHaveCount(
        0,
    );
    await expect(
        dialog.getByLabel("Số điện thoại", { exact: true }),
    ).toHaveCount(0);
    await dialog.getByLabel("Tỉnh/Thành phố").fill("TP Hồ Chí Minh");
    await dialog.getByLabel("Phường/Xã").fill("Phường 1");
    await dialog.getByLabel("Số nhà, tên đường").fill(street);
}

test("manages delivery addresses and keeps exactly one default on mobile without browser storage", async ({
    page,
}) => {
    const state = await setup(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/account/addresses");
    await expect(
        page.getByText("Chưa có địa chỉ", { exact: true }),
    ).toBeVisible();
    await page
        .getByRole("button", { name: "Thêm địa chỉ", exact: true })
        .click();
    await page
        .getByRole("button", { name: "Lưu địa chỉ", exact: true })
        .click();
    expect(state.writes).toHaveLength(0);
    await fillAddress(page, "12 Đường A");
    await page
        .getByRole("button", { name: "Lưu địa chỉ", exact: true })
        .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(state.addresses[0].isDefault).toBe(true);
    await page
        .getByRole("button", { name: "Thêm địa chỉ", exact: true })
        .click();
    await fillAddress(page, "24 Đường B");
    await page
        .getByRole("button", { name: "Lưu địa chỉ", exact: true })
        .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page
        .getByRole("button", {
            name: "Sửa địa chỉ 24 Đường B, Phường 1, TP Hồ Chí Minh",
            exact: true,
        })
        .click();
    await page
        .getByRole("dialog")
        .getByLabel("Số nhà, tên đường")
        .fill("36 Đường B");
    await page
        .getByRole("button", { name: "Lưu địa chỉ", exact: true })
        .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
        page.getByText("36 Đường B, Phường 1, TP Hồ Chí Minh", { exact: true }),
    ).toBeVisible();
    await page
        .getByRole("button", {
            name: "Đặt 36 Đường B, Phường 1, TP Hồ Chí Minh làm mặc định",
            exact: true,
        })
        .click();
    await expect
        .poll(
            () => state.addresses.find((address) => address.isDefault)?.street,
        )
        .toBe("36 Đường B");
    await page.reload();
    await expect(page.getByText("Mặc định", { exact: true })).toHaveCount(1);
    await page
        .getByRole("button", {
            name: "Xóa địa chỉ 36 Đường B, Phường 1, TP Hồ Chí Minh",
            exact: true,
        })
        .click();
    await page
        .getByRole("dialog")
        .getByRole("button", { name: "Xác nhận xóa", exact: true })
        .click();
    await expect(
        page.getByText("36 Đường B, Phường 1, TP Hồ Chí Minh", { exact: true }),
    ).toHaveCount(0);
    expect(state.addresses[0].isDefault).toBe(true);
    await page
        .getByRole("button", {
            name: "Xóa địa chỉ 12 Đường A, Phường 1, TP Hồ Chí Minh",
            exact: true,
        })
        .click();
    await page
        .getByRole("dialog")
        .getByRole("button", { name: "Xác nhận xóa", exact: true })
        .click();
    await expect(
        page.getByText("Chưa có địa chỉ", { exact: true }),
    ).toBeVisible();
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth > window.innerWidth,
        ),
    ).toBe(false);
});

test("keeps an address form open with its draft when the server rejects a save", async ({
    page,
}) => {
    const state = await setup(page, { rejectSave: true });
    await page.goto("/account/addresses");
    await page
        .getByRole("button", { name: "Thêm địa chỉ", exact: true })
        .click();
    await fillAddress(page, "12 Đường A");
    await page
        .getByRole("button", { name: "Lưu địa chỉ", exact: true })
        .click();
    await expect(
        page
            .getByRole("dialog")
            .getByRole("alert")
            .filter({ hasText: "Địa chỉ đang được sử dụng" }),
    ).toBeVisible();
    await expect(
        page.getByRole("dialog").getByLabel("Số nhà, tên đường"),
    ).toHaveValue("12 Đường A");
    expect(state.addresses).toHaveLength(0);
});

test("completes a profile with an optional address through one atomic request", async ({
    page,
}) => {
    const state = await setup(page);
    state.phone = "";
    await page.goto("/account/setup?returnTo=/account/profile");
    await page.getByLabel("Họ và tên").fill("Hoàn thiện hồ sơ");
    await page.getByLabel("Số điện thoại").fill("0912345678");
    await page.getByLabel("Tỉnh/Thành phố").fill("TP Hồ Chí Minh");
    await page.getByLabel("Phường/Xã").fill("Phường 1");
    await page.getByLabel("Số nhà, tên đường").fill("12 Đường A");
    await page
        .getByRole("button", { name: "Hoàn tất đăng ký", exact: true })
        .click();
    await expect(page).toHaveURL(/\/account\/profile$/);
    await expect(
        page.getByLabel("Địa chỉ mặc định", { exact: true }),
    ).toHaveValue("12 Đường A, Phường 1, TP Hồ Chí Minh");
    expect(state.writes).toHaveLength(1);
    expect(state.writes[0].path).toBe("/account/profile");
});
