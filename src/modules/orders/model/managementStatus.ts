export type StatusColor = "success" | "warning" | "error" | "info" | "default";

export function paymentStatusColor(status: string): StatusColor {
    if (status === "paid") return "success";
    if (status === "review" || status === "error" || status === "expired") return "error";
    if (status === "cancelled") return "default";
    return "warning";
}

export function orderStatusColor(status: string): StatusColor {
    if (status === "delivered") return "success";
    if (status === "cancelled") return "error";
    if (status === "pending") return "warning";
    return "info";
}
