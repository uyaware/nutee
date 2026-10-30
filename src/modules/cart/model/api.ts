import type { Cart, CartItem } from "@/modules/cart/model/types";
import type { ApiSpecification } from "@/modules/catalog/model/api";

export interface ApiCartItem extends Omit<
    CartItem,
    "variantId" | "productId" | "configuration" | "imageUrl"
> {
    variantId: number;
    productId: number;
    imageUrl: string | null;
    specifications: ApiSpecification[];
}

export interface ApiCart extends Omit<Cart, "items" | "ownerId"> {
    ownerId: string;
    items: ApiCartItem[];
}
