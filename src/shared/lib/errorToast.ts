import { errorMessage, isSystemError, ServiceError } from "@/shared/lib/errors";

interface ErrorToast {
    id: number;
    source: unknown;
    message: string;
    retry?: () => void;
    retryLabel?: string;
}

let current: ErrorToast | undefined;
let nextId = 0;
let lastSystemToastAt = -Infinity;
const seen = new WeakSet<object>();
const listeners = new Set<() => void>();
const publish = () => listeners.forEach((listener) => listener());

/** Query/mutation và component có thể báo cùng một lỗi; chỉ tạo một toast cho mỗi lỗi. */
export function reportErrorToast(
    error: unknown,
    retry?: () => void,
    retryLabel = "Thử lại",
) {
    if (!error) return;
    if (typeof error === "object" && seen.has(error)) {
        if (retry) {
            if (current?.source === error && !current.retry) {
                current = { ...current, retry, retryLabel };
                publish();
            }
        }
        return;
    }
    if (typeof error === "object") seen.add(error);
    const message = isSystemError(error)
        ? "Hệ thống đang gặp sự cố, xin hãy thử lại sau."
        : error instanceof ServiceError || typeof error === "string"
          ? errorMessage(error)
          : "Có lỗi xảy ra. Vui lòng thử lại.";
    // Các query polling không lặp toast liên tục trong cùng một đợt mất kết nối.
    if (isSystemError(error)) {
        if (Date.now() - lastSystemToastAt < 60000) return;
        lastSystemToastAt = Date.now();
    }
    current = { id: ++nextId, source: error, message, retry, retryLabel };
    publish();
}

export function subscribeErrorToasts(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
export function currentErrorToast() {
    return current;
}
export function dismissErrorToast(id: number) {
    if (current?.id === id) current = undefined;
    publish();
}
