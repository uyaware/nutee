import { ServiceError } from "@/shared/lib/errors";

export const unavailableMessage =
  "Chức năng này hiện chưa được hỗ trợ. Vui lòng quay lại sau.";

/** Chặn thao tác chưa có API; không giả lập lưu thành công. */
export async function unavailable(): Promise<never> {
  throw new ServiceError("VALIDATION", unavailableMessage);
}
