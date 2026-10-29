import { z } from "zod";

export const MAX_CART_QUANTITY = 99;
export const guestCartSchema = z.object({
  id: z.string().min(1),
  revision: z.number().int().nonnegative(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1).max(MAX_CART_QUANTITY),
      }),
    )
    .refine(
      (items) => new Set(items.map((i) => i.productId)).size === items.length,
    ),
});
export type GuestCart = z.infer<typeof guestCartSchema>;
export interface CartItem {
  productId: string;
  name: string;
  imageUrl: string;
  price: number;
  quantity: number;
  stock: number;
  status: "available" | "hidden" | "out-of-stock" | "insufficient-stock";
  lineTotal: number;
}
export interface Cart {
  ownerId: string | null;
  revision: number;
  items: CartItem[];
  quantity: number;
  subtotal: number;
  hasIssues: boolean;
}
