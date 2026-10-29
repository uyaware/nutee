import type { Portal } from "@/shared/types/database";
import { PrototypeOrderHistory } from "@/modules/orders/components/PrototypeOrderHistory";
import { PrototypeOrderDetail } from "@/modules/orders/components/PrototypeOrderDetail";

export function OrdersPage({
  portal,
  compact = false,
}: {
  portal: Portal;
  compact?: boolean;
}) {
  return <PrototypeOrderHistory portal={portal} compact={compact} />;
}

export function OrderDetailPage({ portal }: { portal: Portal }) {
  return <PrototypeOrderDetail portal={portal} />;
}
