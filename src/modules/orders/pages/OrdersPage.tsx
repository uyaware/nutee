import type { Portal } from "@/shared/types/database";
import { PrototypeOrderHistory } from "@/modules/orders/components/PrototypeOrderHistory";
import { PrototypeOrderDetail } from "@/modules/orders/components/PrototypeOrderDetail";
import {
    CustomerOrderHistory,
    CustomerOrderDetail,
} from "@/modules/orders/components/CustomerOrders";

export function OrdersPage({
    portal,
    compact = false,
}: {
    portal: Portal;
    compact?: boolean;
}) {
    return portal === "customer" ? (
        <CustomerOrderHistory compact={compact} />
    ) : (
        <PrototypeOrderHistory portal={portal} compact={compact} />
    );
}

export function OrderDetailPage({ portal }: { portal: Portal }) {
    return portal === "customer" ? (
        <CustomerOrderDetail />
    ) : (
        <PrototypeOrderDetail portal={portal} />
    );
}
