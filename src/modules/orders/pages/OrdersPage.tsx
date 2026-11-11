import type { Portal } from "@/shared/types/database";
import ConnectedOperationsOrdersPage from "@/modules/orders/pages/ConnectedOperationsOrdersPage";
import { ManagementOrderDetail } from "@/modules/orders/components/ManagementOrderDetail";
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
        <ConnectedOperationsOrdersPage compact={compact} />
    );
}

export function OrderDetailPage({ portal }: { portal: Portal }) {
    return portal === "customer" ? (
        <CustomerOrderDetail />
    ) : (
        <ManagementOrderDetail />
    );
}
