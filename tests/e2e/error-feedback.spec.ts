import { test, expect, type Page } from "@playwright/test";

async function mockBackend(page: Page) {
    const user = {
        id: "00000000-0000-0000-0000-000000000001",
        username: "feedback",
        email: "feedback@example.invalid",
        fullName: "Người thử nghiệm",
        role: "CUSTOMER",
        emailVerified: true,
        imageUrl: null,
    };
    const state = {
        status: 200,
        htmlFallback: false,
        offline: false,
        rejectSave: 0,
        writes: 0,
    };
    await page.route("**/api/v1/**", async (route) => {
        const path = new URL(route.request().url()).pathname.replace(
            "/api/v1",
            "",
        );
        if (path === "/auth/me") return route.fulfill({ json: user });
        if (path === "/auth/csrf")
            return route.fulfill({
                json: { token: "feedback-csrf", headerName: "X-XSRF-TOKEN" },
            });
        if (path === "/cart")
            return route.fulfill({
                json: {
                    ownerId: user.id,
                    items: [],
                    quantity: 0,
                    subtotal: 0,
                    hasIssues: false,
                },
            });
        if (path === "/account/profile") {
            if (route.request().method() === "PUT") {
                state.writes++;
                if (state.rejectSave)
                    return route.fulfill({
                        status: state.rejectSave,
                        json: { detail: "Không lưu được hồ sơ." },
                    });
                user.fullName = route.request().postDataJSON().fullName;
            }
            return route.fulfill({
                json: {
                    user,
                    phone: "0912345678",
                    googleLinked: true,
                    addresses: [],
                },
            });
        }
        if (path === "/categories" || path === "/brands")
            return route.fulfill({ json: [] });
        if (path === "/products/facets")
            return route.fulfill({
                json: { brands: [], categories: [], specifications: [] },
            });
        if (path === "/products") {
            if (state.offline) return route.abort("failed");
            if (state.htmlFallback)
                return route.fulfill({
                    status: 200,
                    contentType: "text/html",
                    body: "<!doctype html><html>SPA fallback</html>",
                });
            if (state.status !== 200)
                return route.fulfill({
                    status: state.status,
                    contentType: "text/html",
                    body: "<html>Server proxy failure</html>",
                });
            return route.fulfill({
                json: { content: [], page: 0, size: 12, totalElements: 0 },
            });
        }
        return route.fulfill({
            json: { content: [], page: 0, size: 12, totalElements: 0 },
        });
    });
    return state;
}

for (const width of [1280, 375]) {
    test(`500 shows a persistent banner above the navbar with no inline error at ${width}px and recovers after reload`, async ({
        page,
    }) => {
        const state = await mockBackend(page);
        state.status = 500;
        await page.setViewportSize({ width, height: 900 });
        await page.goto("/products");
        const banner = page.getByTestId("system-error-banner");
        await expect(banner).toContainText("Hệ thống đang gặp sự cố");
        await expect(page.getByTestId("error-toast")).toBeVisible();
        await expect(banner.getByRole("button")).toHaveCount(0);
        await expect(
            page
                .getByTestId("error-toast")
                .getByRole("button", { name: "Thử lại" }),
        ).toHaveCount(0);
        await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
        const bar = await banner.boundingBox();
        const navbar = await page.locator("header").boundingBox();
        expect(bar!.y).toBe(0);
        expect(navbar!.y).toBeGreaterThanOrEqual(bar!.height - 1);
        await page.keyboard.press("Escape");
        await expect(page.getByTestId("error-toast")).toHaveCount(0);
        await expect(banner).toBeVisible();
        state.status = 200;
        await page.reload();
        await expect(page.locator("header")).toBeVisible();
        await expect(banner).toHaveCount(0);
        await expect
            .poll(async () => (await page.locator("header").boundingBox())?.y)
            .toBe(0);
        expect(
            await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
            ),
        ).toBe(true);
    });
}

test("ordinary API failures use one toast, preserve drafts and never show an inline or system banner", async ({
    page,
}) => {
    const state = await mockBackend(page);
    state.rejectSave = 409;
    await page.goto("/account/profile");
    await page
        .getByLabel("Tên hiển thị", { exact: true })
        .fill("Tên đang chỉnh sửa");
    await page.getByRole("button", { name: "Lưu hồ sơ", exact: true }).click();
    const toast = page.getByTestId("error-toast");
    await expect(toast).toContainText("Không lưu được hồ sơ.");
    await expect(toast.getByRole("alert")).toHaveCount(1);
    await expect(toast.getByRole("button", { name: "Thử lại" })).toHaveCount(0);
    await expect(page.getByTestId("system-error-banner")).toHaveCount(0);
    await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
    await expect(page.getByLabel("Tên hiển thị", { exact: true })).toHaveValue(
        "Tên đang chỉnh sửa",
    );
    expect(state.writes).toBe(1);
});

test("mutation 503 also shows the top banner without exposing backend details inside the form", async ({
    page,
}) => {
    const state = await mockBackend(page);
    state.rejectSave = 503;
    await page.goto("/account/profile");
    await page.getByLabel("Tên hiển thị", { exact: true }).fill("Tên mới");
    await page.getByRole("button", { name: "Lưu hồ sơ", exact: true }).click();
    await expect(page.getByTestId("system-error-banner")).toBeVisible();
    await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
    await expect(page.getByTestId("error-toast")).toContainText(
        "Không lưu được hồ sơ.",
    );
    state.rejectSave = 0;
    await page.getByRole("button", { name: "Lưu hồ sơ", exact: true }).click();
    await expect(page.getByTestId("system-error-banner")).toHaveCount(0);
    await expect(
        page.getByText("Đã lưu hồ sơ.", { exact: true }),
    ).toBeVisible();
});

for (const failure of ["htmlFallback", "offline"] as const) {
    test(`${failure} is recognized as a system failure without rendering a parser/network error in page content`, async ({
        page,
    }) => {
        const state = await mockBackend(page);
        state[failure] = true;
        await page.goto("/products");
        await expect(page.getByTestId("system-error-banner")).toBeVisible();
        await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
        await expect(
            page.getByText(/Unexpected token|JSON\.parse|Failed to fetch/),
        ).toHaveCount(0);
    });
}
