import type { ApiClient } from "@/shared/api/apiClient";
import type { CatalogService } from "@/modules/catalog/model/contracts";
import type {
  CatalogFilters,
  ProductDetail,
  ProductReview,
  ProductVariant,
} from "@/modules/catalog/model/types";
import type { ProductSummary } from "@/shared/types/database";

interface ApiCategory {
  id: number;
  name: string;
  parentId: number | null;
}
interface ApiBrand {
  id: number;
  name: string;
}
interface ApiSpecification {
  name: string;
  value: string;
}
interface ApiProduct {
  id: number;
  name: string;
  description: string | null;
  avgRating: number;
  soldCount: number;
  reviewCount: number;
  price: number;
  maxPrice: number;
  stock: number;
  updatedAt: string;
  brands: ApiBrand[];
  categories: ApiCategory[];
  specifications: ApiSpecification[];
  variants: ProductVariant[];
  images: { id: number; url: string; primary: boolean }[];
}
interface ApiPage<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
}
interface ApiFacets {
  brands: ApiBrand[];
  categories: ApiCategory[];
  specifications: { name: string; values: string[] }[];
}

const specificationLabels: Record<string, string> = {
  configuration: "Cấu hình",
  ram: "RAM",
  storage: "Lưu trữ",
  screen: "Màn hình",
  color: "Màu sắc",
  connection: "Kết nối",
  switch: "Switch",
  cpu: "Bộ xử lý",
};
const category = (item: ApiCategory) => ({
  id: String(item.id),
  name: item.name,
  parentId: item.parentId === null ? undefined : String(item.parentId),
});
const brand = (item: ApiBrand) => ({ id: String(item.id), name: item.name });

/** Chuyển DTO API sang dữ liệu hiển thị hiện có, không lưu hoặc lọc sản phẩm trên trình duyệt. */
function summary(item: ApiProduct): ProductSummary {
  const kind = item.specifications.find((spec) => spec.name === "kind")?.value;
  return {
    id: String(item.id),
    name: item.name,
    brandId: String(item.brands[0]?.id ?? ""),
    brandName: item.brands.map((value) => value.name).join(", "),
    sku:
      item.variants.find((variant) => variant.quantity > 0)?.sku ??
      item.variants[0]?.sku ??
      "",
    price: item.price,
    stock: item.stock,
    status: "published",
    kind:
      kind === "laptop" || kind === "smartphone" || kind === "keyboard"
        ? kind
        : "other",
    specifications: item.specifications
      .filter((spec) => spec.name !== "kind")
      .sort(
        (left, right) =>
          Number(right.name === "configuration") -
          Number(left.name === "configuration"),
      )
      .map((spec) => ({
        key: spec.name,
        label: specificationLabels[spec.name] ?? spec.name,
        value: spec.value,
      })),
    updatedAt: item.updatedAt,
    imageUrl:
      (item.images.find((image) => image.primary) ?? item.images[0])?.url ?? "",
  };
}

/** Giữ UI và URL filter hiện có, gửi toàn bộ tìm kiếm/lọc/phân trang cho backend. */
export function createCatalogService(api: ApiClient): CatalogService {
  const get = <T>(path: string) =>
    api.request<T>(path, { authenticated: false });
  return {
    categories: async () =>
      (await get<ApiCategory[]>("/categories")).map(category),
    brands: async () => (await get<ApiBrand[]>("/brands")).map(brand),
    featured: async () =>
      (
        await get<ApiPage<ApiProduct>>("/products?size=5&sort=featured")
      ).content.map(summary),
    async list(filters: CatalogFilters) {
      const params = new URLSearchParams({
        page: String(filters.page - 1),
        size: String(filters.pageSize),
        sort: filters.sort,
      });
      if (filters.q) params.set("q", filters.q);
      if (filters.category) params.set("category", filters.category);
      filters.brands.forEach((id) => params.append("brand", id));
      if (filters.minPrice !== undefined)
        params.set("minPrice", String(filters.minPrice));
      if (filters.maxPrice !== undefined)
        params.set("maxPrice", String(filters.maxPrice));
      if (filters.inStock) params.set("inStock", "true");
      Object.entries(filters.specifications).forEach(([name, values]) =>
        values.forEach((value) => params.append(`spec.${name}`, value)),
      );
      const [page, facets] = await Promise.all([
        get<ApiPage<ApiProduct>>(`/products?${params}`),
        get<ApiFacets>("/products/facets"),
      ]);
      return {
        items: page.content.map(summary),
        total: page.totalElements,
        page: page.page + 1,
        pageSize: page.size,
        facets: {
          brands: facets.brands.map(brand),
          categories: facets.categories.map(category),
          specifications: facets.specifications.map((spec) => ({
            key: spec.name,
            label: specificationLabels[spec.name] ?? spec.name,
            values: spec.values,
          })),
        },
      };
    },
    async detail(id): Promise<ProductDetail> {
      const [item, categories] = await Promise.all([
        get<ApiProduct>(`/products/${encodeURIComponent(id)}`),
        get<ApiCategory[]>("/categories"),
      ]);
      const trail: ApiCategory[] = [];
      const visited = new Set<number>();
      let current: ApiCategory | undefined = item.categories[0];
      while (current && !visited.has(current.id)) {
        visited.add(current.id);
        trail.unshift(current);
        const parentId: number | null = current.parentId;
        current = categories.find((value) => value.id === parentId);
      }
      return {
        ...summary(item),
        description: item.description ?? "",
        variants: item.variants,
        images: item.images.map((image, index) => ({
          id: String(image.id),
          productId: String(item.id),
          url: image.url,
          alt: item.name,
          position: index,
        })),
        categories: item.categories.map(category),
        breadcrumb: trail.map(category),
        rating: { average: item.avgRating, count: item.reviewCount },
      };
    },
    async reviews(id, page = 1) {
      const result = await get<
        ApiPage<Omit<ProductReview, "id"> & { id: number }>
      >(`/products/${encodeURIComponent(id)}/reviews?page=${page - 1}&size=10`);
      return {
        items: result.content.map((review) => ({
          ...review,
          id: String(review.id),
        })),
        total: result.totalElements,
        page: result.page + 1,
        pageSize: result.size,
      };
    },
  };
}
