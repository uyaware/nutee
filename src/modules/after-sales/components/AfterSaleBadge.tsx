import { Chip } from "@mui/material";
import {
    afterSaleLabels,
    type AfterSaleStatus,
} from "@/modules/after-sales/model/types";

export function AfterSaleBadge({ status }: { status: AfterSaleStatus }) {
    return (
        <Chip
            size="small"
            variant="outlined"
            label={afterSaleLabels[status] ?? status}
            color={
                status === "completed" || status === "approved"
                    ? "success"
                    : status === "rejected"
                      ? "error"
                      : status === "pending"
                        ? "warning"
                        : "primary"
            }
        />
    );
}
