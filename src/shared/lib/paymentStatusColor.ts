export function paymentStatusColor(status: string): "success" | "warning" | "error" | "default" {
    if (status === "paid") return "success";
    if (["review", "error", "expired"].includes(status)) return "error";
    if (status === "cancelled") return "default";
    return "warning";
}
