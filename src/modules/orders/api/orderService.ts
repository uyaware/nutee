import type { ApiClient } from "@/shared/api/apiClient";
import type { ApiPage } from "@/modules/catalog/model/api";
import {
    createOrderSchema,
    type CreateOrder,
    type CustomerOrder,
    type Payment,
} from "@/modules/orders/model/api";

export function createOrderService(api: ApiClient) {
    return {
        config: () =>
            api.request<{ shippingFee: number; payosEnabled: boolean }>(
                "/checkout/config",
            ),
        create: (body: CreateOrder) =>
            api.request<CustomerOrder>("/orders", {
                method: "POST",
                body: createOrderSchema.parse(body),
            }),
        list: (page: number, status = "all", search = "") =>
            api.request<ApiPage<CustomerOrder>>(
                `/orders?page=${page}&size=20&status=${encodeURIComponent(status)}&q=${encodeURIComponent(search)}`,
            ),
        get: (id: number) => api.request<CustomerOrder>(`/orders/${id}`),
        payment: (id: number) => api.request<Payment>(`/orders/${id}/payment`),
        pay: (id: number) =>
            api.request<Payment>(`/orders/${id}/payment`, { method: "POST" }),
        refresh: (id: number) =>
            api.request<Payment>(`/orders/${id}/payment/refresh`, {
                method: "POST",
            }),
        cancel: (id: number) =>
            api.request<CustomerOrder>(`/orders/${id}/cancel`, {
                method: "POST",
            }),
    };
}
