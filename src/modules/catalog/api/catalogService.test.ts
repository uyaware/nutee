import { beforeEach, describe, expect, it } from "vitest";
import { createLocalServices } from "@/app/createLocalServices";
import {
  LocalStorageRepository,
  DB_KEY,
} from "@/shared/storage/LocalStorageRepository";
import { MemoryStorage } from "@/shared/testing/MemoryStorage";
import {
  parseCatalogFilters,
  serializeCatalogFilters,
} from "@/modules/catalog/model/filters";
import type { Services } from "@/app/serviceContracts";

describe("public catalog", () => {
  let repository: LocalStorageRepository;
  let services: Services;
  let storage: MemoryStorage;
  beforeEach(() => {
    storage = new MemoryStorage();
    repository = new LocalStorageRepository(() => storage);
    services = createLocalServices(repository, repository);
  });
  const filters = (search = "") =>
    parseCatalogFilters(new URLSearchParams(search));
  it("paginates before returning DTOs and never exposes hidden products", async () => {
    const first = await services.catalog.list(filters());
    const last = await services.catalog.list(filters("page=999"));
    expect(first.total).toBe(29);
    expect(first.items).toHaveLength(12);
    expect(first.items[0].id).toBe("product-1");
    expect(last.page).toBe(3);
    expect(last.items).toHaveLength(5);
    expect(last.items.some((p) => p.id === "product-30")).toBe(false);
    await expect(services.catalog.detail("product-30")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(services.catalog.reviews("product-30")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(services.catalog.detail("missing")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
  it("combines category, brand, inclusive price, stock and specifications", async () => {
    const result = await services.catalog.list(
      filters(
        "category=laptop&brand=brand-1&minPrice=24990000&maxPrice=25490000&spec.ram=16GB",
      ),
    );
    expect(result.items.map((p) => p.id)).toEqual(["product-1", "product-11"]);
    expect(
      (await services.catalog.list(filters("category=electronics"))).total,
    ).toBe(29);
    expect(
      (await services.catalog.list(filters("category=does-not-exist"))).total,
    ).toBe(0);
    expect((await services.catalog.list(filters("inStock=true"))).total).toBe(
      28,
    );
    expect((await services.catalog.list(filters("spec.ram=32GB"))).total).toBe(
      0,
    );
  });
  it("searches names, SKU, brands and configurations without accents or case", async () => {
    const db = await repository.read();
    await repository.update(db.revision, (data) => {
      data.products[0].name = "Máy tính Đồng Hành";
    });
    expect(
      (await services.catalog.list(filters("q=may dong"))).items.map(
        (p) => p.id,
      ),
    ).toEqual(["product-1"]);
    expect((await services.catalog.list(filters("q=nut-0001"))).total).toBe(1);
    expect((await services.catalog.list(filters("q=apple 256GB"))).total).toBe(
      3,
    );
  });
  it("sorts prices and keeps stable, disjoint pages", async () => {
    const ascending = await services.catalog.list(
      filters("sort=price-asc&pageSize=48"),
    );
    const descending = await services.catalog.list(
      filters("sort=price-desc&pageSize=48"),
    );
    const prices = ascending.items.map((p) => p.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    expect(descending.items.map((p) => p.price)).toEqual([...prices].reverse());
    const first = await services.catalog.list(filters("sort=name"));
    const second = await services.catalog.list(filters("sort=name&page=2"));
    expect(
      second.items.some((p) => first.items.some((a) => a.id === p.id)),
    ).toBe(false);
  });
  it("returns category-scoped facets independent of selected brand/price", async () => {
    const result = await services.catalog.list(
      filters("category=laptop&brand=brand-1&maxPrice=1"),
    );
    expect(result.total).toBe(0);
    expect(result.facets.brands.map((b) => b.name)).toEqual([
      "Apple",
      "ASUS",
      "Lenovo",
    ]);
    expect(
      result.facets.specifications.find((s) => s.key === "storage")?.values,
    ).toEqual(["256GB", "512GB"]);
    expect(
      result.facets.specifications.some((s) => s.key === "connection"),
    ).toBe(false);
  });
  it("joins sorted gallery, canonical breadcrumb and public reviews without identity IDs", async () => {
    const product = await services.catalog.detail("product-5");
    expect(product.images.map((i) => i.position)).toEqual([0, 1]);
    expect(product.breadcrumb.map((c) => c.id)).toEqual([
      "electronics",
      "smartphone",
    ]);
    expect(product.rating).toEqual({ average: 5, count: 1 });
    const reviews = await services.catalog.reviews("product-5");
    expect(reviews.items[0].authorName).toBe("Minh Anh");
    expect(reviews.items[0]).not.toHaveProperty("userId");
    expect(reviews.items[0]).not.toHaveProperty("orderItemId");
    expect((await services.catalog.detail("product-1")).rating).toEqual({
      average: 0,
      count: 0,
    });
  });
  it("handles paged reviews and product visibility changes from the latest repository", async () => {
    const db = await repository.read();
    await repository.update(db.revision, (data) => {
      const original = data.reviews.find((r) => r.productId === "product-5")!;
      for (let n = 1; n <= 6; n++)
        data.reviews.push({
          ...original,
          id: `extra-${n}`,
          rating: 4,
          createdAt: new Date(Date.now() + n * 1000).toISOString(),
        });
    });
    const second = await services.catalog.reviews("product-5", 99);
    expect(second.total).toBe(7);
    expect(second.page).toBe(2);
    expect(second.items).toHaveLength(2);
    expect((await services.catalog.reviews("product-5", NaN)).page).toBe(1);
    await repository.update(1, (data) => {
      data.products.find((p) => p.id === "product-5")!.status = "hidden";
    });
    await expect(services.catalog.detail("product-5")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
  it("reads existing seed v1 unchanged with a single image and configuration facet", async () => {
    const db = await repository.read();
    db.seedVersion = 1;
    db.productImages = db.productImages.filter((i) => i.position === 0);
    db.products.forEach((p) => {
      p.specifications = p.specifications.slice(0, 1);
    });
    const raw = JSON.stringify(db);
    storage.setItem(DB_KEY, raw);
    expect((await services.catalog.detail("product-1")).images).toHaveLength(1);
    expect((await services.catalog.list(filters())).total).toBe(29);
    expect(storage.getItem(DB_KEY)).toBe(raw);
  });
});

describe("catalog URL normalization", () => {
  it("normalizes malformed pagination, price ranges, sorts and duplicate filters", () => {
    const filters = parseCatalogFilters(
      new URLSearchParams(
        "page=-2&pageSize=100&sort=invalid&minPrice=200&maxPrice=100&brand=b&brand=b&spec.ram=16GB&spec.ram=16GB",
      ),
    );
    expect(filters).toMatchObject({
      page: 1,
      pageSize: 12,
      sort: "featured",
      minPrice: 100,
      maxPrice: 200,
      brands: ["b"],
      specifications: { ram: ["16GB"] },
    });
    expect(
      parseCatalogFilters(
        new URLSearchParams("minPrice=Infinity&maxPrice=9007199254740992"),
      ).minPrice,
    ).toBeUndefined();
    expect(
      parseCatalogFilters(
        new URLSearchParams("minPrice=Infinity&maxPrice=9007199254740992"),
      ).maxPrice,
    ).toBeUndefined();
  });
  it("round-trips multi-value filters, Vietnamese text and reserved characters", () => {
    const input = parseCatalogFilters(
      new URLSearchParams(
        "q=Điện+thoại&brand=brand-2&brand=brand-1&spec.configuration=75%25+%C2%B7+Wireless&spec.ram=16GB&spec.ram=8GB&sort=price-desc&page=2",
      ),
    );
    expect(parseCatalogFilters(serializeCatalogFilters(input))).toEqual(input);
    expect(
      serializeCatalogFilters(
        parseCatalogFilters(new URLSearchParams()),
      ).toString(),
    ).toBe("");
  });
});
