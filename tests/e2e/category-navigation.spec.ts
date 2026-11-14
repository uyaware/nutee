import { test, expect } from "@playwright/test";

test("groups categories under their parents and requests category-specific facets", async ({ page }) => {
    const categories = [
        { id: 1, name: "Laptop", parentId: null },
        { id: 2, name: "Bàn phím", parentId: null },
        { id: 3, name: "Laptop gaming", parentId: 1 },
        { id: 4, name: "Bàn phím cơ", parentId: 2 },
    ];
    const facetRequests: string[] = [];
    await page.route("**/api/v1/**", (route) => {
        const url = new URL(route.request().url());
        if (url.pathname.includes("/auth/")) return route.fulfill({ status: 401, json: {} });
        if (url.pathname.endsWith("/categories")) return route.fulfill({ json: categories });
        if (url.pathname.endsWith("/brands")) return route.fulfill({ json: [] });
        if (url.pathname.endsWith("/facets")) {
            const selected = url.searchParams.get("category") ?? "";
            facetRequests.push(selected);
            return route.fulfill({ json: { categories, brands: selected === "1" ? [{ id: 1, name: "LaptopBrand" }] : [{ id: 2, name: "KeyBrand" }], specifications: [] } });
        }
        return route.fulfill({ json: { content: [], page: 0, size: 12, totalElements: 0 } });
    });
    await page.goto("/products?category=1");
    await expect(page.getByRole("search", { name: "Tìm trong danh mục" })).toHaveCount(0);
    await expect(page.getByText("Tìm sản phẩm phù hợp với nhu cầu của bạn.")).toHaveCount(0);
    await expect(page.getByText("LaptopBrand", { exact: true })).toBeVisible();
    await expect(page.getByText("KeyBrand", { exact: true })).toHaveCount(0);
    expect(facetRequests).toContain("1");
    await expect(page.getByRole("combobox", { name: "Sắp xếp" })).toContainText("Bán nhiều nhất");
    await page.getByRole("checkbox", { name: "Đang giảm giá" }).click();
    await expect(page).toHaveURL(/discounted=true/);
    await expect(page.getByRole("checkbox", { name: "Đang giảm giá" })).toBeChecked();

    await page.getByRole("button", { name: "Danh mục", exact: true }).click();
    const menu = page.getByRole("menu");
    await menu.getByRole("menuitem", { name: "Laptop", exact: true }).hover();
    await expect(menu.getByRole("menuitem", { name: "Laptop gaming" })).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: "Bàn phím cơ" })).toHaveCount(0);
    await menu.getByRole("menuitem", { name: "Bàn phím", exact: true }).hover();
    await expect(menu.getByRole("menuitem", { name: "Bàn phím cơ" })).toBeVisible();
    await menu.getByRole("menuitem", { name: "Bàn phím cơ" }).click();
    await expect(page).toHaveURL(/category=4/);

    await page.getByRole("combobox", { name: "Danh mục" }).click();
    const options = await page.getByRole("option").allTextContents();
    expect(options.slice(1, 5)).toEqual(["Laptop", "— Laptop gaming", "Bàn phím", "— Bàn phím cơ"]);
});
