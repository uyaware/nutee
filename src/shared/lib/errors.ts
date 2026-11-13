export type ErrorCode =
    | "NETWORK"
    | "SERVER"
    | "VALIDATION"
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "CONFLICT"
    | "NOT_FOUND"
    | "CORRUPT_DATA";
export class ServiceError extends Error {
    constructor(
        public code: ErrorCode,
        message: string,
        public fieldErrors?: Record<string, string>,
    ) {
        super(message);
        this.name = "ServiceError";
    }
}
export const errorMessage = (error: unknown) =>
    error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "Có lỗi xảy ra. Vui lòng thử lại.";

export const isSystemError = (error: unknown): error is ServiceError =>
    error instanceof ServiceError &&
    (error.code === "SERVER" || error.code === "NETWORK");
