import { createSeed } from "./seed";
import { prototypeOrders } from "./checkout";
import type { Database, Product } from "../shared/types/database";

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

// Each workspace gets a fresh fixture. M6 changes live only in React state.
export function createAdminPrototype() {
  const seed = createSeed(new Date(ADMIN_DEMO_NOW));
  return {
    products: seed.products.map(
      (product): AdminProduct => ({
        ...product,
        images: seed.productImages
          .filter((image) => image.productId === product.id)
          .sort((a, b) => a.position - b.position)
          .map(({ url, alt }) => ({ url, alt })),
        categoryIds: seed.productCategories
          .filter((relation) => relation.productId === product.id)
          .map((relation) => relation.categoryId),
      }),
    ),
    brands: seed.brands.map(
      (brand): AdminBrand => ({ ...brand, isActive: true }),
    ),
    categories: seed.categories.map(
      (category): AdminCategory => ({
        ...category,
        parentId:
          seed.categoryRelations.find((r) => r.childId === category.id)
            ?.parentId ?? "",
        isActive: true,
      }),
    ),
    promotions: seed.promotions.map(
      (promotion): AdminPromotion => ({
        ...promotion,
        isActive: true,
        productIds: seed.promotionProducts
          .filter((r) => r.promotionId === promotion.id)
          .map((r) => r.productId),
        userIds: seed.promotionUsers
          .filter((r) => r.promotionId === promotion.id)
          .map((r) => r.userId),
      }),
    ),
    users: [
      ...seed.users,
      {
        id: "customer-locked",
        email: "locked@nutee.demo",
        name: "Thu Hà",
        role: "customer" as const,
        isActive: false,
      },
    ],
  };
}

export type AdminPrototype = ReturnType<typeof createAdminPrototype>;
export const productKindLabels = {
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

// Payment rows and dashboard use the same read-only order fixtures as M4/M5.
export const prototypePayments = prototypeOrders.map((order, index) => ({
  id: `payment-${index + 1}`,
  orderId: order.id,
  amount: order.total,
  status: order.paymentStatus,
  reference: `NT-DEMO-${String(index + 1).padStart(5, "0")}`,
  createdAt: order.createdAt,
  method: order.paymentMethod,
  recipient: order.address.recipient,
}));
