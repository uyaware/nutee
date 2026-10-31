export const MAX_CART_QUANTITY = 99;
export interface CartItem {
    variantId: string;
    productId: string;
    sku: string;
    configuration: string;
    name: string;
    imageUrl: string;
    price: number | null;
    originalPrice?: number | null;
    promotionCode?: string | null;
    quantity: number;
    stock: number;
    status: "available" | "hidden" | "out-of-stock" | "insufficient-stock";
    lineTotal: number | null;
}
export interface Cart {
    ownerId: string | null;
    items: CartItem[];
    quantity: number;
    subtotal: number;
    hasIssues: boolean;
}

export type CartChange =
    | { type: "quantity"; variantId: string; quantity: number }
    | { type: "remove"; variantId: string }
    | { type: "clear" };
