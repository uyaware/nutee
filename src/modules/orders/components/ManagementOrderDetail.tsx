import { useState } from "react";
import { Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Divider, Paper, Stack, Typography } from "@mui/material";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { services } from "@/app/services";
import { useSession } from "@/modules/auth/hooks/useSession";
import { OrderProducts, OrderTotals } from "@/modules/checkout/components/CheckoutSummary";
import { OrderHistoryPanel } from "@/modules/orders/components/OrderHistoryPanel";
import { orderProducts, paymentLabels } from "@/modules/orders/model/api";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/Feedback";
import { dateTime } from "@/shared/lib/format";
import { errorMessage } from "@/shared/lib/errors";

const statuses: Record<string, string> = { pending: "Chờ xác nhận", confirmed: "Đã xác nhận", packing: "Đóng gói", shipping: "Đang giao", delivered: "Đã giao", cancelled: "Đã hủy" };
const actions: Record<string, { status: string; label: string }> = {
    pending: { status: "confirmed", label: "Xác nhận đơn" },
    confirmed: { status: "packing", label: "Bắt đầu đóng gói" },
    packing: { status: "shipping", label: "Bàn giao vận chuyển" },
    shipping: { status: "delivered", label: "Xác nhận đã giao" },
};

export function ManagementOrderDetail() {
    const id = Number(useParams().id);
    const session = useSession("backoffice");
    const cache = useQueryClient();
    const [selected, setSelected] = useState<{ status: string; label: string } | null>(null);
    const valid = Number.isSafeInteger(id) && id > 0;
    const query = useQuery({ queryKey: ["management", session.data?.id, "orders", id], queryFn: () => services.orders.managementGet(id), enabled: !!session.data && valid, retry: false,
        refetchInterval: (current) => current.state.data?.paymentMethod === "qr" && current.state.data?.status === "pending" && !["paid", "cancelled", "expired"].includes(current.state.data.paymentStatus) ? 5000 : false });
    const transition = useMutation({
        mutationFn: (status: string) => services.orders.managementTransition(id, status),
        onSuccess: async () => {
            setSelected(null);
            await Promise.all([cache.invalidateQueries({ queryKey: ["management", session.data?.id, "orders"] }), cache.invalidateQueries({ queryKey: ["customer"] })]);
        },
        onError: () => { void cache.invalidateQueries({ queryKey: ["management", session.data?.id, "orders", id] }); },
    });
    if (!valid) return <EmptyState title="Không tìm thấy đơn hàng" description="Kiểm tra mã đơn hàng." />;
    if (query.isPending) return <LoadingState />;
    if (query.isError) return <ErrorState error={query.error} retry={() => void query.refetch()} />;
    const order = query.data;
    const next = actions[order.status];
    const needsPayment = order.paymentMethod === "qr" && order.paymentStatus !== "paid";
    const canAdvance = order.paymentMethod === "qr" ? order.paymentStatus === "paid" : order.paymentMethod === "cod" && ["unpaid", "paid"].includes(order.paymentStatus);
    const canCancel = ["pending", "confirmed", "packing"].includes(order.status) && (order.paymentMethod === "cod" ? order.paymentStatus === "unpaid" : order.paymentMethod === "qr" && ["new", "pending", "creating", "error", "expired", "cancelled"].includes(order.paymentStatus));
    return <Stack spacing={3}>
        <Button component={Link} to="/management/orders" startIcon={<ArrowBackRounded />} sx={{ alignSelf: "flex-start" }}>Về danh sách đơn hàng</Button>
        <Stack direction="row" gap={2} alignItems="center" flexWrap="wrap"><Typography variant="h1">Đơn hàng {order.code}</Typography><Chip label={statuses[order.status] ?? order.status} /></Stack>
        <Typography color="text.secondary">Đặt lúc {dateTime(order.createdAt)}</Typography>
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}><Stack spacing={3}>
            <Typography variant="h2">Thông tin nhận hàng</Typography><Typography>{order.recipient || "Chưa cập nhật"} · {order.phone || "Chưa cập nhật"}</Typography>
            <Typography color="text.secondary">{order.addressLine || "Chưa có địa chỉ"}</Typography>{order.note && <Typography>Ghi chú: {order.note}</Typography>}
            <Divider /><OrderProducts items={orderProducts(order)} /><Divider /><OrderTotals quote={order} />
            <Typography>{order.paymentMethod === "cod" ? "Thanh toán khi nhận hàng" : "Chuyển khoản qua payOS"} · {paymentLabels[order.paymentStatus] ?? order.paymentStatus}</Typography>
            {order.paymentStatus === "review" && <Alert severity="warning">Thanh toán cần được đối soát.</Alert>}
            {needsPayment && order.paymentStatus !== "review" && order.status !== "cancelled" && <Alert severity="info">Đơn payOS cần được xác nhận thanh toán trước khi xử lý giao hàng.</Alert>}
            <Stack direction="row" gap={1} flexWrap="wrap">
                {next && canAdvance && <Button variant="contained" onClick={() => { transition.reset(); setSelected(next); }}>{next.label}</Button>}
                {canCancel && <Button color="error" variant="outlined" onClick={() => { transition.reset(); setSelected({ status: "cancelled", label: "Hủy đơn" }); }}>Hủy đơn</Button>}
            </Stack>
        </Stack></Paper>
        <OrderHistoryPanel id={id} currentStatus={order.status} management />
        <Dialog open={!!selected} onClose={() => { if (!transition.isPending) setSelected(null); }}>
            <DialogTitle>{selected?.label}?</DialogTitle><DialogContent>
                <DialogContentText>{selected?.status === "cancelled" ? "Đơn sẽ được hoàn kho sau khi xác nhận hủy. Với payOS, hệ thống kiểm tra kết quả từ cổng thanh toán." : selected?.status === "delivered" && order.paymentMethod === "cod" ? "Xác nhận đã giao hàng và đã thu tiền COD." : "Xác nhận chuyển đơn sang bước xử lý tiếp theo."}</DialogContentText>
                {transition.isError && <Alert severity="error" sx={{ mt: 2 }}>{errorMessage(transition.error)}</Alert>}
            </DialogContent><DialogActions><Button disabled={transition.isPending} onClick={() => setSelected(null)}>Quay lại</Button><Button disabled={transition.isPending} onClick={() => { if (selected) transition.mutate(selected.status); }}>Xác nhận</Button></DialogActions>
        </Dialog>
    </Stack>;
}
