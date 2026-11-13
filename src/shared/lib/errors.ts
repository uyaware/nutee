export type ErrorCode =
    | "NETWORK"
    | "SERVER"
    | "VALIDATION"
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "CONFLICT"
    | "NOT_FOUND"
    | "CORRUPT_DATA";

export const httpErrorMessages: Readonly<Record<number, string>> = {
    400: "Thông tin gửi lên không hợp lệ.",
    401: "Vui lòng đăng nhập để tiếp tục.",
    403: "Bạn không có quyền thực hiện thao tác này.",
    404: "Không tìm thấy nội dung yêu cầu.",
    405: "Thao tác này không được hỗ trợ.",
    408: "Yêu cầu đã hết thời gian chờ.",
    409: "Dữ liệu đã thay đổi hoặc bị trùng. Vui lòng kiểm tra lại.",
    410: "Nội dung này không còn tồn tại.",
    413: "Dữ liệu gửi lên vượt quá dung lượng cho phép.",
    415: "Định dạng dữ liệu không được hỗ trợ.",
    422: "Không thể xử lý thông tin đã gửi.",
    429: "Bạn thao tác quá nhiều lần. Vui lòng thử lại sau.",
    500: "Hệ thống đang gặp sự cố, xin hãy thử lại sau.",
    502: "Không thể kết nối đến dịch vụ. Vui lòng thử lại sau.",
    503: "Dịch vụ tạm thời không khả dụng. Vui lòng thử lại sau.",
    504: "Kết nối đến dịch vụ đã hết thời gian chờ.",
};

export function httpErrorMessage(status: number): string {
    return (
        httpErrorMessages[status] ??
        (status >= 500
            ? httpErrorMessages[500]
            : `Không thể xử lý yêu cầu (HTTP ${status}).`)
    );
}
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
