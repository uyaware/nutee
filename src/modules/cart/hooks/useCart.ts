import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/modules/auth/hooks/useSession";
import { services } from "@/app/services";
import type { Cart } from "@/modules/cart/model/types";

const guestCart: Cart = {
    ownerId: null,
    items: [],
    quantity: 0,
    subtotal: 0,
    hasIssues: false,
};

export function useCart() {
    const session = useSession("customer");
    const cart = useQuery({
        queryKey: ["customer", session.data?.id ?? "guest", "cart"],
        queryFn: () =>
            session.data ? services.cart.get() : Promise.resolve(guestCart),
        enabled: !session.isPending && !session.isError,
        retry: false,
    });
    return {
        ...cart,
        isGuest: session.isSuccess && !session.data,
        isPending: session.isPending || (!session.isError && cart.isPending),
        isError: session.isError || cart.isError,
        error: session.error ?? cart.error,
        refetch: () => (session.isError ? session.refetch() : cart.refetch()),
    };
}
