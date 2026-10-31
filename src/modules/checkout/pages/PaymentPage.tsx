import {
    Alert,
    Box,
    Button,
    Chip,
    Divider,
    Paper,
    Stack,
    Typography,
} from "@mui/material";
import CheckCircleOutlineRounded from "@mui/icons-material/CheckCircleOutlineRounded";
import TimerOutlined from "@mui/icons-material/TimerOutlined";
import { QRCodeSVG } from "qrcode.react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { services } from "@/app/services";
import { useSession } from "@/modules/auth/hooks/useSession";
import { useOrder } from "@/modules/orders/hooks/useOrder";
import { paymentLabels } from "@/modules/orders/model/api";
import { money } from "@/shared/lib/format";
import { errorMessage } from "@/shared/lib/errors";
import {
    EmptyState,
    ErrorState,
    LoadingState,
} from "@/shared/components/Feedback";
import { OrderTotals } from "@/modules/checkout/components/CheckoutSummary";

export default function PaymentPage() {
    const id = Number(useParams().id);
    return <PaymentPanel id={id} />;
}

export function PaymentPanel({
    id,
    initialError,
}: {
    id: number;
    initialError?: string | null;
}) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, []);
    const [params] = useSearchParams();
    const returnedFromPayOS = params.has("orderCode") && params.has("id");
    const checkedReturn = useRef<number | null>(null);
    const session = useSession("customer");
    const orderQuery = useOrder(id);
    const cache = useQueryClient();
    const key = ["customer", session.data?.id, "payments", id];
    const paymentQuery = useQuery({
        queryKey: key,
        queryFn: () => services.orders.payment(id),
        enabled: orderQuery.data?.paymentMethod === "qr",
        retry: false,
        refetchInterval: (query) =>
            ["paid", "cancelled", "expired"].includes(
                query.state.data?.status ?? "",
            )
                ? false
                : 5000,
    });
    const action = useMutation({
        mutationFn: async (kind: "create" | "refresh" | "cancel") => {
            if (kind === "cancel") {
                await services.orders.cancel(id);
                return services.orders.payment(id);
            }
            return kind === "create"
                ? services.orders.pay(id)
                : services.orders.refresh(id);
        },
        onSuccess: (payment) => {
            cache.setQueryData(key, payment);
            void cache.invalidateQueries({
                queryKey: ["customer", session.data?.id, "orders"],
            });
        },
    });
    const refreshPayment = action.mutate;
    useEffect(() => {
        if (
            returnedFromPayOS &&
            orderQuery.data?.paymentMethod === "qr" &&
            orderQuery.data.paymentStatus !== "paid" &&
            paymentQuery.data &&
            checkedReturn.current !== id
        ) {
            // Redirect parameters only trigger verification; the server determines payment status.
            checkedReturn.current = id;
            refreshPayment("refresh");
        }
    }, [
        returnedFromPayOS,
        id,
        orderQuery.data,
        paymentQuery.data,
        refreshPayment,
    ]);

    if (!Number.isSafeInteger(id) || id < 1)
        return (
            <EmptyState
                title="Không tìm thấy đơn hàng"
                description="Kiểm tra mã đơn trong lịch sử mua hàng."
            />
        );
    if (orderQuery.isPending) return <LoadingState />;
    if (orderQuery.isError)
        return (
            <ErrorState
                error={orderQuery.error}
                retry={() => void orderQuery.refetch()}
            />
        );
    const order = orderQuery.data;
    const payment = paymentQuery.data;
    const observed = [order.paymentStatus, payment?.status];
    const status = observed.includes("paid")
        ? "paid"
        : observed.includes("review")
          ? "review"
          : order.status === "cancelled"
            ? payment?.status === "expired"
                ? "expired"
                : "cancelled"
            : (payment?.status ?? order.paymentStatus);
    const terminal =
        ["paid", "cancelled", "expired", "review"].includes(status) ||
        order.status === "cancelled";
    const expired =
        !!order.paymentExpiresAt && Date.parse(order.paymentExpiresAt) <= now;
    return (
        <Stack spacing={3} sx={{ maxWidth: 1000, mx: "auto" }}>
            <Box>
                <Typography variant="h1">Thanh toán đơn hàng</Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                    Mã đơn {order.code} ·{" "}
                    {order.paymentMethod === "qr"
                        ? "Chuyển khoản qua payOS"
                        : "Thanh toán khi nhận hàng"}
                </Typography>
            </Box>
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: {
                        xs: "minmax(0, 1fr)",
                        md: "minmax(0, 1fr) 340px",
                    },
                    gap: 3,
                    alignItems: "start",
                }}
            >
                <Paper variant="outlined" sx={{ p: { xs: 2, sm: 4 } }}>
                    <Stack spacing={3} alignItems="center" textAlign="center">
                        <Chip
                            label={paymentLabels[status] ?? status}
                            color={status === "paid" ? "success" : "warning"}
                            variant="outlined"
                        />
                        {status === "paid" && (
                            <CheckCircleOutlineRounded
                                color="success"
                                sx={{ fontSize: 80 }}
                            />
                        )}
                        <Typography variant="h2">
                            {status === "paid"
                                ? "Thanh toán thành công"
                                : order.paymentMethod === "cod"
                                  ? "Thanh toán khi nhận hàng"
                                  : status === "review"
                                    ? "Thanh toán cần được kiểm tra"
                                    : terminal
                                      ? "Phiên thanh toán đã kết thúc"
                                      : "Thanh toán an toàn qua payOS"}
                        </Typography>
                        <Typography
                            variant="h2"
                            component="p"
                            color="primary.main"
                        >
                            {money(order.total)}
                        </Typography>
                        {order.paymentExpiresAt && (
                            <Stack
                                direction="row"
                                spacing={1}
                                alignItems="center"
                            >
                                <TimerOutlined color="warning" />
                                <Typography>
                                    Hạn thanh toán:{" "}
                                    {new Date(
                                        order.paymentExpiresAt,
                                    ).toLocaleString("vi-VN")}
                                </Typography>
                            </Stack>
                        )}
                        {order.paymentMethod === "qr" && !terminal && (
                            <>
                                <Typography color="text.secondary">
                                    Quét mã QR bằng ứng dụng ngân hàng để thanh
                                    toán. Trạng thái sẽ cập nhật sau khi hệ
                                    thống xác nhận.
                                </Typography>
                                {payment?.qrCode && !expired ? (
                                    <Box
                                        sx={{
                                            bgcolor: "white",
                                            p: 2,
                                            maxWidth: "100%",
                                        }}
                                    >
                                        <QRCodeSVG
                                            value={payment.qrCode}
                                            size={256}
                                            marginSize={4}
                                            role="img"
                                            aria-label="Mã QR thanh toán payOS"
                                            style={{
                                                maxWidth: "100%",
                                                height: "auto",
                                            }}
                                        />
                                    </Box>
                                ) : !expired && payment?.checkoutUrl ? (
                                    <Alert severity="warning">
                                        Chưa thể lấy lại mã QR của phiên thanh
                                        toán này. Vui lòng liên hệ cửa hàng và
                                        cung cấp mã đơn.
                                    </Alert>
                                ) : (
                                    !expired &&
                                    !paymentQuery.isPending && (
                                        <>
                                            {initialError &&
                                                !action.isSuccess && (
                                                    <Alert severity="warning">
                                                        {initialError}
                                                    </Alert>
                                                )}
                                            <Button
                                                variant="contained"
                                                disabled={
                                                    action.isPending ||
                                                    status === "creating"
                                                }
                                                onClick={() =>
                                                    action.mutate("create")
                                                }
                                            >
                                                {status === "creating"
                                                    ? "Đang tạo mã QR"
                                                    : "Thử lại tạo mã QR"}
                                            </Button>
                                        </>
                                    )
                                )}
                                {expired && (
                                    <Alert severity="warning">
                                        Đã hết thời gian thanh toán. Kiểm tra
                                        trạng thái hoặc hủy đơn để hệ thống xác
                                        nhận kết quả và giải phóng sản phẩm chưa
                                        thanh toán.
                                    </Alert>
                                )}
                                {!expired &&
                                    payment?.accountNumber &&
                                    payment.accountName &&
                                    payment.transferContent && (
                                        <Stack
                                            spacing={1.5}
                                            sx={{ overflowWrap: "anywhere" }}
                                        >
                                            <Typography
                                                variant="h3"
                                                component="h2"
                                            >
                                                Thông tin chuyển khoản
                                            </Typography>
                                            {[
                                                [
                                                    "Số tài khoản",
                                                    payment.accountNumber,
                                                ],
                                                [
                                                    "Chủ tài khoản",
                                                    payment.accountName,
                                                ],
                                                [
                                                    "Mã ngân hàng (BIN)",
                                                    payment.bankBin,
                                                ],
                                                [
                                                    "Số tiền",
                                                    money(payment.amount),
                                                ],
                                                [
                                                    "Nội dung chuyển khoản",
                                                    payment.transferContent,
                                                ],
                                            ]
                                                .filter(([, value]) => value)
                                                .map(([label, value]) => (
                                                    <Box key={label}>
                                                        <Typography
                                                            variant="body2"
                                                            color="text.secondary"
                                                        >
                                                            {label}
                                                        </Typography>
                                                        <Typography
                                                            fontWeight={600}
                                                            sx={{
                                                                userSelect:
                                                                    "all",
                                                            }}
                                                        >
                                                            {value}
                                                        </Typography>
                                                    </Box>
                                                ))}
                                            <Alert severity="info">
                                                Chuyển đúng số tiền và giữ
                                                nguyên nội dung chuyển khoản để
                                                hệ thống xác nhận đơn hàng.
                                            </Alert>
                                        </Stack>
                                    )}
                            </>
                        )}
                        {status === "review" && (
                            <Alert severity="warning">
                                Giao dịch cần đối soát. Vui lòng liên hệ cửa
                                hàng và cung cấp mã đơn; không chuyển khoản
                                thêm.
                            </Alert>
                        )}
                        {paymentQuery.isError && (
                            <ErrorState
                                error={paymentQuery.error}
                                retry={() => void paymentQuery.refetch()}
                            />
                        )}
                        {action.isError && (
                            <Alert severity="error">
                                {errorMessage(action.error)}
                            </Alert>
                        )}
                        {order.paymentMethod === "qr" &&
                            status !== "paid" &&
                            (payment?.checkoutUrl ||
                                [
                                    "creating",
                                    "error",
                                    "review",
                                    "expired",
                                ].includes(payment?.status ?? "")) && (
                                <Button
                                    disabled={action.isPending}
                                    variant="outlined"
                                    onClick={() => action.mutate("refresh")}
                                >
                                    Kiểm tra thanh toán với payOS
                                </Button>
                            )}
                        {!terminal && order.paymentMethod === "qr" && (
                            <Button
                                color="error"
                                disabled={action.isPending}
                                onClick={() => action.mutate("cancel")}
                            >
                                Hủy đơn hàng
                            </Button>
                        )}
                        {status === "paid" && (
                            <Button
                                component={Link}
                                to={`/orders/${id}/success`}
                                variant="contained"
                            >
                                Xem xác nhận đơn hàng
                            </Button>
                        )}
                        <Divider flexItem />
                        <Typography variant="body2" color="text.secondary">
                            Trạng thái được xác nhận bởi hệ thống thanh toán.
                        </Typography>
                    </Stack>
                </Paper>
                <Paper variant="outlined" sx={{ p: 3 }}>
                    <Stack spacing={3}>
                        <Typography variant="h3" component="h2">
                            Thông tin thanh toán
                        </Typography>
                        <Typography>
                            {order.items.length} sản phẩm · {order.recipient}
                        </Typography>
                        <OrderTotals quote={order} />
                        <Button
                            component={Link}
                            to={`/account/orders/${id}`}
                            variant="outlined"
                        >
                            Xem chi tiết đơn hàng
                        </Button>
                        <Button component={Link} to="/account/orders">
                            Về lịch sử đơn hàng
                        </Button>
                    </Stack>
                </Paper>
            </Box>
        </Stack>
    );
}
