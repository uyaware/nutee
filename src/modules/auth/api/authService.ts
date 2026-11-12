import type { AuthService } from "@/modules/auth/model/contracts";
import type { Portal } from "@/modules/auth/model/types";
import { mapApiUser, type ApiUser } from "@/modules/auth/model/api";
import { belongsToPortal } from "@/modules/auth/model/permissions";
import { ServiceError } from "@/shared/lib/errors";
import type { ApiClient } from "@/shared/api/apiClient";

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
    async function establish(response: AuthResponse, portal: Portal) {
        api.invalidateCsrf();
        clear();
        const user = mapApiUser(response.user);
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
        async login(portal, email, password) {
            generation++;
            return establish(
                await api.request<AuthResponse>("/auth/login", {
                    method: "POST",
                    body: { identifier: email, password },
                    authenticated: false,
                }),
                portal,
            );
        },
        async currentUser(portal) {
            const observed = generation;
            try {
                const user = mapApiUser(await me());
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
        async google(credential) {
            generation++;
            return establish(
                await api.request<AuthResponse>(
                    "/auth/social/google",
                    {
                        method: "POST",
                        body: { credential },
                        authenticated: false,
                    },
                ),
                "customer",
            );
        },
        async linkGoogle(credential) {
            const user = await api.request<ApiUser>(
                "/auth/social/google/link",
                {
                    method: "POST",
                    body: { credential },
                },
            );
            clear();
            return mapApiUser(user);
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
