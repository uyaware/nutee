import type { Cart } from "@/modules/cart/model/types";

export interface CartService {
  get(): Promise<Cart>;
  add(productId: string, quantity: number): Promise<void>;
  setQuantity(
    productId: string,
    quantity: number,
    expectedRevision: number,
    ownerId: string | null,
  ): Promise<void>;
  remove(
    productId: string,
    expectedRevision: number,
    ownerId: string | null,
  ): Promise<void>;
}
