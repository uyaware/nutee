import type { CatalogService } from "@/modules/catalog/model/contracts";
import { ServiceError } from "@/shared/lib/errors";

/** Trạng thái rỗng để giữ giao diện catalog khi backend chưa có API. */
export const emptyCatalog: CatalogService = {
  async categories() {
    return [];
  },
  async brands() {
    return [];
  },
  async featured() {
    return [];
  },
  async list(filters) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize: filters.pageSize,
      facets: { brands: [], categories: [], specifications: [] },
    };
  },
  async reviews(_id, page = 1) {
    return { items: [], total: 0, page, pageSize: 10 };
  },
  async detail() {
    throw new ServiceError("NOT_FOUND", "Không tìm thấy sản phẩm.");
  },
};
