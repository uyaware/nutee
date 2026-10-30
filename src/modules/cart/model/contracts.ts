import type { Cart } from "@/modules/cart/model/types";

export interface CartService {
    get(): Promise<Cart>;
    add(variantId: string, quantity: number): Promise<Cart>;
    setQuantity(variantId: string, quantity: number): Promise<Cart>;
    remove(variantId: string): Promise<Cart>;
    clear(): Promise<Cart>;
}
