import { StatusBadge } from "@/shared/components/StatusBadge";
import {
    afterSaleLabels,
    type AfterSaleStatus,
} from "@/modules/after-sales/model/types";

export function AfterSaleBadge({ status, prominent = false }: { status: AfterSaleStatus; prominent?: boolean }) {
    return (
        <StatusBadge
            kind="general"
            status={status}
            prominent={prominent}
            label={afterSaleLabels[status] ?? status}
        />
    );
}
