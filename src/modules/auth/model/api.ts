import type { User } from "@/modules/auth/model/types";
import { ServiceError } from "@/shared/lib/errors";

export interface ApiUser extends Omit<User, "name" | "role"> {
    role: string;
}

export function mapApiUser(user: ApiUser): User {
    const role = user.role.toLowerCase();
    if (role !== "customer" && role !== "staff" && role !== "admin") {
        throw new ServiceError("FORBIDDEN", "Vai trò tài khoản không hợp lệ.");
    }
    return { ...user, name: user.fullName?.trim() || user.username, role };
}
