import { useState } from "react";
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    Paper,
    Stack,
    Typography,
} from "@mui/material";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import PaymentsOutlined from "@mui/icons-material/PaymentsOutlined";
import { alpha } from "@mui/material/styles";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { services } from "@/app/services";
import { useSession } from "@/modules/auth/hooks/useSession";
import { OrderTotals } from "@/modules/checkout/components/CheckoutSummary";
import { OrderDetailProducts } from "@/modules/orders/components/OrderDetailProducts";
import { OrderHistoryPanel } from "@/modules/orders/components/OrderHistoryPanel";
import { paymentLabels } from "@/modules/orders/model/api";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { paymentStatusColor } from "@/shared/lib/paymentStatusColor";
import {
    EmptyState,
    ErrorState,
    LoadingState,
} from "@/shared/components/Feedback";
import { dateTime, money } from "@/shared/lib/format";

const statuses: Record<string, string> = {
    pending: "Chờ xác nhận",
    confirmed: "Đã xác nhận",
    packing: "Đóng gói",
    shipping: "Đang giao",
    delivered: "Đã giao",
    cancelled: "Đã hủy",
};
const actions: Record<string, { status: string; label: string }> = {
    pending: { status: "confirmed", label: "Xác nhận đơn" },
    confirmed: { status: "packing", label: "Bắt đầu đóng gói" },
    packing: { status: "shipping", label: "Bàn giao vận chuyển" },
    shipping: { status: "delivered", label: "Xác nhận đã giao" },
};
const steps = [
    { status: "pending", title: "Đơn hàng được tạo", description: "Đơn hàng đã được ghi nhận." },
    { status: "confirmed", title: "Xác nhận đơn hàng", description: "Kiểm tra thông tin và xác nhận đơn." },
    { status: "packing", title: "Đóng gói", description: "Chuẩn bị sản phẩm cho đơn hàng." },
    { status: "shipping", title: "Bàn giao vận chuyển", description: "Đơn hàng đang trên đường giao." },
    { status: "delivered", title: "Hoàn tất giao hàng", description: "Xác nhận đơn đã được giao." },
];

export function ManagementOrderDetail() {
    const id = Number(useParams().id);
    const session = useSession("backoffice");
    const cache = useQueryClient();
    const [selected, setSelected] = useState<{
        status: string;
        label: string;
    } | null>(null);
    const valid = Number.isSafeInteger(id) && id > 0;
    const query = useQuery({
        queryKey: ["management", session.data?.id, "orders", id],
        queryFn: () => services.orders.managementGet(id),
        enabled: !!session.data && valid,
        retry: false,
        refetchInterval: (current) =>
            current.state.data?.paymentMethod === "qr" &&
            current.state.data?.status === "pending" &&
            !["paid", "cancelled", "expired"].includes(
                current.state.data.paymentStatus,
            )
                ? 5000
                : false,
    });
    const transition = useMutation({
        mutationFn: (status: string) =>
            services.orders.managementTransition(id, status),
        onSuccess: async () => {
            setSelected(null);
            await Promise.all([
                cache.invalidateQueries({
                    queryKey: ["management", session.data?.id, "orders"],
                }),
                cache.invalidateQueries({ queryKey: ["customer"] }),
            ]);
        },
        onError: () => {
            void cache.invalidateQueries({
                queryKey: ["management", session.data?.id, "orders", id],
            });
        },
    });
    if (!valid)
        return (
            <EmptyState
                title="Không tìm thấy đơn hàng"
                description="Kiểm tra mã đơn hàng."
            />
        );
    if (query.isPending) return <LoadingState />;
    if (query.isError)
        return (
            <ErrorState
                error={query.error}
                retry={() => void query.refetch()}
            />
        );
    const order = query.data;
    const next = actions[order.status];
    const needsPayment =
        order.paymentMethod === "qr" && order.paymentStatus !== "paid";
    const canAdvance =
        order.paymentMethod === "qr"
            ? order.paymentStatus === "paid"
            : order.paymentMethod === "cod" &&
              ["unpaid", "paid"].includes(order.paymentStatus);
    const canCancel =
        ["pending", "confirmed", "packing"].includes(order.status) &&
        (order.paymentMethod === "cod"
            ? order.paymentStatus === "unpaid"
            : order.paymentMethod === "qr" &&
              [
                  "new",
                  "pending",
                  "creating",
                  "error",
                  "expired",
                  "cancelled",
              ].includes(order.paymentStatus));
    const currentStep = steps.findIndex((step) => step.status === order.status);
    const paymentColor = paymentStatusColor(order.paymentStatus);
    return (
        <Stack spacing={3}>
            <Button
                component={Link}
                to="/management/orders"
                startIcon={<ArrowBackRounded />}
                sx={{ alignSelf: "flex-start" }}
            >
                Về danh sách đơn hàng
            </Button>
            <Stack direction="row" gap={2} alignItems="center" flexWrap="wrap">
                <Typography variant="h1">Đơn hàng {order.code}</Typography>
            </Stack>
            <Typography color="text.secondary">
                Đặt lúc {dateTime(order.createdAt)}
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.1fr) minmax(0, 1fr)" }, gap: 3, alignItems: "start" }}>
            <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
                <Stack spacing={3}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1.5} flexWrap="wrap">
                        <Typography variant="h2">Thông tin nhận hàng</Typography>
                        <StatusBadge prominent status={order.status} label={statuses[order.status] ?? order.status} />
                    </Stack>
                    <Typography>
                        {order.recipient || "Chưa cập nhật"} ·{" "}
                        {order.phone || "Chưa cập nhật"}
                    </Typography>
                    <Typography color="text.secondary">
                        {order.addressLine || "Chưa có địa chỉ"}
                    </Typography>
                    {order.note && (
                        <Typography>Ghi chú: {order.note}</Typography>
                    )}
                    <Divider />
                    <OrderDetailProducts items={order.items} />
                    <Divider />
                    <OrderTotals quote={order} />
                    <Box sx={(theme) => ({ p: 2, borderRadius: 2, border: "1px solid", borderColor: paymentColor === "default" ? theme.palette.divider : alpha(theme.palette[paymentColor].main, 0.35), bgcolor: paymentColor === "default" ? theme.palette.action.hover : alpha(theme.palette[paymentColor].main, 0.08) })}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} flexWrap="wrap">
                            <Stack direction="row" spacing={1} alignItems="center"><PaymentsOutlined color="action" /><Typography fontWeight={700}>Thanh toán</Typography></Stack>
                            <StatusBadge kind="payment" status={order.paymentStatus} label={paymentLabels[order.paymentStatus] ?? order.paymentStatus} />
                        </Stack>
                        <Stack direction="row" justifyContent="space-between" gap={2} flexWrap="wrap" sx={{ mt: 1.5 }}>
                            <Typography variant="body2">{order.paymentMethod === "cod" ? "Thanh toán khi nhận hàng" : "Chuyển khoản qua payOS"}</Typography>
                            <Typography variant="body2" fontWeight={700}>{money(order.total)}</Typography>
                        </Stack>
                    </Box>
                    {order.paymentStatus === "review" && (
                        <Alert severity="warning">
                            Thanh toán cần được đối soát.
                        </Alert>
                    )}
                    {needsPayment &&
                        order.paymentStatus !== "review" &&
                        order.status !== "cancelled" && (
                            <Alert severity="info">
                                Đơn payOS cần được xác nhận thanh toán trước khi
                                xử lý giao hàng.
                            </Alert>
                        )}
                </Stack>
            </Paper>
            <Stack spacing={3}>
            <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
                <Stack spacing={2.5}>
                    <Box>
                        <Typography variant="h2">Xử lý đơn hàng</Typography>
                        <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
                            Xác nhận từng bước theo tiến trình đơn hàng.
                        </Typography>
                    </Box>
                    {order.status === "cancelled" && <Alert severity="warning">Đơn hàng đã bị hủy.</Alert>}
                    {needsPayment && order.status !== "cancelled" && <Alert severity={order.paymentStatus === "review" ? "warning" : "info"}>{order.paymentStatus === "review" ? "Thanh toán cần đối soát trước khi tiếp tục xử lý." : "Chờ xác nhận thanh toán payOS trước khi tiếp tục xử lý."}</Alert>}
                    <Stack spacing={0}>
                    {steps.map((step, index) => {
                        const completed = currentStep >= index;
                        const available = next?.status === step.status && canAdvance;
                        return (
                            <Stack key={step.status} direction="row" spacing={1.5} useFlexGap alignItems="flex-start" sx={{ position: "relative", pb: index < steps.length - 1 ? 3 : 0, flexWrap: "wrap", rowGap: 1 }}>
                                {index < steps.length - 1 && <Box aria-hidden="true" sx={{ position: "absolute", left: 16, top: 34, bottom: 0, width: 2, bgcolor: currentStep > index ? "primary.main" : "divider" }} />}
                                <Box sx={{ width: 34, height: 34, flexShrink: 0, borderRadius: "50%", display: "grid", placeItems: "center", bgcolor: completed ? "primary.main" : "action.hover", color: completed ? "primary.contrastText" : "text.secondary", fontWeight: 700, position: "relative" }}>
                                    {index + 1}
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography fontWeight={700}>{step.title}</Typography>
                                    <Typography variant="body2" color="text.secondary">{step.description}</Typography>
                                </Box>
                                {index > 0 && <Button size="small" variant={available ? "contained" : "outlined"} disabled={!available || transition.isPending} onClick={() => { if (next) { transition.reset(); setSelected(next); } }}>{completed ? "Đã hoàn thành" : actions[steps[index - 1].status].label}</Button>}
                            </Stack>
                        );
                    })}
                    </Stack>
                    {canCancel && <Button color="error" variant="outlined" sx={{ alignSelf: "flex-end" }} onClick={() => { transition.reset(); setSelected({ status: "cancelled", label: "Hủy đơn" }); }}>Hủy đơn</Button>}
                </Stack>
            </Paper>
            <OrderHistoryPanel
                id={id}
                currentStatus={order.status}
                management
            />
            </Stack>
            </Box>
            <Dialog
                open={!!selected}
                onClose={() => {
                    if (!transition.isPending) setSelected(null);
                }}
            >
                <DialogTitle>{selected?.label}?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {selected?.status === "cancelled"
                            ? "Đơn sẽ được hoàn kho sau khi xác nhận hủy. Với payOS, hệ thống kiểm tra kết quả từ cổng thanh toán."
                            : selected?.status === "delivered" &&
                                order.paymentMethod === "cod"
                              ? "Xác nhận đã giao hàng và đã thu tiền COD."
                              : "Xác nhận chuyển đơn sang bước xử lý tiếp theo."}
                    </DialogContentText>
                    {transition.isError && (
                        <ErrorState error={transition.error} />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button
                        disabled={transition.isPending}
                        onClick={() => setSelected(null)}
                    >
                        Quay lại
                    </Button>
                    <Button
                        disabled={transition.isPending}
                        onClick={() => {
                            if (selected) transition.mutate(selected.status);
                        }}
                    >
                        Xác nhận
                    </Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
}
