import type { AuthService } from "@/modules/auth/model/contracts";
import type { Portal, User } from "@/modules/auth/model/types";
import { belongsToPortal } from "@/modules/auth/model/permissions";
import { ServiceError } from "@/shared/lib/errors";
import type { ApiClient } from "@/shared/api/apiClient";

interface ApiUser extends Omit<User, "name" | "role"> {
  role: string;
}
interface AuthResponse {
  user: ApiUser;
}

/** Gọi API xác thực; backend quản lý phiên bằng cookie HttpOnly. */
export function createApiAuth(options: { api: ApiClient }): AuthService {
  const { api } = options;
  let generation = 0;
  let current: Promise<ApiUser> | undefined;

  function clear() {
    generation++;
    current = undefined;
  }
  function mapUser(user: ApiUser): User {
    const role = user.role.toLowerCase();
    if (role !== "customer" && role !== "staff" && role !== "admin") {
      throw new ServiceError("FORBIDDEN", "Vai trò tài khoản không hợp lệ.");
    }
    return {
      ...user,
      name: user.fullName?.trim() || user.username,
      role,
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
          return null;
        }
        return observed === generation ? user : null;
      } catch (error) {
        if (
          error instanceof ServiceError &&
          ["UNAUTHORIZED", "FORBIDDEN"].includes(error.code)
        ) {
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
