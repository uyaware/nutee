import type { AuthService } from "./contracts";
import type { Portal, User } from "../shared/types/database";
import type { StorageLike } from "../repositories/contracts";
import { belongsToPortal } from "../shared/auth/permissions";
import { ServiceError } from "../shared/lib/errors";

interface ApiUser {
  id: string;
  username: string;
  email: string;
  fullName: string | null;
  role: string;
}
interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
  user: ApiUser;
}
interface StoredSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  refreshExpiresAt: number;
}
export const authStorageKey = (portal: Portal) => `nutee:auth:${portal}`;
export interface ApiAuthService extends AuthService {
  googleNonce(): Promise<{ nonce: string }>;
  google(idToken: string, remember?: boolean): Promise<User>;
  forgotPassword(email: string): Promise<{ message: string }>;
  resetPassword(token: string, password: string): Promise<void>;
}

export function createApiAuth(options: {
  baseUrl?: string;
  fetch?: typeof fetch;
  persistent: () => StorageLike;
  temporary: () => StorageLike;
  onUser?: (
    user: User,
    portal: Portal,
    expiresAt: number,
    newLogin: boolean,
  ) => Promise<void>;
  onClear?: (portal: Portal) => void;
}): ApiAuthService {
  const baseUrl = (options.baseUrl ?? "/api/v1").replace(/\/+$/, "");
  const requestFetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  const refreshes = new Map<Portal, Promise<StoredSession>>();
  const generations: Record<Portal, number> = { customer: 0, backoffice: 0 };

  function read(portal: Portal): StoredSession | null {
    const raw =
      options.temporary().getItem(authStorageKey(portal)) ??
      options.persistent().getItem(authStorageKey(portal));
    if (!raw) return null;
    try {
      const value = JSON.parse(raw) as StoredSession;
      if (
        typeof value.accessToken === "string" &&
        typeof value.refreshToken === "string" &&
        Number.isFinite(value.expiresAt) &&
        Number.isFinite(value.refreshExpiresAt)
      )
        return value;
    } catch {
      /* Clear malformed state and ask the user to sign in again. */
    }
    clear(portal);
    return null;
  }
  function clear(portal: Portal) {
    generations[portal]++;
    options.temporary().removeItem(authStorageKey(portal));
    options.persistent().removeItem(authStorageKey(portal));
    options.onClear?.(portal);
  }
  function store(
    portal: Portal,
    pair: TokenPair,
    remember: boolean,
  ): StoredSession {
    const value = {
      accessToken: pair.accessToken,
      refreshToken: pair.refreshToken,
      expiresAt: Date.now() + pair.expiresIn * 1000,
      refreshExpiresAt: Date.now() + pair.refreshExpiresIn * 1000,
    };
    const target = remember ? options.persistent() : options.temporary();
    const other = remember ? options.temporary() : options.persistent();
    target.setItem(authStorageKey(portal), JSON.stringify(value));
    other.removeItem(authStorageKey(portal));
    return value;
  }
  async function request<T>(
    path: string,
    body?: unknown,
    accessToken?: string,
  ): Promise<T> {
    let response: Response;
    try {
      response = await requestFetch(`${baseUrl}/auth${path}`, {
        method: body === undefined ? "GET" : "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      throw new ServiceError(
        "NETWORK",
        "Không thể kết nối máy chủ. Vui lòng thử lại.",
      );
    }
    if (!response.ok) {
      const problem = (await response.json().catch(() => ({}))) as {
        detail?: string;
        errors?: { field: string; message: string }[];
      };
      const message =
        response.status === 401
          ? "Thông tin đăng nhập không hợp lệ hoặc phiên đã hết hạn."
          : (problem.detail ?? "Yêu cầu không thành công. Vui lòng thử lại.");
      throw new ServiceError(
        response.status === 401
          ? "UNAUTHORIZED"
          : response.status === 403
            ? "FORBIDDEN"
            : response.status === 409
              ? "CONFLICT"
              : response.status >= 500
                ? "NETWORK"
                : "VALIDATION",
        message,
        problem.errors
          ? Object.fromEntries(
              problem.errors.map((error) => [error.field, error.message]),
            )
          : undefined,
      );
    }
    return response.status === 204
      ? (undefined as T)
      : (response.json() as Promise<T>);
  }
  function mapUser(user: ApiUser, portal: Portal): User {
    const role = user.role.toLowerCase();
    if (role !== "customer" && role !== "staff" && role !== "admin") {
      throw new ServiceError("FORBIDDEN", "Vai trò tài khoản không hợp lệ.");
    }
    if (!belongsToPortal(role, portal)) {
      throw new ServiceError(
        "FORBIDDEN",
        "Tài khoản không có quyền truy cập khu vực này.",
      );
    }
    return {
      id: user.id,
      email: user.email,
      name: (user.fullName ?? user.username).slice(0, 80),
      role,
      isActive: true,
      profileCompleted: true,
    };
  }
  async function establish(pair: TokenPair, portal: Portal, remember = false) {
    let user: User;
    try {
      user = mapUser(pair.user, portal);
    } catch (error) {
      await request("/logout", { refreshToken: pair.refreshToken }).catch(
        () => {},
      );
      throw error;
    }
    generations[portal]++;
    const stored = store(portal, pair, remember);
    await options.onUser?.(user, portal, stored.refreshExpiresAt, true);
    return user;
  }
  async function refresh(portal: Portal): Promise<StoredSession> {
    const pending = refreshes.get(portal);
    if (pending) return pending;
    const session = read(portal);
    if (!session || session.refreshExpiresAt <= Date.now()) {
      clear(portal);
      throw new ServiceError("UNAUTHORIZED", "Phiên đăng nhập đã hết hạn.");
    }
    const generation = generations[portal];
    const remember =
      options.persistent().getItem(authStorageKey(portal)) !== null;
    const rotate = async () => {
      const latest = read(portal);
      if (!latest)
        throw new ServiceError("UNAUTHORIZED", "Phiên đăng nhập đã kết thúc.");
      // Another tab may have rotated a remembered session while this tab waited.
      if (latest.refreshToken !== session.refreshToken) return latest;
      const pair = await request<TokenPair>("/refresh", {
        refreshToken: latest.refreshToken,
      });
      const current = read(portal);
      if (current && current.refreshToken !== latest.refreshToken)
        return current;
      if (generation !== generations[portal] || !current)
        throw new ServiceError("UNAUTHORIZED", "Phiên đăng nhập đã thay đổi.");
      mapUser(pair.user, portal);
      return store(portal, pair, remember);
    };
    const rotation = Promise.resolve(
      typeof navigator !== "undefined" && navigator.locks
        ? navigator.locks.request(`nutee:auth:refresh:${portal}`, rotate)
        : rotate(),
    );
    const promise = rotation
      .catch((error) => {
        if (
          generation === generations[portal] &&
          read(portal)?.refreshToken === session.refreshToken &&
          error instanceof ServiceError &&
          ["UNAUTHORIZED", "FORBIDDEN"].includes(error.code)
        )
          clear(portal);
        throw error;
      })
      .finally(() => {
        if (refreshes.get(portal) === promise) refreshes.delete(portal);
      });
    refreshes.set(portal, promise);
    return promise;
  }
  return {
    register: async (email, password) =>
      establish(
        await request<TokenPair>("/register", { email, password }),
        "customer",
      ),
    login: async (portal, email, password, remember = false) =>
      establish(
        await request<TokenPair>("/login", { identifier: email, password }),
        portal,
        remember,
      ),
    async currentUser(portal) {
      let session = read(portal);
      if (!session) {
        options.onClear?.(portal);
        return null;
      }
      try {
        if (session.expiresAt <= Date.now() + 5000)
          session = await refresh(portal);
        let remote: ApiUser;
        try {
          remote = await request<ApiUser>(
            "/me",
            undefined,
            session.accessToken,
          );
        } catch (error) {
          if (!(error instanceof ServiceError) || error.code !== "UNAUTHORIZED")
            throw error;
          session = await refresh(portal);
          remote = await request<ApiUser>(
            "/me",
            undefined,
            session.accessToken,
          );
        }
        // A logout during /me must not restore the signed-in UI.
        if (read(portal)?.accessToken !== session.accessToken) return null;
        const user = mapUser(remote, portal);
        await options.onUser?.(user, portal, session.refreshExpiresAt, false);
        return user;
      } catch (error) {
        if (
          error instanceof ServiceError &&
          ["UNAUTHORIZED", "FORBIDDEN"].includes(error.code)
        ) {
          if (read(portal)?.refreshToken === session?.refreshToken)
            clear(portal);
          return null;
        }
        throw error;
      }
    },
    async logout(portal) {
      const pending = refreshes.get(portal);
      if (pending) await pending.catch(() => {});
      const session = read(portal);
      clear(portal);
      if (session)
        await request("/logout", { refreshToken: session.refreshToken }).catch(
          () => {},
        );
    },
    googleNonce: () => request<{ nonce: string }>("/google/nonce"),
    google: async (idToken, remember = false) =>
      establish(
        await request<TokenPair>("/google", { idToken }),
        "customer",
        remember,
      ),
    forgotPassword: (email) =>
      request<{ message: string }>("/forgot-password", { email }),
    resetPassword: (token, password) =>
      request<void>("/reset-password", { token, password }),
  };
}
