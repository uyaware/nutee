import { test, expect, type Page } from "@playwright/test";
import type { ApiProduct } from "@/modules/catalog/model/api";

const product: ApiProduct = {
    id: 7,
    defaultVariantId: 12,
    name: "Laptop thử nghiệm",
    description: "Thông số lấy từ biến thể đang chọn.",
    avgRating: 0,
    soldCount: 0,
    reviewCount: 0,
    price: 10000000,
    maxPrice: 12000000,
    stock: 4,
    updatedAt: "2026-10-30T00:00:00Z",
    brands: [{ id: 1, name: "NUTEE Test" }],
    categories: [{ id: 20, name: "Laptop", parentId: null }],
    specifications: [
        { name: "ram", value: "8 GB" },
        { name: "ram", value: "16 GB" },
    ],
    variants: [
        {
            id: 11,
            sku: "SKU-8",
            price: 10000000,
            quantity: 1,
            imageId: 8,
            specifications: [
                { name: "configuration", value: "8 GB / 256 GB" },
                { name: "ram", value: "8 GB" },
            ],
        },
        {
            id: 12,
            sku: "SKU-16",
            price: 12000000,
            quantity: 3,
            imageId: 9,
            specifications: [
                { name: "configuration", value: "16 GB / 512 GB" },
                { name: "ram", value: "16 GB" },
            ],
        },
    ],
    images: [
        { id: 8, url: "/images/laptop.svg", primary: true },
        { id: 9, url: "/images/laptop-overview.svg", primary: false },
    ],
};

async function openProduct(page: Page, data = product) {
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
    await page.goto("/products/7");
    await expect(
        page.getByRole("heading", { name: data.name, exact: true }),
    ).toBeVisible();
}

test("selects the backend default variant with its own specifications and image", async ({
    page,
}) => {
    await openProduct(page);
    await expect(
        page.getByRole("combobox", { name: "Phiên bản" }),
    ).toContainText("SKU-16");
    await expect(
        page.getByRole("rowheader", { name: "RAM", exact: true }).locator(".."),
    ).toContainText("16 GB");
    await expect(
        page.getByRole("img", { name: product.name, exact: true }),
    ).toHaveAttribute("src", "/images/laptop-overview.svg");
    await expect(
        page.getByText("Giá bán", { exact: true }).locator(".."),
    ).toContainText("12.000.000");
});

test("changing variant updates price, image, specifications and resets quantity", async ({
    page,
}) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await openProduct(page);
    await page
        .getByRole("spinbutton", { name: "Số lượng", exact: true })
        .fill("2");
    await page.getByRole("combobox", { name: "Phiên bản" }).click();
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth > window.innerWidth,
        ),
    ).toBe(false);
    await page.getByRole("option", { name: /SKU-8/ }).click();
    await expect(
        page.getByRole("rowheader", { name: "RAM", exact: true }).locator(".."),
    ).toContainText("8 GB");
    await expect(
        page.getByRole("img", { name: product.name, exact: true }),
    ).toHaveAttribute("src", "/images/laptop.svg");
    await expect(
        page.getByText("Giá bán", { exact: true }).locator(".."),
    ).toContainText("10.000.000");
    await expect(
        page.getByRole("spinbutton", { name: "Số lượng", exact: true }),
    ).toHaveValue("1");
    await expect(
        page.getByRole("spinbutton", { name: "Số lượng", exact: true }),
    ).toHaveAttribute("max", "1");
});

test("keeps an explicitly configured sold-out default and prevents adding it", async ({
    page,
}) => {
    const data = structuredClone(product);
    data.defaultVariantId = 11;
    data.variants[0].quantity = 0;
    await openProduct(page, data);
    await expect(
        page.getByRole("combobox", { name: "Phiên bản" }),
    ).toContainText("SKU-8");
    await expect(
        page.getByRole("button", { name: "Thêm vào giỏ", exact: true }),
    ).toBeDisabled();
    await expect(
        page.getByRole("rowheader", { name: "RAM", exact: true }).locator(".."),
    ).toContainText("8 GB");
});
