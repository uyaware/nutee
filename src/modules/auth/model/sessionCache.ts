import type { QueryClient } from "@tanstack/react-query";

/** Hủy request đang chạy trước khi loại dữ liệu riêng của cả hai khu vực. */
export async function clearPrivateSession(client: QueryClient) {
    const filter = {
        predicate: (query: { queryKey: readonly unknown[] }) =>
            [
                "session",
                "customer",
                "backoffice",
                "management",
                "checkout-config",
                "verification",
            ].includes(String(query.queryKey[0])),
    };
    await client.cancelQueries(filter);
    client.setQueriesData({ queryKey: ["session"] }, null);
    client.removeQueries({
        predicate: (query) =>
            query.queryKey[0] !== "session" && filter.predicate(query),
    });
    client.getMutationCache().clear();
    client.setQueryData(["session", "customer"], null);
    client.setQueryData(["session", "backoffice"], null);
}
