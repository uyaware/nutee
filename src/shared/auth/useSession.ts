import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { services } from "../../services";
import type { Portal } from "../types/database";

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
      await client.cancelQueries({ queryKey: [portal] });
      client.removeQueries({ queryKey: [portal] });
      client.setQueryData(["session", "customer"], null);
      client.setQueryData(["session", "backoffice"], null);
      await client.invalidateQueries({ queryKey: ["session"] });
    },
  });
}
