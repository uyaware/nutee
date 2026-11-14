import { test, expect, type Page } from "@playwright/test";
import { product } from "../fixtures/catalog";

async function openProduct(page: Page, data = product, search = "") {
    await page.addInitScript(() => {
        for (const storage of ["localStorage", "sessionStorage"]) {
            Object.defineProperty(window, storage, {
                get() {
                    throw new Error("Browser storage is disabled in this test");
                },
            });
        }
    });
    await page.route("**/api/v1/**", (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path.includes("/auth/")) {
            return route.fulfill(
                path.endsWith("/csrf")
                    ? {
                          json: {
                              token: "test-csrf",
                              headerName: "X-XSRF-TOKEN",
                          },
                      }
                    : { status: 401, json: {} },
            );
        }
        const response = path.endsWith("/categories")
            ? data.categories
            : path.endsWith("/brands")
              ? data.brands
              : path.endsWith("/products/7")
                ? data
                : path.endsWith("/facets")
                  ? {
                        brands: data.brands,
                        categories: data.categories,
                        specifications: [],
                    }
                  : { content: [], page: 0, size: 10, totalElements: 0 };
        return route.fulfill({ json: response });
    });
    await page.goto(`/products/7${search}`);
    await expect(
        page.getByRole("heading", { name: data.name, exact: true }),
    ).toBeVisible();
}

test("selects matching specifications with the variant price and image", async ({
    page,
}) => {
    await openProduct(page);
    await expect(page.getByText("Chọn thông số để xem phiên bản phù hợp.", { exact: false })).toHaveCount(0);
    await expect(page.getByRole("group", { name: "Màu sắc" }).getByRole("button", { name: "Đen" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("group", { name: "RAM" }).getByRole("button", { name: "16 GB" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("group", { name: "RAM" }).getByRole("button", { name: "8 GB" })).toHaveCSS("color", "rgb(227, 237, 255)");
    await expect(page.getByRole("group", { name: "RAM" }).getByRole("button", { name: "8 GB" })).toHaveCSS("border-radius", "0px");
    await expect(page.getByText("Giá từ", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Chọn thông số để xem tình trạng", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Tiếp tục xem sản phẩm" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Tăng số lượng" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Giảm số lượng" })).toHaveCSS("color", "rgb(130, 145, 167)");
    await expect(
        page
            .getByRole("group", { name: "Màu sắc" })
            .getByRole("button", { name: "Trắng" }),
    ).toBeDisabled();
    await expect(page.getByRole("group", { name: "Màu sắc" }).getByRole("button", { name: "Trắng" })).toHaveCSS("color", "rgb(132, 146, 167)");
    await expect(
        page.getByRole("rowheader", { name: "RAM", exact: true }).locator(".."),
    ).toContainText("16 GB");
    await expect(
        page.getByRole("img", { name: product.name, exact: true }),
    ).toHaveAttribute("src", "/images/laptop-overview.svg");
    await expect(
        page.getByText("Giá bán", { exact: true }).locator(".."),
    ).toContainText("12.000.000");
    await page.getByRole("button", { name: "Thêm vào giỏ", exact: true }).click();
    await expect(page).toHaveURL(/returnTo=.*variant%3D12/);
});

test("restores the requested variant from the URL", async ({ page }) => {
    await openProduct(page, product, "?variant=11");
    await expect(page.getByRole("group", { name: "Màu sắc" }).getByRole("button", { name: "Đen" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("group", { name: "RAM" }).getByRole("button", { name: "8 GB" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("Giá bán", { exact: true }).locator("..")).toContainText("10.000.000");
});

test("updates the selected variant image after resolving three specification groups", async ({ page }) => {
    const data = structuredClone(product);
    for (const variant of data.variants) {
        variant.specifications.push({ name: "storage", value: variant.id === 12 ? "512 GB" : "256 GB" });
    }
    await openProduct(page, data);
    const ram8 = page.getByRole("group", { name: "RAM" }).getByRole("button", { name: "8 GB" });
    const storage = page.getByRole("group", { name: "Lưu trữ" });
    await expect(ram8).toBeDisabled();
    await storage.getByRole("button", { name: "512 GB" }).click();
    await expect(ram8).toBeEnabled();
    await ram8.click();
    await storage.getByRole("button", { name: "256 GB" }).click();
    await expect(page.getByRole("img", { name: product.name, exact: true })).toHaveAttribute("src", /images\.unsplash\.com/);
});

test("changing variant updates price, image, specifications and resets quantity", async ({
    page,
}) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await openProduct(page);
    await page.getByRole("button", { name: "Xem ảnh sản phẩm 2" }).click();
    await expect(page.getByRole("img", { name: product.name, exact: true })).toHaveAttribute("src", /images\.unsplash\.com/);
    await page
        .getByRole("spinbutton", { name: "Số lượng", exact: true })
        .fill("2");
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth > window.innerWidth,
        ),
    ).toBe(false);
    await page
        .getByRole("group", { name: "RAM" })
        .getByRole("button", { name: "8 GB" })
        .click();
    await expect(
        page.getByRole("rowheader", { name: "RAM", exact: true }).locator(".."),
    ).toContainText("8 GB");
    await expect(
        page.getByRole("img", { name: product.name, exact: true }),
    ).toHaveAttribute("src", /images\.unsplash\.com/);
    await expect(
        page.getByText("Giá bán", { exact: true }).locator(".."),
    ).toContainText("10.000.000");
    await expect(
        page.getByRole("spinbutton", { name: "Số lượng", exact: true }),
    ).toHaveValue("1");
    await expect(
        page.getByRole("spinbutton", { name: "Số lượng", exact: true }),
    ).toHaveAttribute("max", "1");
    await page.getByRole("group", { name: "RAM" }).getByRole("button", { name: "16 GB" }).click();
    await expect(page.getByRole("img", { name: product.name, exact: true })).toHaveAttribute("src", "/images/laptop-overview.svg");
});

test("shows a sold-out combination and prevents adding it", async ({
    page,
}) => {
    const data = structuredClone(product);
    data.defaultVariantId = 11;
    data.variants[0].quantity = 0;
    await openProduct(page, data);
    await expect(page.getByRole("group", { name: "RAM" }).getByRole("button", { name: "8 GB" })).toHaveAttribute("aria-pressed", "true");
    await expect(
        page.getByRole("button", { name: "Thêm vào giỏ", exact: true }),
    ).toBeDisabled();
    await expect(
        page.getByRole("rowheader", { name: "RAM", exact: true }).locator(".."),
    ).toContainText("8 GB");
});
