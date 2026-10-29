import type {
  DataRepository,
  SessionRepository,
} from "@/shared/storage/contracts";
import { requireLocalUser } from "@/modules/auth/model/localSession";
import { ServiceError } from "@/shared/lib/errors";
import type { OrderService } from "@/modules/orders/model/contracts";

/** Local adapter cho module; giữ nguyên dữ liệu prototype hiện tại. */
export function createOrderService(
  repository: DataRepository,
  sessions: SessionRepository,
): OrderService {
  return {
    async list(portal) {
      const db = await repository.read();
      const user = await requireLocalUser(
        db,
        sessions,
        portal,
        portal === "customer" ? "orders:own" : "operations:read",
      );
      const items = db.orders
        .filter((o) => portal === "backoffice" || o.userId === user.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return { items, total: items.length, page: 1, pageSize: 20 };
    },
    async detail(portal, id) {
      const db = await repository.read();
      const user = await requireLocalUser(
        db,
        sessions,
        portal,
        portal === "customer" ? "orders:own" : "operations:read",
      );
      const order = db.orders.find((o) => o.id === id);
      if (!order)
        throw new ServiceError("NOT_FOUND", "Không tìm thấy đơn hàng.");
      if (portal === "customer" && order.userId !== user.id)
        throw new ServiceError(
          "FORBIDDEN",
          "Bạn chỉ được xem đơn hàng của mình.",
        );
      return order;
    },
  };
}
