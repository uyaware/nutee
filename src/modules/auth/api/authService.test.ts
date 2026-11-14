import { describe, expect, it, vi } from "vitest";
import { createApiAuth } from "@/modules/auth/api/authService";
import { createApiClient } from "@/shared/api/apiClient";

const user = {
    id: "remote-id",
    username: "tester",
    email: "test@example.com",
    fullName: "Tester",
    role: "CUSTOMER",
    emailVerified: true,
    imageUrl: null,
};
const session = { expiresIn: 900, refreshExpiresIn: 604800, user };
const response = (body: unknown, status = 200) =>
    new Response(status === 204 ? null : JSON.stringify(body), { status });
function setup() {
    const fetch = vi.fn<typeof globalThis.fetch>(async (url) => {
        const path = new URL(String(url), "http://localhost").pathname;
        if (path.endsWith("/csrf"))
            return response({ token: "csrf", headerName: "X-XSRF-TOKEN" });
        if (path.endsWith("/me")) return response(user);
        if (path.endsWith("/google/nonce")) return response({ nonce: "nonce" });
        if (path.endsWith("/google/link")) return response(user);
        if (path.endsWith("/forgot-password"))
            return response({ message: "Sent" });
        if (path.endsWith("/logout") || path.endsWith("/reset-password"))
            return response(null, 204);
        return response(session);
    });
    const auth = createApiAuth({
        api: createApiClient({ fetch }),
    });
    return { auth, fetch };
}
describe("JWT authentication via HttpOnly cookies", () => {
    it("registers with credentials only and relies on HttpOnly cookies", async () => {
        const { auth, fetch } = setup();
        await expect(
            auth.register(user.email, "Password12345!"),
        ).resolves.toMatchObject({ role: "customer", name: "Tester" });
        expect(fetch).toHaveBeenCalledWith(
            "/api/v1/auth/register",
            expect.objectContaining({
                body: JSON.stringify({
                    email: user.email,
                    password: "Password12345!",
                }),
                credentials: "include",
            }),
        );
        for (const [, init] of fetch.mock.calls)
            expect(init?.headers ?? {}).not.toHaveProperty("Authorization");
    });
    it("logs in and reads /me without token headers", async () => {
        const { auth, fetch } = setup();
        await auth.login("customer", user.email, "Password12345!");
        expect(fetch).toHaveBeenCalledWith(
            "/api/v1/auth/login",
            expect.objectContaining({
                body: JSON.stringify({
                    identifier: user.email,
                    password: "Password12345!",
                }),
            }),
        );
        expect(await auth.currentUser("customer")).toMatchObject({
            id: user.id,
        });
        expect(fetch).toHaveBeenLastCalledWith(
            "/api/v1/auth/me",
            expect.objectContaining({ headers: {}, credentials: "include" }),
        );
    });
    it("shares concurrent /me reads without mixing portal roles", async () => {
        const { auth, fetch } = setup();
        const [customer, backoffice] = await Promise.all([
            auth.currentUser("customer"),
            auth.currentUser("backoffice"),
        ]);
        expect(customer?.id).toBe(user.id);
        expect(backoffice).toBeNull();
        expect(
            fetch.mock.calls.filter(([url]) => String(url).endsWith("/me")),
        ).toHaveLength(1);
        expect(
            fetch.mock.calls.some(([url]) => String(url).endsWith("/logout")),
        ).toBe(false);
    });
    it("uses username when the API has no display name", async () => {
        for (const fullName of [null, "", "   "]) {
            const { auth, fetch } = setup();
            fetch.mockImplementation(async (url) =>
                String(url).endsWith("/csrf")
                    ? response({ token: "csrf", headerName: "X-XSRF-TOKEN" })
                    : response({ ...session, user: { ...user, fullName } }),
            );
            expect(
                await auth.register(user.email, "Password12345!"),
            ).toMatchObject({
                name: user.username,
            });
        }
    });
    it("rejects wrong-portal login and logs out without sending a refresh token", async () => {
        const { auth, fetch } = setup();
        await expect(
            auth.login("backoffice", user.email, "Password12345!"),
        ).rejects.toMatchObject({ code: "FORBIDDEN" });
        expect(fetch).toHaveBeenLastCalledWith(
            "/api/v1/auth/logout",
            expect.objectContaining({ method: "POST", credentials: "include" }),
        );
        const logout = fetch.mock.calls.find(([url]) =>
            String(url).endsWith("/logout"),
        )?.[1];
        expect(logout?.body).toBeUndefined();
    });
    it("Google and password recovery use the cookie-aware client", async () => {
        const { auth, fetch } = setup();
        await auth.googleNonce();
        await auth.google("google-id-token");
        await auth.forgotPassword(user.email);
        await auth.resetPassword(user.email, "012345", "Password12345!");
        expect(fetch.mock.calls.map(([url]) => url)).toEqual(
            expect.arrayContaining([
                "/api/v1/auth/social/google/nonce",
                "/api/v1/auth/social/google",
                "/api/v1/auth/forgot-password",
                "/api/v1/auth/reset-password",
            ]),
        );
        expect(fetch).toHaveBeenCalledWith(
            "/api/v1/auth/social/google",
            expect.objectContaining({
                body: JSON.stringify({ credential: "google-id-token" }),
            }),
        );
    });
    it("logout calls the backend and sends no body", async () => {
        const { auth, fetch } = setup();
        await auth.logout("customer");
        expect(fetch).toHaveBeenLastCalledWith(
            "/api/v1/auth/logout",
            expect.objectContaining({ method: "POST", credentials: "include" }),
        );
        expect(fetch.mock.calls.at(-1)?.[1]?.body).toBeUndefined();
    });
    it("links Google to the current cookie session without creating a new login session", async () => {
        const { auth, fetch } = setup();
        await auth.googleNonce();
        await expect(auth.linkGoogle("link-credential")).resolves.toMatchObject(
            { id: user.id, name: "Tester" },
        );
        expect(fetch).toHaveBeenLastCalledWith(
            "/api/v1/auth/social/google/link",
            expect.objectContaining({
                method: "POST",
                credentials: "include",
                body: JSON.stringify({ credential: "link-credential" }),
            }),
        );
        expect(
            fetch.mock.calls.some(([url]) =>
                String(url).includes("?remember="),
            ),
        ).toBe(false);
        const init = fetch.mock.calls.at(-1)![1]!;
        expect(new Headers(init.headers).get("X-XSRF-TOKEN")).toBe("csrf");
    });
    it("offline logout reports failure because JavaScript cannot delete HttpOnly cookies", async () => {
        const { auth, fetch } = setup();
        fetch.mockRejectedValue(new TypeError("offline"));
        await expect(auth.logout("customer")).rejects.toMatchObject({
            code: "NETWORK",
        });
    });
});
