import type { Database, Portal, User } from "@/shared/types/database";
import type { SessionRepository } from "@/shared/storage/contracts";
import {
  belongsToPortal,
  hasPermission,
} from "@/modules/auth/model/permissions";
import type { Permission } from "@/modules/auth/model/permissions";
import { ServiceError } from "@/shared/lib/errors";

/** Kiểm tra phiên và quyền cho các module còn dùng dữ liệu local. */
export function requireLocalUser(
  db: Database,
  sessions: SessionRepository,
  portal: Portal,
  permission?: Permission,
): User {
  const session = sessions.get(portal);
  const user = session && db.users.find((u) => u.id === session.userId);
  if (!user || !user.isActive || session.expiresAt <= Date.now())
    throw new ServiceError(
      "UNAUTHORIZED",
      "Phiên đăng nhập đã hết hạn hoặc tài khoản không còn hoạt động.",
    );
  if (
    !belongsToPortal(user.role, portal) ||
    (permission && !hasPermission(user.role, permission))
  )
    throw new ServiceError(
      "FORBIDDEN",
      "Tài khoản không có quyền thực hiện thao tác này.",
    );
  return user;
}
