import type {
  DataRepository,
  SessionRepository,
} from "@/shared/storage/contracts";
import { requireLocalUser } from "@/modules/auth/model/localSession";
import { ServiceError } from "@/shared/lib/errors";
import { z } from "zod";
import type { ManagementService } from "@/modules/management/model/contracts";
import { productSummary } from "@/modules/catalog/api/catalogService";

/** Local adapter cho module; giữ nguyên dữ liệu prototype hiện tại. */
export function createManagementService(
  repository: DataRepository,
  sessions: SessionRepository,
): ManagementService {
  return {
    async dashboard() {
      const db = await repository.read();
      const user = await requireLocalUser(
        db,
        sessions,
        "backoffice",
        "operations:read",
      );
      return {
        orders: db.orders.length,
        pending: db.orders.filter((o) => o.status === "pending").length,
        afterSales: db.afterSaleRequests.filter((r) =>
          ["pending", "reviewing"].includes(r.status),
        ).length,
        paidRevenue:
          user.role === "admin"
            ? db.orders
                .filter(
                  (o) => o.paymentStatus === "paid" && o.status !== "cancelled",
                )
                .reduce((sum, o) => sum + o.total, 0)
            : null,
        products: db.products.filter((p) => p.status === "published").length,
      };
    },
    async products() {
      const db = await repository.read();
      await requireLocalUser(db, sessions, "backoffice", "products:write");
      return {
        items: db.products.map((p) => productSummary(db, p)),
        revision: db.revision,
      };
    },
    async updateProduct(id, input, expectedRevision) {
      const parsed = z
        .object({
          name: z.string().trim().min(2).max(160),
          price: z.number().int().min(1000).max(1000000000),
          status: z.enum(["published", "hidden"]),
        })
        .safeParse(input);
      if (!parsed.success)
        throw new ServiceError(
          "VALIDATION",
          "Tên cần 2–160 ký tự, giá cần là số nguyên từ 1.000 đến 1.000.000.000₫.",
        );
      await repository.update(expectedRevision, (db) => {
        requireLocalUser(db, sessions, "backoffice", "products:write");
        const product = db.products.find((p) => p.id === id);
        if (!product)
          throw new ServiceError("NOT_FOUND", "Không tìm thấy sản phẩm.");
        Object.assign(product, parsed.data, {
          updatedAt: new Date().toISOString(),
        });
      });
    },
    async users() {
      const db = await repository.read();
      await requireLocalUser(db, sessions, "backoffice", "users:read");
      return db.users;
    },
  };
}
