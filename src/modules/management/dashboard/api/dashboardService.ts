import type { ApiClient } from "@/shared/api/apiClient";
import type {
    Dashboard,
    OperationsDashboard,
} from "@/modules/management/dashboard/model/types";

export function createDashboardService(api: ApiClient) {
    return {
        summary: (days: number) =>
            api.request<Dashboard>(`/management/dashboard?days=${days}`),
        operations: () =>
            api.request<OperationsDashboard>(
                "/management/dashboard/operations",
            ),
    };
}
