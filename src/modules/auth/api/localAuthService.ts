import type {
  DataRepository,
  SessionRepository,
  GuestCartRepository,
} from "@/shared/storage/contracts";
import { requireLocalUser } from "@/modules/auth/model/localSession";
import { ServiceError } from "@/shared/lib/errors";
import type { Portal, User } from "@/shared/types/database";
import type { AuthService } from "@/modules/auth/model/contracts";
import { registrationCredentialsSchema } from "@/modules/auth/model/schemas";
import { belongsToPortal } from "@/modules/auth/model/permissions";
import { mergeGuestItems } from "@/modules/cart/api/cartService";
import { createId } from "@/shared/lib/id";
import { DEMO_PASSWORD } from "@/shared/storage/seed";

/** Local adapter cho module; giữ nguyên dữ liệu prototype hiện tại. */
export function createLocalAuthService(
  repository: DataRepository & GuestCartRepository,
  sessions: SessionRepository,
): AuthService {
  async function establishSession(user: User, portal: Portal) {
    let cartMergeNotices: string[] = [];
    if (portal === "customer")
      await repository.mergeGuest(user.id, (current, guest) => {
        cartMergeNotices = mergeGuestItems(current, guest, user.id);
      });
    sessions.set(portal, {
      userId: user.id,
      expiresAt: Date.now() + 8 * 3600000,
    });
    return { ...user, cartMergeNotices };
  }
  return {
    async register(email, password) {
      const parsed = registrationCredentialsSchema.safeParse({
        email,
        password,
      });
      if (!parsed.success)
        throw new ServiceError(
          "VALIDATION",
          "Kiểm tra email và mật khẩu đăng ký.",
          Object.fromEntries(
            parsed.error.issues.map((issue) => [
              String(issue.path[0]),
              issue.message,
            ]),
          ),
        );
      const db = await repository.read();
      const user: User = {
        id: createId(),
        email: parsed.data.email,
        name: "",
        profileCompleted: false,
        role: "customer",
        isActive: true,
      };
      await repository.update(db.revision, (current) => {
        if (current.users.some((u) => u.email.toLowerCase() === user.email))
          throw new ServiceError("VALIDATION", "Email đã được sử dụng.", {
            email: "Email đã được dùng.",
          });
        current.users.push(user);
        current.credentials.push({
          id: createId(),
          userId: user.id,
          password: parsed.data.password,
        });
        current.carts.push({ id: createId(), userId: user.id });
      });
      return establishSession(user, "customer");
    },
    async login(portal, email, password) {
      const db = await repository.read();
      const user = db.users.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
      );
      const credential =
        user && db.credentials.find((c) => c.userId === user.id);
      if (!user || password !== (credential?.password ?? DEMO_PASSWORD))
        throw new ServiceError(
          "VALIDATION",
          "Email hoặc mật khẩu không đúng.",
          { password: "Kiểm tra thông tin đăng nhập." },
        );
      if (!user.isActive || !belongsToPortal(user.role, portal))
        throw new ServiceError(
          "FORBIDDEN",
          portal === "customer"
            ? "Portal cửa hàng chỉ dành cho tài khoản customer."
            : "Portal vận hành chỉ dành cho staff hoặc admin.",
        );
      return establishSession(user, portal);
    },
    async currentUser(portal) {
      const db = await repository.read();
      try {
        return await requireLocalUser(db, sessions, portal);
      } catch (error) {
        if (
          error instanceof ServiceError &&
          ["UNAUTHORIZED", "FORBIDDEN"].includes(error.code)
        )
          return null;
        throw error;
      }
    },
    async logout(portal) {
      sessions.remove(portal);
    },
  };
}
