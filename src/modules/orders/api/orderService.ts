import type { ApiClient } from "@/shared/api/apiClient";
import type { ApiPage } from "@/modules/catalog/model/api";
import {
    createOrderSchema,
    type CreateOrder,
    type CustomerOrder,
    type Payment,
    type OrderHistoryEntry,
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
        history: (id: number) => api.request<OrderHistoryEntry[]>(`/orders/${id}/history`),
        managementList: (page: number, status: string, payment: string, sort: string, search: string) =>
            api.request<ApiPage<CustomerOrder>>(`/management/orders?${new URLSearchParams({ page: String(page), size: "20", status, payment, sort, q: search })}`),
        managementGet: (id: number) => api.request<CustomerOrder>(`/management/orders/${id}`),
        managementHistory: (id: number) => api.request<OrderHistoryEntry[]>(`/management/orders/${id}/history`),
        managementTransition: (id: number, status: string) => api.request<CustomerOrder>(`/management/orders/${id}/status`, { method: "POST", body: { status } }),
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
