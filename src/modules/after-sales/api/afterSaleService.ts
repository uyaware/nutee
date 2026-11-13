import type { ApiClient } from "@/shared/api/apiClient";
import type { ApiPage } from "@/modules/catalog/model/api";
import type { Portal } from "@/modules/auth/model/types";
import type {
    AfterSaleRequest,
    AfterSaleStatus,
    CreateAfterSaleRequest,
} from "@/modules/after-sales/model/types";

const base = (portal: Portal) =>
    portal === "customer" ? "/after-sales" : "/management/after-sales";
export function createAfterSaleService(api: ApiClient) {
    return {
        list: (
            portal: Portal,
            page: number,
            status: string,
            type: string,
            q: string,
        ) =>
            api.request<ApiPage<AfterSaleRequest>>(
                `${base(portal)}?${new URLSearchParams({ page: String(page), size: "5", status, type, q })}`,
            ),
        get: (portal: Portal, id: number) =>
            api.request<AfterSaleRequest>(`${base(portal)}/${id}`),
        create: (body: CreateAfterSaleRequest) =>
            api.request<AfterSaleRequest>("/after-sales", {
                method: "POST",
                body,
            }),
        transition: (
            id: number,
            expectedStatus: AfterSaleStatus,
            status: AfterSaleStatus,
        ) =>
            api.request<AfterSaleRequest>(
                `/management/after-sales/${id}/status`,
                { method: "POST", body: { expectedStatus, status } },
            ),
    };
}
