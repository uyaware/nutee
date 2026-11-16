import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { services } from "@/app/services";
import type { Portal } from "@/modules/auth/model/types";
import { clearPrivateSession } from "@/modules/auth/model/sessionCache";

export function useSession(portal: Portal) {
    return useQuery({
        queryKey: ["session", portal],
        queryFn: () => services.auth.currentUser(portal),
        staleTime: 0,
        refetchInterval: 30000,
    });
}
export function useLogout(portal: Portal) {
    const client = useQueryClient();
    return useMutation({
        mutationFn: () => services.auth.logout(portal),
        onSuccess: async () => {
            await clearPrivateSession(client);
        },
    });
}
