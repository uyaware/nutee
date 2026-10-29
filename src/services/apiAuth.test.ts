import { describe, expect, it, vi } from "vitest";
import { createApiAuth, authStorageKey } from "./apiAuth";
import { MemoryStorage } from "../mocks/testing/MemoryStorage";

const user = {
  id: "remote-id",
  username: "tester",
  email: "test@example.com",
  fullName: "Tester",
  role: "CUSTOMER",
};
const pair = (suffix = "", expiresIn = 900) => ({
  accessToken: `access${suffix}`,
  refreshToken: `refresh${suffix}`,
  expiresIn,
  refreshExpiresIn: 604800,
  user,
});
const response = (body: unknown, status = 200) =>
  new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
function setup() {
  const persistent = new MemoryStorage();
  const temporary = new MemoryStorage();
  const fetch = vi.fn<typeof globalThis.fetch>();
  const onUser = vi.fn(async () => {});
  const onClear = vi.fn();
  const auth = createApiAuth({
    fetch,
    persistent: () => persistent,
    temporary: () => temporary,
    onUser,
    onClear,
  });
  return { auth, fetch, persistent, temporary, onUser, onClear };
}
describe("backend authentication", () => {
  it("registers without local credentials and uses the versioned endpoint", async () => {
    const { auth, fetch, temporary, persistent } = setup();
    fetch.mockResolvedValue(response(pair()));
    await expect(
      auth.register(user.email, "Password12345!"),
    ).resolves.toMatchObject({ role: "customer", name: "Tester" });
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/auth/register",
      expect.objectContaining({
        body: JSON.stringify({ email: user.email, password: "Password12345!" }),
        credentials: "include",
      }),
    );
    expect(temporary.getItem(authStorageKey("customer"))).toContain("refresh");
    expect(persistent.getItem(authStorageKey("customer"))).toBeNull();
    expect(temporary.getItem(authStorageKey("customer"))).not.toContain(
      "Password12345!",
    );
  });
  it("persists only when remember login is selected and reloads /me from the server", async () => {
    const { auth, fetch, temporary, persistent } = setup();
    fetch
      .mockResolvedValueOnce(response(pair()))
      .mockResolvedValueOnce(response(user));
    await auth.login("customer", user.email, "Password12345!", true);
    expect(persistent.getItem(authStorageKey("customer"))).toContain("refresh");
    expect(temporary.getItem(authStorageKey("customer"))).toBeNull();
    expect(await auth.currentUser("customer")).toMatchObject({ id: user.id });
    expect(fetch).toHaveBeenLastCalledWith(
      "/api/v1/auth/me",
      expect.objectContaining({ headers: { Authorization: "Bearer access" } }),
    );
  });
  it("serializes refresh calls and replaces the entire token pair", async () => {
    const { auth, fetch, temporary } = setup();
    fetch.mockResolvedValueOnce(response(pair("", -1)));
    await auth.login("customer", user.email, "Password12345!");
    fetch.mockImplementation(async (url) =>
      String(url).endsWith("/refresh") ? response(pair("new")) : response(user),
    );
    const results = await Promise.all([
      auth.currentUser("customer"),
      auth.currentUser("customer"),
    ]);
    expect(results.every((result) => result?.id === user.id)).toBe(true);
    expect(
      fetch.mock.calls.filter(([url]) => String(url).endsWith("/refresh")),
    ).toHaveLength(1);
    expect(temporary.getItem(authStorageKey("customer"))).toContain(
      "refreshnew",
    );
  });
  it("clears an invalid refresh but preserves credentials on network errors", async () => {
    const { auth, fetch, temporary } = setup();
    fetch.mockResolvedValueOnce(response(pair("", -1)));
    await auth.login("customer", user.email, "Password12345!");
    fetch.mockRejectedValueOnce(new TypeError("offline"));
    await expect(auth.currentUser("customer")).rejects.toMatchObject({
      code: "NETWORK",
    });
    expect(temporary.getItem(authStorageKey("customer"))).not.toBeNull();
    fetch.mockResolvedValueOnce(response({}, 401));
    expect(await auth.currentUser("customer")).toBeNull();
    expect(temporary.getItem(authStorageKey("customer"))).toBeNull();
  });
  it("rejects the wrong portal and revokes the newly issued refresh token", async () => {
    const { auth, fetch, persistent, temporary } = setup();
    fetch
      .mockResolvedValueOnce(response(pair()))
      .mockResolvedValueOnce(response(null, 204));
    await expect(
      auth.login("backoffice", user.email, "Password12345!"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(fetch).toHaveBeenLastCalledWith(
      "/api/v1/auth/logout",
      expect.objectContaining({
        body: JSON.stringify({ refreshToken: "refresh" }),
      }),
    );
    expect(persistent.data.size + temporary.data.size).toBe(0);
  });
  it("sends Google credentials and reset requests to public endpoints without bearer headers", async () => {
    const { auth, fetch } = setup();
    fetch
      .mockResolvedValueOnce(response({ nonce: "nonce" }))
      .mockResolvedValueOnce(response(pair()))
      .mockResolvedValueOnce(response({ message: "Sent" }))
      .mockResolvedValueOnce(response(null, 204));
    await auth.googleNonce();
    await auth.google("google-id-token");
    await auth.forgotPassword(user.email);
    await auth.resetPassword("reset-token", "Password12345!");
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      "/api/v1/auth/google/nonce",
      "/api/v1/auth/google",
      "/api/v1/auth/forgot-password",
      "/api/v1/auth/reset-password",
    ]);
    for (const [, init] of fetch.mock.calls)
      expect(init?.headers).not.toHaveProperty("Authorization");
  });
  it("logout revokes the current token and clears only that portal", async () => {
    const { auth, fetch, temporary, onClear } = setup();
    fetch
      .mockResolvedValueOnce(response(pair()))
      .mockResolvedValueOnce(response(null, 204));
    await auth.login("customer", user.email, "Password12345!");
    await auth.logout("customer");
    expect(temporary.getItem(authStorageKey("customer"))).toBeNull();
    expect(onClear).toHaveBeenCalledWith("customer");
    expect(await auth.currentUser("customer")).toBeNull();
  });
});
