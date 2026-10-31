import type { Database, Page, ProductSummary } from "@/shared/types/database";
export interface ProductVariant {
    id: number;
    sku: string;
    price: number;
    originalPrice?: number;
    promotionCode?: string | null;
    quantity: number;
    imageId: number | null;
    specifications: ProductSummary["specifications"];
}

export const catalogSorts = [
    "featured",
    "price-asc",
    "price-desc",
    "name",
    "newest",
] as const;
export type CatalogSort = (typeof catalogSorts)[number];
export interface CatalogFilters {
    q: string;
    category: string;
    brands: string[];
    minPrice?: number;
    maxPrice?: number;
    inStock: boolean;
    specifications: Record<string, string[]>;
    sort: CatalogSort;
    page: number;
    pageSize: number;
}
export interface CatalogFacets {
    brands: Database["brands"];
    categories: (Database["categories"][number] & { parentId?: string })[];
    specifications: { key: string; label: string; values: string[] }[];
}
export type CatalogPage = Page<ProductSummary> & { facets: CatalogFacets };
export interface ProductReview {
    id: string;
    authorName: string;
    rating: number;
    comment: string;
    createdAt: string;
}
export interface ProductDetail extends ProductSummary {
    defaultVariantId: number | null;
    description: string;
    variants: ProductVariant[];
    images: Database["productImages"];
    categories: Database["categories"];
    breadcrumb: Database["categories"];
    rating: { average: number; count: number };
}
