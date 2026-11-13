import { useQuery } from "@tanstack/react-query";
import { services } from "@/app/services";
import { useSession } from "@/modules/auth/hooks/useSession";

export function useDashboard(days: number) {
    const session = useSession("backoffice");
    return useQuery({
        queryKey: ["management", session.data?.id, "dashboard", days],
        queryFn: () => services.dashboard.summary(days),
        enabled: session.data?.role === "admin",
        retry: false,
        refetchInterval: 60000,
    });
}
export function useOperationsDashboard() {
    const session = useSession("backoffice");
    return useQuery({
        queryKey: ["management", session.data?.id, "dashboard", "operations"],
        queryFn: () => services.dashboard.operations(),
        enabled: session.data?.role === "staff",
        retry: false,
        refetchInterval: 60000,
    });
}
