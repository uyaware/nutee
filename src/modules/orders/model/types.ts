import type { Database, Order } from "@/shared/types/database";

export type OrderItem = Database["orderItems"][number];
export type OrderDisplayItem = Pick<
  OrderItem,
  | "id"
  | "productId"
  | "name"
  | "imageUrl"
  | "configuration"
  | "quantity"
  | "price"
> &
  Partial<Pick<OrderItem, "warrantyCode" | "warrantyExpiresAt">>;
export type PrototypeOrder = Order & { items: OrderDisplayItem[] };
