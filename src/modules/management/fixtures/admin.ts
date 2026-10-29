import type { Database, Product, User } from "@/shared/types/database";

export const ADMIN_DEMO_NOW = "2026-10-03T03:00:00.000Z";
export type AdminProduct = Product & {
  images: { url: string; alt: string }[];
  categoryIds: string[];
};
export type AdminBrand = Database["brands"][number] & { isActive: boolean };
export type AdminCategory = Database["categories"][number] & {
  parentId: string;
  isActive: boolean;
};
export type AdminPromotion = Database["promotions"][number] & {
  isActive: boolean;
  productIds: string[];
  userIds: string[];
};

export interface AdminPrototype {
  products: AdminProduct[];
  brands: AdminBrand[];
  categories: AdminCategory[];
  promotions: AdminPromotion[];
  users: User[];
}

/** Giữ cấu trúc giao diện quản trị với dữ liệu rỗng, không seed hoặc lưu trữ. */
export function createAdminPrototype(): AdminPrototype {
  return {
    products: [],
    brands: [],
    categories: [],
    promotions: [],
    users: [],
  };
}

export const productKindLabels = {
  other: "Khác",
  laptop: "Laptop",
  smartphone: "Điện thoại",
  keyboard: "Bàn phím",
};
export const promotionScopeLabels = {
  all: "Toàn bộ đơn hàng",
  product: "Sản phẩm được chọn",
  user: "Khách hàng được chọn",
};
export function promotionStatus(promotion: AdminPromotion) {
  if (!promotion.isActive) return "paused";
  if (promotion.startsAt > ADMIN_DEMO_NOW) return "scheduled";
  if (promotion.endsAt < ADMIN_DEMO_NOW) return "expired";
  return "active";
}
export const promotionStatusLabels = {
  active: "Đang áp dụng",
  scheduled: "Sắp diễn ra",
  expired: "Hết hạn",
  paused: "Tạm dừng",
};
