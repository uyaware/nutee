import { useQuery } from "@tanstack/react-query";
import { services } from "@/app/services";
import { useSession } from "@/modules/auth/hooks/useSession";

export function useAfterSaleCount() {
    const session = useSession("backoffice");
    return useQuery({
        queryKey: [
            "backoffice",
            session.data?.id,
            "after-sales",
            "pending-count",
        ],
        enabled: !!session.data,
        retry: false,
        queryFn: async () => {
            const pages = await Promise.all([
                services.afterSales.list("backoffice", 0, "pending", "all", ""),
                services.afterSales.list(
                    "backoffice",
                    0,
                    "reviewing",
                    "all",
                    "",
                ),
            ]);
            return pages.reduce((total, page) => total + page.totalElements, 0);
        },
    });
}
