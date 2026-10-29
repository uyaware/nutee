import type { Order, Page, Portal } from "@/shared/types/database";

export interface OrderService {
  list(portal: Portal): Promise<Page<Order>>;
  detail(portal: Portal, id: string): Promise<Order>;
}
