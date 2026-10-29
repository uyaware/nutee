import { catalogSorts } from "@/modules/catalog/model/types";
import type { CatalogFilters } from "@/modules/catalog/model/types";

const price = (value: string | null) => {
  if (value === null || !/^\d+$/.test(value)) return undefined;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : undefined;
};
const unique = (values: string[]) =>
  [...new Set(values.filter(Boolean))].sort();

// The same normalization is used at the URL and service boundaries.
export function parseCatalogFilters(params: URLSearchParams): CatalogFilters {
  const minPrice = price(params.get("minPrice"));
  const maxPrice = price(params.get("maxPrice"));
  const sort = catalogSorts.find((s) => s === params.get("sort")) ?? "featured";
  const specifications: Record<string, string[]> = Object.create(null);
  for (const key of new Set(params.keys())) {
    if (key.startsWith("spec.") && key.length > 5) {
      const values = unique(params.getAll(key));
      if (values.length) specifications[key.slice(5)] = values;
    }
  }
  return {
    q: (params.get("q") ?? "").trim().slice(0, 160),
    category: params.get("category") ?? "",
    brands: unique(params.getAll("brand")),
    minPrice:
      minPrice !== undefined && maxPrice !== undefined
        ? Math.min(minPrice, maxPrice)
        : minPrice,
    maxPrice:
      minPrice !== undefined && maxPrice !== undefined
        ? Math.max(minPrice, maxPrice)
        : maxPrice,
    inStock: params.get("inStock") === "true",
    specifications,
    sort,
    page: Math.max(1, Math.min(price(params.get("page")) ?? 1, 1000000)),
    pageSize:
      [12, 24, 48].find((s) => s === price(params.get("pageSize"))) ?? 12,
  };
}

export function serializeCatalogFilters(
  filters: CatalogFilters,
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  unique(filters.brands).forEach((id) => params.append("brand", id));
  if (filters.minPrice !== undefined)
    params.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice !== undefined)
    params.set("maxPrice", String(filters.maxPrice));
  if (filters.inStock) params.set("inStock", "true");
  for (const key of Object.keys(filters.specifications).sort()) {
    unique(filters.specifications[key]).forEach((value) =>
      params.append(`spec.${key}`, value),
    );
  }
  if (filters.sort !== "featured") params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));
  if (filters.pageSize !== 12) params.set("pageSize", String(filters.pageSize));
  return params;
}
