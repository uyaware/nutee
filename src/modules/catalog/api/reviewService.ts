import type { ApiClient } from "@/shared/api/apiClient";
import type { OwnReview, SaveReview } from "@/modules/catalog/model/review";

export function createReviewService(api: ApiClient) {
    const path = (orderId: number, itemId: number) =>
        `/orders/${orderId}/items/${itemId}/review`;
    return {
        get: (orderId: number, itemId: number) =>
            api.request<OwnReview>(path(orderId, itemId)),
        save: (orderId: number, itemId: number, body: SaveReview) =>
            api.request<OwnReview>(path(orderId, itemId), {
                method: "PUT",
                body,
            }),
    };
}
