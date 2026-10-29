import type { DataRepository } from "@/shared/storage/contracts";
import type {
  Database,
  Product,
  ProductSummary,
} from "@/shared/types/database";
import type { CatalogService } from "@/modules/catalog/model/contracts";
import {
  parseCatalogFilters,
  serializeCatalogFilters,
} from "@/modules/catalog/model/filters";
import { ServiceError } from "@/shared/lib/errors";

export const productSummary = (
  db: Database,
  product: Product,
): ProductSummary => ({
  ...product,
  brandName: db.brands.find((b) => b.id === product.brandId)?.name ?? "",
  imageUrl:
    db.productImages
      .filter((i) => i.productId === product.id)
      .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))[0]
      ?.url ?? "",
});
const searchable = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();
function publicProduct(db: Database, id: string) {
  const product = db.products.find(
    (p) => p.id === id && p.status === "published",
  );
  if (!product)
    throw new ServiceError(
      "NOT_FOUND",
      "Sản phẩm không tồn tại hoặc đã ngừng hiển thị.",
    );
  return product;
}
function categoryPath(db: Database, id: string) {
  const path: Database["categories"] = [];
  let current: string | undefined = id;
  while (current) {
    const category = db.categories.find((c) => c.id === current);
    if (!category || path.some((c) => c.id === current)) break;
    path.unshift(category);
    current = db.categoryRelations.find((r) => r.childId === current)?.parentId;
  }
  return path;
}

export function createCatalogService(
  repository: DataRepository,
): CatalogService {
  return {
    async brands() {
      const db = await repository.read();
      return [...db.brands].sort((a, b) => a.name.localeCompare(b.name, "vi"));
    },
    async categories() {
      const db = await repository.read();
      return db.categories.map((category) => ({
        ...category,
        parentId: db.categoryRelations.find(
          (relation) => relation.childId === category.id,
        )?.parentId,
      }));
    },
    async featured() {
      const db = await repository.read();
      return db.products
        .filter((p) => p.status === "published")
        .slice(0, 8)
        .map((p) => productSummary(db, p));
    },
    async list(input) {
      const filters = parseCatalogFilters(serializeCatalogFilters(input));
      const db = await repository.read();
      const published = db.products.filter((p) => p.status === "published");
      const inCategory = (p: Product) =>
        !filters.category ||
        db.productCategories.some(
          (r) =>
            r.productId === p.id &&
            categoryPath(db, r.categoryId).some(
              (c) => c.id === filters.category,
            ),
        );
      // Facets use the category scope, independent of other selected filters.
      const scope = published.filter(inCategory);
      const specifications = new Map<
        string,
        { key: string; label: string; values: string[] }
      >();
      scope.forEach((p) =>
        p.specifications.forEach((s) => {
          const facet = specifications.get(s.key) ?? {
            key: s.key,
            label: s.label,
            values: [],
          };
          if (!facet.values.includes(s.value)) facet.values.push(s.value);
          specifications.set(s.key, facet);
        }),
      );
      const words = searchable(filters.q).split(/\s+/).filter(Boolean);
      const matches = scope.filter((p) => {
        const text = searchable(
          [
            p.name,
            p.sku,
            db.brands.find((b) => b.id === p.brandId)?.name ?? "",
            ...p.specifications.map((s) => s.value),
          ].join(" "),
        );
        return (
          words.every((word) => text.includes(word)) &&
          (!filters.brands.length || filters.brands.includes(p.brandId)) &&
          (filters.minPrice === undefined || p.price >= filters.minPrice) &&
          (filters.maxPrice === undefined || p.price <= filters.maxPrice) &&
          (!filters.inStock || p.stock > 0) &&
          Object.entries(filters.specifications).every(
            ([key, values]) =>
              !values.length ||
              p.specifications.some(
                (s) => s.key === key && values.includes(s.value),
              ),
          )
        );
      });
      matches.sort((a, b) => {
        const tie = a.id.localeCompare(b.id, "vi", { numeric: true });
        switch (filters.sort) {
          case "price-asc":
            return a.price - b.price || tie;
          case "price-desc":
            return b.price - a.price || tie;
          case "name":
            return a.name.localeCompare(b.name, "vi") || tie;
          case "newest":
            return b.updatedAt.localeCompare(a.updatedAt) || tie;
          default:
            return tie;
        }
      });
      const page = Math.min(
        filters.page,
        Math.max(1, Math.ceil(matches.length / filters.pageSize)),
      );
      return {
        items: matches
          .slice((page - 1) * filters.pageSize, page * filters.pageSize)
          .map((p) => productSummary(db, p)),
        total: matches.length,
        page,
        pageSize: filters.pageSize,
        facets: {
          brands: db.brands.filter((b) =>
            scope.some((p) => p.brandId === b.id),
          ),
          categories: db.categories.map((c) => ({
            ...c,
            parentId: db.categoryRelations.find((r) => r.childId === c.id)
              ?.parentId,
          })),
          specifications: [...specifications.values()].map((s) => ({
            ...s,
            values: s.values.sort((a, b) =>
              a.localeCompare(b, "vi", { numeric: true }),
            ),
          })),
        },
      };
    },
    async detail(id) {
      const db = await repository.read();
      const product = publicProduct(db, id);
      const categories = db.categories.filter((c) =>
        db.productCategories.some(
          (r) => r.productId === id && r.categoryId === c.id,
        ),
      );
      const reviews = db.reviews.filter((r) => r.productId === id);
      return {
        ...productSummary(db, product),
        images: db.productImages
          .filter((i) => i.productId === id)
          .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id)),
        categories,
        breadcrumb: categories[0] ? categoryPath(db, categories[0].id) : [],
        rating: {
          count: reviews.length,
          average: reviews.length
            ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length
            : 0,
        },
      };
    },
    async reviews(id, requestedPage = 1) {
      const db = await repository.read();
      publicProduct(db, id);
      const reviews = db.reviews
        .filter((r) => r.productId === id)
        .sort(
          (a, b) =>
            b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id),
        );
      const pageSize = 5;
      const page = Math.min(
        Math.max(1, Number.isSafeInteger(requestedPage) ? requestedPage : 1),
        Math.max(1, Math.ceil(reviews.length / pageSize)),
      );
      return {
        items: reviews
          .slice((page - 1) * pageSize, page * pageSize)
          .map((r) => ({
            id: r.id,
            authorName:
              db.users.find((u) => u.id === r.userId)?.name ?? "Khách hàng",
            rating: r.rating,
            comment: r.comment,
            createdAt: r.createdAt,
          })),
        total: reviews.length,
        page,
        pageSize,
      };
    },
  };
}
