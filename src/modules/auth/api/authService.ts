import type { AuthService } from "@/modules/auth/model/contracts";
import type { Portal, User } from "@/shared/types/database";
import { belongsToPortal } from "@/modules/auth/model/permissions";
import { ServiceError } from "@/shared/lib/errors";
import type { ApiClient } from "@/shared/api/apiClient";

interface ApiUser {
  id: string;
  username: string;
  email: string;
  fullName: string | null;
  role: string;
}
interface AuthResponse {
  expiresIn: number;
  refreshExpiresIn: number;
  user: ApiUser;
}
export interface ApiAuthService extends AuthService {
  googleNonce(): Promise<{ nonce: string }>;
  google(credential: string, remember?: boolean): Promise<User>;
  forgotPassword(email: string): Promise<{ message: string }>;
  resetPassword(token: string, password: string): Promise<void>;
}

export function createApiAuth(options: {
  api: ApiClient;
  onUser?: (
    user: User,
    portal: Portal,
    expiresAt: number,
    newLogin: boolean,
  ) => Promise<void>;
  onClear?: (portal: Portal) => void;
}): ApiAuthService {
  const { api } = options;
  let generation = 0;
  let expiresAt = Number.MAX_SAFE_INTEGER;
  let current: Promise<ApiUser> | undefined;

  function clear() {
    generation++;
    current = undefined;
    options.onClear?.("customer");
    options.onClear?.("backoffice");
  }
  function mapUser(user: ApiUser): User {
    const role = user.role.toLowerCase();
    if (role !== "customer" && role !== "staff" && role !== "admin") {
      throw new ServiceError("FORBIDDEN", "Vai trò tài khoản không hợp lệ.");
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
  async function establish(response: AuthResponse, portal: Portal) {
    api.invalidateCsrf();
    clear();
    const user = mapUser(response.user);
    if (!belongsToPortal(user.role, portal)) {
      await api.request("/auth/logout", {
        method: "POST",
        authenticated: false,
      });
      api.invalidateCsrf();
      throw new ServiceError(
        "FORBIDDEN",
        "Tài khoản không có quyền truy cập khu vực này.",
      );
    }
    expiresAt = Date.now() + response.refreshExpiresIn * 1000;
    await options.onUser?.(user, portal, expiresAt, true);
    return user;
  }
  function me() {
    if (!current) {
      const pending = api.request<ApiUser>("/auth/me").finally(() => {
        if (current === pending) current = undefined;
      });
      current = pending;
    }
    return current;
  }
  return {
    async register(email, password) {
      generation++;
      return establish(
        await api.request<AuthResponse>("/auth/register", {
          method: "POST",
          body: { email, password },
          authenticated: false,
        }),
        "customer",
      );
    },
    async login(portal, email, password, remember = false) {
      generation++;
      return establish(
        await api.request<AuthResponse>("/auth/login", {
          method: "POST",
          body: { identifier: email, password, remember },
          authenticated: false,
        }),
        portal,
      );
    },
    async currentUser(portal) {
      const observed = generation;
      try {
        const user = mapUser(await me());
        if (observed !== generation) return null;
        if (!belongsToPortal(user.role, portal)) {
          options.onClear?.(portal);
          return null;
        }
        await options.onUser?.(user, portal, expiresAt, false);
        return observed === generation ? user : null;
      } catch (error) {
        if (
          error instanceof ServiceError &&
          ["UNAUTHORIZED", "FORBIDDEN"].includes(error.code)
        ) {
          if (observed === generation) options.onClear?.(portal);
          return null;
        }
        throw error;
      }
    },
    async logout() {
      await api.request("/auth/logout", {
        method: "POST",
        authenticated: false,
      });
      api.invalidateCsrf();
      clear();
    },
    googleNonce: () =>
      api.request<{ nonce: string }>("/auth/social/google/nonce", {
        authenticated: false,
      }),
    async google(credential, remember = false) {
      generation++;
      return establish(
        await api.request<AuthResponse>(
          `/auth/social/google?remember=${remember}`,
          {
            method: "POST",
            body: { credential },
            authenticated: false,
          },
        ),
        "customer",
      );
    },
    forgotPassword: (email) =>
      api.request<{ message: string }>("/auth/forgot-password", {
        method: "POST",
        body: { email },
        authenticated: false,
      }),
    resetPassword: async (token, password) => {
      await api.request<void>("/auth/reset-password", {
        method: "POST",
        body: { token, password },
        authenticated: false,
      });
    },
  };
}
