import type { AuthService } from "@/modules/auth/model/contracts";
import type { CatalogService } from "@/modules/catalog/model/contracts";
import type { ProfileService } from "@/modules/account/model/contracts";
import type { CartService } from "@/modules/cart/model/contracts";
import type { OrderService } from "@/modules/orders/model/contracts";
import type { ManagementService } from "@/modules/management/model/contracts";

export interface DemoService {
  stats(): Promise<{
    revision: number;
    seededAt: string;
    counts: { label: string; count: number }[];
  }>;
  reset(): Promise<void>;
}

export interface Services {
  auth: AuthService;
  catalog: CatalogService;
  profile: ProfileService;
  cart: CartService;
  orders: OrderService;
  management: ManagementService;
  demo: DemoService;
}
