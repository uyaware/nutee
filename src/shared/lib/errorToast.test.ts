import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
});
afterEach(() => {
    vi.useRealTimers();
});

describe("shared error toast reporting", () => {
    it("shows the newest failure immediately and hides unexpected technical exception text", async () => {
        const { reportErrorToast, currentErrorToast } =
            await import("@/shared/lib/errorToast");
        const { ServiceError } = await import("@/shared/lib/errors");
        reportErrorToast(
            new ServiceError("CONFLICT", "Không lưu được thay đổi."),
        );
        reportErrorToast(
            new ServiceError("CONFLICT", "Không xóa được bản ghi."),
        );
        expect(currentErrorToast()?.message).toBe("Không xóa được bản ghi.");
        reportErrorToast(new TypeError("Internal implementation details"));
        expect(currentErrorToast()?.message).toBe(
            "Có lỗi xảy ra. Vui lòng thử lại.",
        );
    });
    it("does not duplicate the same cache/component error and retains its retry action", async () => {
        const { reportErrorToast, currentErrorToast, dismissErrorToast } =
            await import("@/shared/lib/errorToast");
        const { ServiceError } = await import("@/shared/lib/errors");
        const error = new ServiceError("CONFLICT", "Không lưu được thay đổi.");
        const retry = vi.fn();
        reportErrorToast(error);
        const id = currentErrorToast()!.id;
        reportErrorToast(error, retry);
        expect(currentErrorToast()).toMatchObject({
            id,
            retry,
            message: error.message,
        });
        dismissErrorToast(id);
        expect(currentErrorToast()).toBeUndefined();
    });
    it("renews the toast when a different request fails with the same message", async () => {
        const { reportErrorToast, currentErrorToast, dismissErrorToast } =
            await import("@/shared/lib/errorToast");
        const { ServiceError } = await import("@/shared/lib/errors");
        reportErrorToast(
            new ServiceError("CONFLICT", "Không lưu được thay đổi."),
        );
        const firstId = currentErrorToast()!.id;
        reportErrorToast(
            new ServiceError("CONFLICT", "Không lưu được thay đổi."),
        );
        expect(currentErrorToast()!.id).toBeGreaterThan(firstId);
        dismissErrorToast(currentErrorToast()!.id);
        expect(currentErrorToast()).toBeUndefined();
        reportErrorToast(
            new ServiceError("CONFLICT", "Không lưu được thay đổi."),
        );
        expect(currentErrorToast()?.message).toBe("Không lưu được thay đổi.");
    });
    it("does not spam system toasts from polling and does not expose technical details", async () => {
        const { reportErrorToast, currentErrorToast, dismissErrorToast } =
            await import("@/shared/lib/errorToast");
        const { ServiceError } = await import("@/shared/lib/errors");
        reportErrorToast(new ServiceError("SERVER", "Internal details"));
        expect(currentErrorToast()?.message).toBe(
            "Hệ thống đang gặp sự cố, xin hãy thử lại sau.",
        );
        dismissErrorToast(currentErrorToast()!.id);
        reportErrorToast(new ServiceError("NETWORK", "Network details"));
        expect(currentErrorToast()).toBeUndefined();
        vi.advanceTimersByTime(60001);
        reportErrorToast(new ServiceError("SERVER", "Internal details"));
        expect(currentErrorToast()).toBeDefined();
    });
});
