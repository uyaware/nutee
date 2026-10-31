import type { ApiClient } from "@/shared/api/apiClient";
import { ServiceError } from "@/shared/lib/errors";
import { mapApiCartItem, type ApiCart } from "@/modules/cart/model/api";
import type { CartService } from "@/modules/cart/model/contracts";
import { MAX_CART_QUANTITY, type Cart } from "@/modules/cart/model/types";

function cartResponse(data: ApiCart): Cart {
    return {
        ...data,
        items: data.items.map(mapApiCartItem),
    };
}

function variantId(value: string) {
    const id = Number(value);
    if (!Number.isInteger(id) || id < 1 || id > 2147483647) {
        throw new ServiceError("VALIDATION", "Biến thể sản phẩm không hợp lệ.");
    }
    return id;
}

function quantity(value: number) {
    if (!Number.isInteger(value) || value < 1 || value > MAX_CART_QUANTITY) {
        throw new ServiceError(
            "VALIDATION",
            `Số lượng phải từ 1 đến ${MAX_CART_QUANTITY}.`,
        );
    }
    return value;
}

export function createCartService(api: ApiClient): CartService {
    return {
        get: async () => cartResponse(await api.request<ApiCart>("/cart")),
        add: async (id, amount) =>
            cartResponse(
                await api.request<ApiCart>("/cart/items", {
                    method: "POST",
                    body: {
                        variantId: variantId(id),
                        quantity: quantity(amount),
                    },
                }),
            ),
        setQuantity: async (id, amount) =>
            cartResponse(
                await api.request<ApiCart>(`/cart/items/${variantId(id)}`, {
                    method: "PUT",
                    body: { quantity: quantity(amount) },
                }),
            ),
        remove: async (id) =>
            cartResponse(
                await api.request<ApiCart>(`/cart/items/${variantId(id)}`, {
                    method: "DELETE",
                }),
            ),
        clear: async () =>
            cartResponse(
                await api.request<ApiCart>("/cart", { method: "DELETE" }),
            ),
    };
}
