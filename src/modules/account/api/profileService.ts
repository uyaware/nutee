import type {
  DataRepository,
  SessionRepository,
} from "@/shared/storage/contracts";
import { requireLocalUser } from "@/modules/auth/model/localSession";
import { ServiceError } from "@/shared/lib/errors";
import { z } from "zod";
import type { ProfileService } from "@/modules/account/model/contracts";
import {
  addressInputSchema,
  profileSetupSchema,
} from "@/modules/account/model/schemas";
import { createId } from "@/shared/lib/id";

/** Local adapter cho module; giữ nguyên dữ liệu prototype hiện tại. */
export function createProfileService(
  repository: DataRepository,
  sessions: SessionRepository,
): ProfileService {
  return {
    async completeProfile(input, expectedRevision) {
      const ownerId = sessions.get("customer")?.userId;
      const parsed = profileSetupSchema.safeParse(input);
      if (!parsed.success)
        throw new ServiceError(
          "VALIDATION",
          "Kiểm tra thông tin cá nhân và địa chỉ.",
          Object.fromEntries(
            parsed.error.issues.map((issue) => [
              String(issue.path[0]),
              issue.message,
            ]),
          ),
        );
      const updated = await repository.update(expectedRevision, (db) => {
        const user = requireLocalUser(db, sessions, "customer", "profile:own");
        if (user.id !== ownerId)
          throw new ServiceError(
            "CONFLICT",
            "Phiên khách hàng đã thay đổi. Tải lại trước khi lưu.",
          );
        if (user.profileCompleted !== false)
          throw new ServiceError(
            "CONFLICT",
            "Hồ sơ đã được hoàn thiện. Tải lại để tiếp tục.",
          );
        user.name = parsed.data.name;
        user.phone = parsed.data.phone;
        user.profileCompleted = true;
        if (parsed.data.line) {
          db.addresses
            .filter((a) => a.userId === user.id)
            .forEach((a) => {
              a.isDefault = false;
            });
          db.addresses.push({
            id: createId(),
            userId: user.id,
            recipient: user.name,
            phone: parsed.data.phone,
            line: parsed.data.line,
            isDefault: true,
          });
        }
      });
      return updated.users.find((user) => user.id === ownerId)!;
    },
    async get() {
      const db = await repository.read();
      const user = await requireLocalUser(
        db,
        sessions,
        "customer",
        "profile:own",
      );
      return {
        user,
        addresses: db.addresses.filter((a) => a.userId === user.id),
        revision: db.revision,
      };
    },
    async updateName(name, expectedRevision) {
      const ownerId = sessions.get("customer")?.userId;
      const parsed = z.string().trim().min(2).max(80).safeParse(name);
      if (!parsed.success)
        throw new ServiceError("VALIDATION", "Tên cần từ 2 đến 80 ký tự.", {
          name: "Tên cần từ 2 đến 80 ký tự.",
        });
      await repository.update(expectedRevision, (db) => {
        const user = requireLocalUser(db, sessions, "customer", "profile:own");
        if (user.id !== ownerId)
          throw new ServiceError(
            "CONFLICT",
            "Phiên khách hàng đã thay đổi. Tải lại hồ sơ trước khi lưu.",
          );
        user.name = parsed.data;
      });
    },
    async saveAddress(id, input, expectedRevision) {
      const ownerId = sessions.get("customer")?.userId;
      const parsed = addressInputSchema.safeParse(input);
      if (!parsed.success)
        throw new ServiceError(
          "VALIDATION",
          "Kiểm tra người nhận, số điện thoại và địa chỉ.",
          Object.fromEntries(
            parsed.error.issues.map((i) => [String(i.path[0]), i.message]),
          ),
        );
      await repository.update(expectedRevision, (db) => {
        const user = requireLocalUser(db, sessions, "customer", "profile:own");
        if (user.id !== ownerId)
          throw new ServiceError(
            "CONFLICT",
            "Phiên khách hàng đã thay đổi. Tải lại địa chỉ trước khi lưu.",
          );
        const owned = db.addresses.filter((a) => a.userId === user.id);
        const address = id ? owned.find((a) => a.id === id) : undefined;
        if (id && !address)
          throw new ServiceError(
            "NOT_FOUND",
            "Không tìm thấy địa chỉ của bạn.",
          );
        const isDefault =
          !owned.some((a) => a.isDefault) ||
          parsed.data.isDefault ||
          (address?.isDefault ?? false);
        if (isDefault)
          owned.forEach((a) => {
            a.isDefault = false;
          });
        if (address) Object.assign(address, parsed.data, { isDefault });
        else
          db.addresses.push({
            id: createId(),
            userId: user.id,
            ...parsed.data,
            isDefault,
          });
      });
    },
    async removeAddress(id, expectedRevision) {
      await repository.update(expectedRevision, (db) => {
        const user = requireLocalUser(db, sessions, "customer", "profile:own");
        const address = db.addresses.find(
          (a) => a.id === id && a.userId === user.id,
        );
        if (!address)
          throw new ServiceError(
            "NOT_FOUND",
            "Không tìm thấy địa chỉ của bạn.",
          );
        db.addresses = db.addresses.filter((a) => a.id !== id);
        if (address.isDefault) {
          const replacement = db.addresses.find((a) => a.userId === user.id);
          if (replacement) replacement.isDefault = true;
        }
      });
    },
    async setDefaultAddress(id, expectedRevision) {
      await repository.update(expectedRevision, (db) => {
        const user = requireLocalUser(db, sessions, "customer", "profile:own");
        if (!db.addresses.some((a) => a.id === id && a.userId === user.id))
          throw new ServiceError(
            "NOT_FOUND",
            "Không tìm thấy địa chỉ của bạn.",
          );
        db.addresses
          .filter((a) => a.userId === user.id)
          .forEach((a) => {
            a.isDefault = a.id === id;
          });
      });
    },
  };
}
