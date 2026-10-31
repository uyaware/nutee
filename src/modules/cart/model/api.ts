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

export function mapApiCartItem({
    specifications,
    ...item
}: ApiCartItem): CartItem {
    return {
        ...item,
        variantId: String(item.variantId),
        productId: String(item.productId),
        imageUrl: item.imageUrl ?? "",
        configuration:
            specifications.find((spec) => spec.name === "configuration")
                ?.value ??
            specifications
                .filter((spec) => spec.name !== "kind")
                .map((spec) => spec.value)
                .join(" / "),
    };
}
