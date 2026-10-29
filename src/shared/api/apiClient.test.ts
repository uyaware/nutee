import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/shared/api/apiClient";

const response = (body: unknown, status = 200) =>
  new Response(status === 204 ? null : JSON.stringify(body), { status });
const csrf = { token: "csrf-value", headerName: "X-XSRF-TOKEN" };
describe("shared API client", () => {
  it("includes cookies on every request and adds CSRF to future domain mutations", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(response(csrf))
      .mockResolvedValueOnce(response({ id: "order" }));
    const api = createApiClient({ fetch });
    await api.request("/orders", { method: "POST", body: { productId: "p1" } });
    expect(fetch).toHaveBeenLastCalledWith(
      "/api/v1/orders",
      expect.objectContaining({
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": "csrf-value",
        },
        body: JSON.stringify({ productId: "p1" }),
      }),
    );
    for (const [, init] of fetch.mock.calls)
      expect(init?.headers ?? {}).not.toHaveProperty("Authorization");
  });
  it("refreshes on 401 with no body and retries future API requests once", async () => {
    let refreshed = false;
    const fetch = vi.fn<typeof globalThis.fetch>(async (url) => {
      if (String(url).endsWith("/csrf")) return response(csrf);
      if (String(url).endsWith("/refresh")) {
        refreshed = true;
        return response({ expiresIn: 900 });
      }
      return refreshed ? response({ ok: true }) : response({}, 401);
    });
    const api = createApiClient({ fetch });
    expect(await api.request("/orders")).toEqual({ ok: true });
    const refresh = fetch.mock.calls.find(([url]) =>
      String(url).endsWith("/refresh"),
    )?.[1];
    expect(refresh).toMatchObject({
      method: "POST",
      credentials: "include",
      headers: { "X-XSRF-TOKEN": "csrf-value" },
    });
    expect(refresh?.body).toBeUndefined();
    expect(
      fetch.mock.calls.filter(([url]) => String(url).endsWith("/orders")),
    ).toHaveLength(2);
  });
  it("coordinates concurrent expired requests into one refresh", async () => {
    let refreshed = false;
    const fetch = vi.fn<typeof globalThis.fetch>(async (url) => {
      if (String(url).endsWith("/csrf")) return response(csrf);
      if (String(url).endsWith("/refresh")) {
        refreshed = true;
        return response({});
      }
      return refreshed ? response({ ok: true }) : response({}, 401);
    });
    const api = createApiClient({ fetch });
    await Promise.all([api.request("/orders"), api.request("/products")]);
    expect(
      fetch.mock.calls.filter(([url]) => String(url).endsWith("/refresh")),
    ).toHaveLength(1);
  });
  it("does not refresh invalid login credentials or loop on rejected refresh", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async (url) =>
      String(url).endsWith("/csrf") ? response(csrf) : response({}, 401),
    );
    const api = createApiClient({ fetch });
    await expect(
      api.request("/auth/login", {
        method: "POST",
        body: {},
        authenticated: false,
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(
      fetch.mock.calls.some(([url]) => String(url).endsWith("/refresh")),
    ).toBe(false);
    await expect(api.request("/orders")).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(
      fetch.mock.calls.filter(([url]) => String(url).endsWith("/refresh")),
    ).toHaveLength(1);
  });
  it("renews a rotated CSRF token but does not retry ordinary forbidden errors", async () => {
    let csrfRequests = 0,
      writes = 0;
    const fetch = vi.fn<typeof globalThis.fetch>(async (url) => {
      if (String(url).endsWith("/csrf"))
        return response({ ...csrf, token: `csrf-${++csrfRequests}` });
      return ++writes === 1
        ? response({ code: "CSRF_INVALID" }, 403)
        : response(null, 204);
    });
    const api = createApiClient({ fetch });
    await api.request("/cart", { method: "DELETE" });
    expect(csrfRequests).toBe(2);
    expect(fetch.mock.calls.at(-1)?.[1]?.headers).toEqual({
      "X-XSRF-TOKEN": "csrf-2",
    });
    fetch.mockResolvedValue(response({ detail: "Forbidden" }, 403));
    await expect(
      api.request("/users", { method: "DELETE" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(csrfRequests).toBe(2);
  });
  it("network failures preserve the session and do not trigger refresh", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockRejectedValue(new TypeError("offline"));
    await expect(
      createApiClient({ fetch }).request("/orders"),
    ).rejects.toMatchObject({ code: "NETWORK" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
