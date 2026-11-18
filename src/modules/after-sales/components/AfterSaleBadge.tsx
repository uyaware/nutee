import { StatusBadge } from "@/shared/components/StatusBadge";
import {
    afterSaleLabels,
    type AfterSaleStatus,
} from "@/modules/after-sales/model/types";

export function AfterSaleBadge({ status }: { status: AfterSaleStatus }) {
    return (
        <StatusBadge
            kind="general"
            status={status}
            label={afterSaleLabels[status] ?? status}
        />
    );
}
