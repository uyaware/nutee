import { describe, expect, it, vi } from "vitest";
import { createCatalogService } from "@/modules/catalog/api/catalogService";
import { createApiClient } from "@/shared/api/apiClient";
import { parseCatalogFilters } from "@/modules/catalog/model/filters";

const categories = [
  { id: 20, name: "Laptop", parentId: null },
  { id: 22, name: "Văn phòng", parentId: 20 },
];
const product = {
  id: 7,
  name: "Laptop 7",
  description: "Thông tin sản phẩm",
  avgRating: 0,
  soldCount: 0,
  reviewCount: 0,
  price: 200,
  maxPrice: 200,
  stock: 3,
  updatedAt: "2026-10-30T00:00:00Z",
  brands: [{ id: 4, name: "Brand" }],
  categories: [categories[1]],
  specifications: [
    { name: "kind", value: "laptop" },
    { name: "color", value: "Đen" },
    { name: "configuration", value: "16 GB RAM" },
    { name: "ram", value: "16 GB" },
  ],
  variants: [
    { id: 11, sku: "SKU-A", price: 150, quantity: 0 },
    { id: 12, sku: "SKU-B", price: 200, quantity: 3 },
  ],
  images: [{ id: 9, url: "/images/laptop.svg", primary: true }],
};

function setup() {
  const fetch = vi.fn<typeof globalThis.fetch>(async (url) => {
    const path = new URL(String(url), "http://localhost").pathname;
    const data = path.endsWith("/facets")
      ? {
          brands: product.brands,
          categories,
          specifications: [{ name: "ram", values: ["16 GB"] }],
        }
      : path.endsWith("/categories")
        ? categories
        : path.endsWith("/7")
          ? product
          : { content: [product], page: 1, size: 12, totalElements: 20 };
    return new Response(JSON.stringify(data));
  });
  return { fetch, catalog: createCatalogService(createApiClient({ fetch })) };
}

describe("catalog API contract", () => {
  it("sends filters to the backend and translates zero-based pages and numeric IDs for the existing UI", async () => {
    const { fetch, catalog } = setup();
    const page = await catalog.list(
      parseCatalogFilters(
        new URLSearchParams(
          "q=Laptop&category=22&brand=4&spec.ram=16+GB&page=2",
        ),
      ),
    );
    const request = new URL(
      String(
        fetch.mock.calls.find(([url]) => !String(url).endsWith("/facets"))![0],
      ),
      "http://localhost",
    );
    expect(request.searchParams.get("page")).toBe("1");
    expect(request.searchParams.get("brand")).toBe("4");
    expect(request.searchParams.get("spec.ram")).toBe("16 GB");
    expect(page).toMatchObject({
      page: 2,
      total: 20,
      items: [{ id: "7", price: 200, sku: "SKU-B", brandId: "4" }],
    });
    expect(page.items[0].specifications[0].key).toBe("configuration");
  });
  it("uses database variants, image IDs and parent categories in product details", async () => {
    const { catalog } = setup();
    const detail = await catalog.detail("7");
    expect(detail.variants).toEqual(product.variants);
    expect(detail.breadcrumb.map((item) => item.id)).toEqual(["20", "22"]);
    expect(detail.images[0]).toMatchObject({
      id: "9",
      productId: "7",
      url: "/images/laptop.svg",
    });
  });
  it("reports API failures instead of falling back to empty or local data", async () => {
    const { fetch, catalog } = setup();
    fetch.mockRejectedValue(new TypeError("offline"));
    await expect(catalog.featured()).rejects.toMatchObject({ code: "NETWORK" });
  });
});
