import { useQuery } from "@tanstack/react-query";
import { services } from "@/app/services";
import { useSession } from "@/modules/auth/hooks/useSession";

export function useOrder(id: number) {
    const session = useSession("customer");
    return useQuery({
        queryKey: ["customer", session.data?.id, "orders", id],
        queryFn: () => services.orders.get(id),
        enabled: !!session.data && Number.isSafeInteger(id) && id > 0,
        retry: false,
        refetchInterval: (query) =>
            query.state.data?.paymentMethod === "qr" &&
            !["paid", "cancelled"].includes(query.state.data.paymentStatus)
                ? 5000
                : false,
    });
}
