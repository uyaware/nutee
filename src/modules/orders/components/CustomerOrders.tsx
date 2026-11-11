import { useState } from "react";
import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    Pagination,
    Paper,
    Stack,
    Step,
    StepLabel,
    Stepper,
    Tab,
    Tabs,
    TextField,
    Typography,
} from "@mui/material";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { services } from "@/app/services";
import { useSession } from "@/modules/auth/hooks/useSession";
import { useOrder } from "@/modules/orders/hooks/useOrder";
import { orderProducts, paymentLabels } from "@/modules/orders/model/api";
import {
    OrderProducts,
    OrderTotals,
} from "@/modules/checkout/components/CheckoutSummary";
import {
    EmptyState,
    ErrorState,
    LoadingState,
} from "@/shared/components/Feedback";
import { dateTime, money } from "@/shared/lib/format";
import { errorMessage } from "@/shared/lib/errors";
import { OrderHistoryPanel } from "@/modules/orders/components/OrderHistoryPanel";

const statuses = [
    ["all", "Tất cả"],
    ["pending", "Chờ xác nhận"],
    ["confirmed", "Đã xác nhận"],
    ["packing", "Đóng gói"],
    ["shipping", "Đang giao"],
    ["delivered", "Đã giao"],
    ["cancelled", "Đã hủy"],
];
const statusLabel = (status: string) =>
    statuses.find((row) => row[0] === status)?.[1] ?? status;

export function CustomerOrderHistory({
    compact = false,
}: {
    compact?: boolean;
}) {
    const session = useSession("customer");
    const [params, setParams] = useSearchParams();
    const status = compact ? "all" : (params.get("status") ?? "all");
    const search = compact ? "" : (params.get("q") ?? "");
    const page = compact ? 0 : Math.max(0, Number(params.get("page")) || 0);
    const query = useQuery({
        queryKey: [
            "customer",
            session.data?.id,
            "orders",
            { page, status, search },
        ],
        queryFn: () => services.orders.list(page, status, search),
        enabled: !!session.data,
        retry: false,
    });
    const update = (key: string, value: string) => {
        const next = new URLSearchParams(params);
        next.delete("page");
        if (value && value !== "all") next.set(key, value);
        else next.delete(key);
        setParams(next, { replace: true });
    };
    return (
        <Stack spacing={3}>
            <Box>
                <Typography
                    variant={compact ? "h3" : "h1"}
                    component={compact ? "h2" : "h1"}
                >
                    {compact ? "Đơn hàng gần đây" : "Đơn hàng của bạn"}
                </Typography>
                {!compact && (
                    <Typography color="text.secondary" sx={{ mt: 1 }}>
                        Theo dõi thông tin và trạng thái đơn hàng.
                    </Typography>
                )}
            </Box>
            {!compact && (
                <>
                    <Paper variant="outlined" sx={{ minWidth: 0 }}>
                        <Tabs
                            value={
                                statuses.some((row) => row[0] === status)
                                    ? status
                                    : "all"
                            }
                            onChange={(_, value: string) =>
                                update("status", value)
                            }
                            variant="scrollable"
                            scrollButtons="auto"
                            aria-label="Lọc trạng thái đơn hàng"
                        >
                            {statuses.map(([value, label]) => (
                                <Tab
                                    key={value}
                                    value={value}
                                    label={label}
                                    sx={{ minHeight: 52 }}
                                />
                            ))}
                        </Tabs>
                    </Paper>
                    <TextField
                        type="search"
                        label="Tìm theo mã đơn"
                        value={search}
                        onChange={(event) => update("q", event.target.value)}
                        placeholder="Nhập mã đơn hàng"
                        sx={{ maxWidth: 440 }}
                    />
                </>
            )}
            {query.isPending ? (
                <LoadingState />
            ) : query.isError ? (
                <ErrorState
                    error={query.error}
                    retry={() => void query.refetch()}
                />
            ) : !query.data.content.length ? (
                <Paper variant="outlined">
                    <EmptyState
                        title="Chưa có đơn trong mục này"
                        description="Chọn trạng thái khác hoặc xóa từ khóa để xem đơn hàng."
                    />
                    <Button onClick={() => setParams({})} sx={{ m: 2 }}>
                        Xem tất cả đơn hàng
                    </Button>
                </Paper>
            ) : (
                query.data.content
                    .slice(0, compact ? 5 : undefined)
                    .map((order) => (
                        <Paper
                            key={order.id}
                            component="article"
                            variant="outlined"
                            sx={{ overflow: "hidden" }}
                        >
                            <Stack
                                direction={{ xs: "column", sm: "row" }}
                                gap={1.5}
                                justifyContent="space-between"
                                alignItems={{ xs: "flex-start", sm: "center" }}
                                sx={{
                                    p: 2,
                                    bgcolor: "background.default",
                                    borderBottom: "1px solid",
                                    borderColor: "divider",
                                }}
                            >
                                <Box>
                                    <Typography fontWeight={600}>
                                        {order.code}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                    >
                                        {dateTime(order.createdAt)}
                                    </Typography>
                                </Box>
                                <Chip
                                    label={statusLabel(order.status)}
                                    variant="outlined"
                                    size="small"
                                />
                            </Stack>
                            <Stack spacing={2.5} sx={{ p: { xs: 2, sm: 3 } }}>
                                {!compact && (
                                    <OrderProducts
                                        items={orderProducts(order)}
                                    />
                                )}
                                <Stack
                                    direction={{ xs: "column", sm: "row" }}
                                    justifyContent="space-between"
                                    gap={2}
                                    alignItems={{ sm: "center" }}
                                >
                                    <Box>
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                        >
                                            {order.paymentMethod === "cod"
                                                ? "Thanh toán khi nhận hàng"
                                                : "Thanh toán bằng QR"}{" "}
                                            ·{" "}
                                            {paymentLabels[
                                                order.paymentStatus
                                            ] ?? order.paymentStatus}
                                        </Typography>
                                        <Typography fontWeight={600}>
                                            Tổng tiền: {money(order.total)}
                                        </Typography>
                                    </Box>
                                    <Stack
                                        direction="row"
                                        gap={1}
                                        flexWrap="wrap"
                                    >
                                        <Button
                                            component={Link}
                                            to={`/account/orders/${order.id}`}
                                            variant="outlined"
                                            aria-label={`Xem chi tiết đơn ${order.code}`}
                                        >
                                            Xem chi tiết
                                        </Button>
                                        {order.paymentMethod === "qr" &&
                                            order.paymentStatus !== "paid" &&
                                            order.status !== "cancelled" && (
                                                <Button
                                                    component={Link}
                                                    to={`/orders/${order.id}/payment`}
                                                    variant="contained"
                                                >
                                                    Thanh toán
                                                </Button>
                                            )}
                                    </Stack>
                                </Stack>
                            </Stack>
                        </Paper>
                    ))
            )}
            {!compact &&
                !!query.data &&
                query.data.totalElements > query.data.size && (
                    <Pagination
                        page={page + 1}
                        count={Math.ceil(
                            query.data.totalElements / query.data.size,
                        )}
                        onChange={(_, value) =>
                            update("page", String(value - 1))
                        }
                    />
                )}
            {compact && (
                <Button
                    component={Link}
                    to="/account/orders"
                    sx={{ alignSelf: "flex-start" }}
                >
                    Xem tất cả đơn hàng
                </Button>
            )}
        </Stack>
    );
}

export function CustomerOrderDetail() {
    const id = Number(useParams().id);
    const query = useOrder(id);
    const session = useSession("customer");
    const cache = useQueryClient();
    const [cancelOpen, setCancelOpen] = useState(false);
    const cancel = useMutation({
        mutationFn: () => services.orders.cancel(id),
        onSuccess: () => {
            setCancelOpen(false);
            void cache.invalidateQueries({
                queryKey: ["customer", session.data?.id],
            });
        },
    });
    if (!Number.isSafeInteger(id) || id < 1)
        return (
            <EmptyState
                title="Không tìm thấy đơn hàng"
                description="Kiểm tra mã đơn trong lịch sử mua hàng."
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
    const steps = statuses.slice(1, -1);
    return (
        <Stack spacing={3}>
            <Button
                component={Link}
                to="/account/orders"
                startIcon={<ArrowBackRounded />}
                sx={{ alignSelf: "flex-start" }}
            >
                Về danh sách đơn hàng
            </Button>
            <Stack direction="row" gap={2} alignItems="center">
                <Typography variant="h1">Đơn hàng {order.code}</Typography>
                <Chip label={statusLabel(order.status)} variant="outlined" />
            </Stack>
            <Typography color="text.secondary">
                Đặt lúc {dateTime(order.createdAt)}
            </Typography>
            {order.status !== "cancelled" && (
                <Stepper
                    activeStep={steps.findIndex(
                        (row) => row[0] === order.status,
                    )}
                    alternativeLabel
                >
                    {steps.map(([status, label]) => (
                        <Step key={status}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>
            )}
            <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
                <Stack spacing={3}>
                    <Typography variant="h2">Thông tin nhận hàng</Typography>
                    <Typography>
                        {order.recipient} · {order.phone}
                    </Typography>
                    <Typography color="text.secondary">
                        {order.addressLine}
                    </Typography>
                    {order.note && (
                        <Typography>Ghi chú: {order.note}</Typography>
                    )}
                    <Divider />
                    <OrderProducts items={orderProducts(order)} />
                    <Divider />
                    <OrderTotals quote={order} />
                    <Typography>
                        {order.paymentMethod === "cod"
                            ? "Thanh toán khi nhận hàng"
                            : "Chuyển khoản qua payOS"}{" "}
                        ·{" "}
                        {paymentLabels[order.paymentStatus] ??
                            order.paymentStatus}
                    </Typography>
                    {order.paymentStatus === "review" && (
                        <Alert severity="warning">
                            Thanh toán cần đối soát. Liên hệ cửa hàng và cung
                            cấp mã đơn; không chuyển khoản thêm.
                        </Alert>
                    )}
                    <Stack direction="row" gap={2} flexWrap="wrap">
                        {order.paymentMethod === "qr" &&
                            order.paymentStatus !== "paid" && (
                                <Button
                                    component={Link}
                                    to={`/orders/${id}/payment`}
                                    variant="contained"
                                >
                                    Kiểm tra thanh toán
                                </Button>
                            )}
                        {order.status === "pending" &&
                            !["paid", "review"].includes(
                                order.paymentStatus,
                            ) && (
                                <Button
                                    color="error"
                                    variant="outlined"
                                    onClick={() => setCancelOpen(true)}
                                >
                                    Hủy đơn hàng
                                </Button>
                            )}
                    </Stack>
                </Stack>
            </Paper>
            <OrderHistoryPanel id={id} currentStatus={order.status} />
            <Dialog
                open={cancelOpen}
                onClose={() => {
                    if (!cancel.isPending) setCancelOpen(false);
                }}
            >
                <DialogTitle>Hủy đơn hàng?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Với đơn QR, hệ thống cần xác nhận kết quả từ payOS trước
                        khi hoàn kho. Trạng thái đơn sẽ hiển thị kết quả thực
                        tế.
                    </DialogContentText>
                    {cancel.isError && (
                        <Alert severity="error">
                            {errorMessage(cancel.error)}
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button
                        disabled={cancel.isPending}
                        onClick={() => setCancelOpen(false)}
                    >
                        Giữ đơn
                    </Button>
                    <Button
                        color="error"
                        disabled={cancel.isPending}
                        onClick={() => cancel.mutate()}
                    >
                        Xác nhận hủy
                    </Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
}
