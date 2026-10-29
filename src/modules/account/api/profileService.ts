import type { AuthService } from "@/modules/auth/model/contracts";
import type { ProfileService } from "@/modules/account/model/contracts";
import { ServiceError } from "@/shared/lib/errors";
import { unavailable } from "@/shared/api/unavailable";

/** Hồ sơ lấy từ /auth/me; địa chỉ rỗng và thao tác cập nhật chờ API tương ứng. */
export function createProfileService(auth: AuthService): ProfileService {
  return {
    async get() {
      const user = await auth.currentUser("customer");
      if (!user) throw new ServiceError("UNAUTHORIZED", "Vui lòng đăng nhập.");
      return { user, addresses: [], revision: 0 };
    },
    updateName: unavailable,
    completeProfile: unavailable,
    saveAddress: unavailable,
    removeAddress: unavailable,
    setDefaultAddress: unavailable,
  };
}
