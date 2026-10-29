import type { Page, ProductSummary } from "@/shared/types/database";
import type {
  CatalogFilters,
  CatalogPage,
  CatalogFacets,
  ProductDetail,
  ProductReview,
} from "@/modules/catalog/model/types";

export interface CatalogService {
  categories(): Promise<CatalogFacets["categories"]>;
  brands(): Promise<CatalogFacets["brands"]>;
  featured(): Promise<ProductSummary[]>;
  list(filters: CatalogFilters): Promise<CatalogPage>;
  detail(id: string): Promise<ProductDetail>;
  reviews(id: string, page?: number): Promise<Page<ProductReview>>;
}
