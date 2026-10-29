import { ServiceError } from "@/shared/lib/errors";

export interface ApiRequest {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  authenticated?: boolean;
}
export interface ApiClient {
  request<T>(path: string, options?: ApiRequest): Promise<T>;
  invalidateCsrf(): void;
}
interface CsrfResponse {
  token: string;
  headerName: string;
}
class ApiError extends ServiceError {
  constructor(
    public status: number,
    public problemCode: string | undefined,
    detail?: string,
    fieldErrors?: Record<string, string>,
  ) {
    super(
      status === 401
        ? "UNAUTHORIZED"
        : status === 403
          ? "FORBIDDEN"
          : status === 409
            ? "CONFLICT"
            : status === 404
              ? "NOT_FOUND"
              : status >= 500
                ? "NETWORK"
                : "VALIDATION",
      status === 401
        ? "Thông tin đăng nhập không hợp lệ."
        : (detail ?? "Yêu cầu không thành công. Vui lòng thử lại."),
      fieldErrors,
    );
  }
}

/** All API domains use this client so cookies, CSRF and refresh work consistently. */
export function createApiClient(
  options: { baseUrl?: string; fetch?: typeof fetch } = {},
): ApiClient {
  const base = (options.baseUrl ?? "/api/v1").replace(/\/+$/, "");
  const requestFetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  let csrf: Promise<CsrfResponse> | undefined;
  let refreshing: Promise<void> | undefined;
  let sessionQueue: Promise<unknown> = Promise.resolve();

  function withSessionLock<T>(action: () => Promise<T>): Promise<T> {
    const pending = sessionQueue.then(async () => {
      if (typeof navigator !== "undefined" && navigator.locks) {
        return await navigator.locks.request("nutee:cookie-session", action);
      }
      return action();
    });
    sessionQueue = pending.catch(() => {});
    return pending;
  }

  async function fetchResponse(
    path: string,
    init: RequestInit,
  ): Promise<Response> {
    try {
      return await requestFetch(`${base}${path}`, {
        ...init,
        credentials: "include",
        cache: "no-store",
      });
    } catch {
      throw new ServiceError(
        "NETWORK",
        "Không thể kết nối máy chủ. Vui lòng thử lại.",
      );
    }
  }
  async function parse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const problem = (await response.json().catch(() => ({}))) as {
        code?: string;
        detail?: string;
        errors?: { field: string; message: string }[];
      };
      throw new ApiError(
        response.status,
        problem.code,
        problem.detail,
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
  function getCsrf() {
    if (!csrf) {
      const pending = fetchResponse("/auth/csrf", { method: "GET" })
        .then(parse<CsrfResponse>)
        .catch((error) => {
          if (csrf === pending) csrf = undefined;
          throw error;
        });
      csrf = pending;
    }
    return csrf;
  }
  async function send<T>(
    path: string,
    request: ApiRequest,
    retryCsrf = true,
  ): Promise<T> {
    const method = request.method ?? "GET";
    const csrfRequest = method === "GET" ? undefined : getCsrf();
    const csrfToken = csrfRequest ? await csrfRequest : undefined;
    const response = await fetchResponse(path, {
      method,
      headers: {
        ...(request.body === undefined
          ? {}
          : { "Content-Type": "application/json" }),
        ...(csrfToken ? { [csrfToken.headerName]: csrfToken.token } : {}),
      },
      ...(request.body === undefined
        ? {}
        : { body: JSON.stringify(request.body) }),
    });
    try {
      return await parse<T>(response);
    } catch (error) {
      // Login/logout rotate the CSRF cookie; recover after changes in another tab.
      if (
        retryCsrf &&
        error instanceof ApiError &&
        error.problemCode === "CSRF_INVALID"
      ) {
        if (csrf === csrfRequest) csrf = undefined;
        return send<T>(path, request, false);
      }
      throw error;
    }
  }
  function refresh(): Promise<void> {
    if (refreshing) return refreshing;
    async function rotate() {
      // A different tab may have refreshed while this tab waited for the lock.
      try {
        await send("/auth/me", {});
        return;
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) throw error;
      }
      try {
        await send("/auth/refresh", { method: "POST", authenticated: false });
      } finally {
        // Refresh thất bại có thể xóa cookie CSRF; lần ghi tiếp theo phải lấy token mới.
        csrf = undefined;
      }
    }
    const pending = withSessionLock(rotate).finally(() => {
      if (refreshing === pending) refreshing = undefined;
    });
    refreshing = pending;
    return pending;
  }
  return {
    async request<T>(path: string, request: ApiRequest = {}): Promise<T> {
      if (
        request.method === "POST" &&
        /^\/auth\/(login|register|logout|google|social\/google)(\?|$)/.test(
          path,
        )
      ) {
        return withSessionLock(async () => {
          const result = await send<T>(path, request);
          csrf = undefined;
          return result;
        });
      }
      try {
        return await send<T>(path, request);
      } catch (error) {
        if (
          request.authenticated === false ||
          !(error instanceof ApiError) ||
          error.status !== 401
        )
          throw error;
        await refresh();
        return send<T>(path, request);
      }
    },
    invalidateCsrf() {
      csrf = undefined;
    },
  };
}
