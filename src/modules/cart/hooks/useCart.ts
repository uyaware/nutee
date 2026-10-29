import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/modules/auth/hooks/useSession";
import { services } from "@/app/services";

export function useCart() {
  const session = useSession("customer");
  return useQuery({
    queryKey: ["customer", session.data?.id ?? "guest", "cart"],
    queryFn: services.cart.get,
    enabled: !session.isPending,
  });
}
