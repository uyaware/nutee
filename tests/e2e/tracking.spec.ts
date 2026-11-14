import { test, expect } from "@playwright/test";
import { product } from "../fixtures/catalog";
import { captureTracking } from "../fixtures/tracking";

test("tracks successful search, visible cards, clicks and detail once per visit", async ({ page }) => {
    const events = await captureTracking(page);
    await page.route("**/api/v1/**", (route) => {
        const url = new URL(route.request().url());
        const path = url.pathname;
        if (path.includes("/auth/")) return route.fulfill({ status: 401, json: {} });
        if (path.endsWith("/products") && url.searchParams.get("q") === "failure") {
            return route.fulfill({ status: 500, json: { message: "Test failure" } });
        }
        const json = path.endsWith("/categories") ? product.categories
            : path.endsWith("/brands") ? product.brands
            : path.endsWith("/facets") ? { brands: product.brands, categories: product.categories, specifications: [] }
            : path.endsWith("/products/7") ? product
            : { content: path.endsWith("/products") ? [product] : [], page: 0, size: 12, totalElements: path.endsWith("/products") ? 1 : 0 };
        return route.fulfill({ json });
    });
    await page.goto("/products?q=laptop");
    const card = page.getByRole("link").filter({ has: page.getByRole("heading", { name: product.name }) });
    await card.scrollIntoViewIfNeeded();
    await expect.poll(() => events.filter((event) => event.name === "product_impression").length).toBe(1);
    expect(events.filter((event) => event.name === "search")).toEqual([
        { name: "search", properties: { query: "laptop", result_count: 1, page: "search" } },
    ]);
    await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
    await expect.poll(() => events.filter((event) => event.name === "search").length).toBe(2);
    await card.scrollIntoViewIfNeeded();
    await card.click();
    await expect.poll(() => events.filter((event) => event.name === "product_view").length).toBe(1);
    const impression = events.find((event) => event.name === "product_impression")!;
    expect(impression.properties).toMatchObject({ product_id: "7", position: 1, page: "catalog" });
    expect(events.find((event) => event.name === "product_click")?.properties).toEqual(impression.properties);
    expect(events.filter((event) => event.name === "product_impression")).toHaveLength(1);
    await page.getByRole("combobox", { name: "Phiên bản" }).click();
    await page.getByRole("option", { name: /SKU-8/ }).click();
    expect(events.filter((event) => event.name === "product_view")).toHaveLength(1);
    await page.goto("/products?q=failure");
    await expect(page.getByRole("button", { name: /Thử lại/ }).first()).toBeVisible();
    expect(events.filter((event) => event.name === "search")).toHaveLength(2);
});
