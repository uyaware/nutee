import { useQuery } from "@tanstack/react-query";
import { services } from "@/app/services";
import { useSession } from "@/modules/auth/hooks/useSession";

export function useProfile() {
    const session = useSession("customer");
    return useQuery({
        queryKey: ["customer", session.data?.id, "profile"],
        queryFn: services.profile.get,
        enabled: !!session.data,
        retry: false,
    });
}
