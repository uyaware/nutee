import { describe, expect, it } from "vitest";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { clearPrivateSession } from "@/modules/auth/model/sessionCache";

describe("private session cache", () => {
    it("notifies mounted session guards and clears private data for both portals", async () => {
        const client = new QueryClient();
        client.setQueryData(["session", "customer"], { id: "old-user" });
        client.setQueryData(["session", "backoffice"], { id: "old-admin" });
        client.setQueryData(["customer", "old-user", "profile"], {
            phone: "private",
        });
        client.setQueryData(["management", "old-admin", "users"], ["private"]);
        client.setQueryData(["catalog", "products"], ["public"]);
        const observer = new QueryObserver(client, {
            queryKey: ["session", "customer"],
            enabled: false,
        });
        const unsubscribe = observer.subscribe(() => {});
        try {
            await clearPrivateSession(client);
            expect(observer.getCurrentResult().data).toBeNull();
            expect(client.getQueryData(["session", "backoffice"])).toBeNull();
            expect(
                client.getQueryData(["customer", "old-user", "profile"]),
            ).toBeUndefined();
            expect(
                client.getQueryData(["management", "old-admin", "users"]),
            ).toBeUndefined();
            expect(client.getQueryData(["catalog", "products"])).toEqual([
                "public",
            ]);
        } finally {
            unsubscribe();
            client.clear();
        }
    });
});
