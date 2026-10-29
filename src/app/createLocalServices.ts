import type {
  DataRepository,
  GuestCartRepository,
  SessionRepository,
} from "@/shared/storage/contracts";
import type { Services } from "@/app/serviceContracts";
import { createLocalAuthService } from "@/modules/auth/api/localAuthService";
import { requireLocalUser } from "@/modules/auth/model/localSession";
import { createCatalogService } from "@/modules/catalog/api/catalogService";
import { createCartService } from "@/modules/cart/api/cartService";
import { createProfileService } from "@/modules/account/api/profileService";
import { createOrderService } from "@/modules/orders/api/orderService";
import { createManagementService } from "@/modules/management/api/managementService";

/** Ghép các local adapter; runtime thay auth bằng API JWT tại app/services.ts. */
export function createLocalServices(
  repository: DataRepository & GuestCartRepository,
  sessions: SessionRepository,
): Services {
  return {
    auth: createLocalAuthService(repository, sessions),
    catalog: createCatalogService(repository),
    cart: createCartService(repository, (db) =>
      sessions.get("customer")
        ? requireLocalUser(db, sessions, "customer", "profile:own")
        : null,
    ),
    profile: createProfileService(repository, sessions),
    orders: createOrderService(repository, sessions),
    management: createManagementService(repository, sessions),
    demo: {
      async stats() {
        const db = await repository.read();
        return {
          revision: db.revision,
          seededAt: db.seededAt,
          counts: [
            { label: "Sản phẩm", count: db.products.length },
            { label: "Thương hiệu", count: db.brands.length },
            { label: "Tài khoản", count: db.users.length },
            { label: "Đơn hàng", count: db.orders.length },
            { label: "Khuyến mãi", count: db.promotions.length },
            { label: "Hậu mãi", count: db.afterSaleRequests.length },
          ],
        };
      },
      async reset() {
        await repository.reset();
      },
    },
  };
}
