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
import OpenInNewRounded from "@mui/icons-material/OpenInNewRounded";
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
    const checkoutUrl = payment?.checkoutUrl;
    const paymentLink = checkoutUrl?.startsWith("https://pay.payos.vn/")
        ? checkoutUrl
        : null;
    return (
        <Stack spacing={3} sx={{ width: "100%", maxWidth: 760, mx: "auto" }}>
            <Box>
                <Typography variant="h1">Thanh toán đơn hàng</Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                    Mã đơn {order.code} ·{" "}
                    {order.paymentMethod === "qr"
                        ? "Chuyển khoản qua VietQR"
                        : "Thanh toán khi nhận hàng"}
                </Typography>
            </Box>
            <Paper variant="outlined" sx={{ p: { xs: 2, sm: 4 } }}>
                <Stack spacing={3}>
                    <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        gap={2}
                    >
                        <Typography variant="h2" sx={{ minWidth: 0 }}>
                            {status === "paid"
                                ? "Thanh toán thành công"
                                : order.paymentMethod === "cod"
                                  ? "Thanh toán khi nhận hàng"
                                  : status === "review"
                                    ? "Thanh toán cần được kiểm tra"
                                    : terminal
                                      ? "Phiên thanh toán đã kết thúc"
                                      : "Thanh toán qua VietQR"}
                        </Typography>
                        <Chip
                            label={paymentLabels[status] ?? status}
                            color={status === "paid" ? "success" : "warning"}
                            variant="outlined"
                            sx={{ flexShrink: 0 }}
                        />
                    </Stack>
                    {status === "paid" && (
                        <CheckCircleOutlineRounded
                            color="success"
                            sx={{ fontSize: 80, alignSelf: "center" }}
                        />
                    )}
                    <Typography
                        variant="h2"
                        component="p"
                        color="primary.main"
                        textAlign="center"
                    >
                        {money(order.total)}
                    </Typography>
                    {order.paymentExpiresAt && !terminal && (
                        <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            justifyContent="center"
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
                            {!expired && (
                                <>
                                    <Alert severity="info">
                                        Quét mã QR bằng ứng dụng ngân hàng hoặc
                                        chuyển khoản đúng nội dung bên dưới.
                                        Trạng thái sẽ tự cập nhật sau khi hệ
                                        thống xác nhận thanh toán.
                                    </Alert>
                                    <Box
                                        sx={{
                                            display: "grid",
                                            width: "100%",
                                            maxWidth: 600,
                                            alignSelf: "center",
                                            gridTemplateColumns: {
                                                xs: "minmax(0, 1fr)",
                                                sm: "repeat(2, minmax(0, 1fr))",
                                            },
                                            gap: { xs: 3, sm: 4 },
                                            alignItems: "center",
                                        }}
                                    >
                                        <Stack
                                            spacing={2}
                                            alignItems="center"
                                            sx={{ minWidth: 0 }}
                                        >
                                            {payment?.qrCode ? (
                                                <Box
                                                    sx={{
                                                        bgcolor: "white",
                                                        maxWidth: "100%",
                                                        lineHeight: 0,
                                                    }}
                                                >
                                                    <QRCodeSVG
                                                        value={payment.qrCode}
                                                        size={256}
                                                        marginSize={4}
                                                        role="img"
                                                        aria-label="Mã QR thanh toán VietQR"
                                                        style={{
                                                            maxWidth: "100%",
                                                            height: "auto",
                                                        }}
                                                    />
                                                </Box>
                                            ) : paymentLink ? (
                                                <Alert severity="warning">
                                                    Chưa thể hiển thị mã QR. Mở
                                                    trang thanh toán để tiếp
                                                    tục.
                                                </Alert>
                                            ) : (
                                                !paymentQuery.isPending && (
                                                    <>
                                                        {initialError &&
                                                            !action.isSuccess && (
                                                                <Alert severity="warning">
                                                                    {
                                                                        initialError
                                                                    }
                                                                </Alert>
                                                            )}
                                                        <Button
                                                            variant="contained"
                                                            disabled={
                                                                action.isPending ||
                                                                status ===
                                                                    "creating"
                                                            }
                                                            onClick={() =>
                                                                action.mutate(
                                                                    "create",
                                                                )
                                                            }
                                                        >
                                                            {status ===
                                                            "creating"
                                                                ? "Đang tạo mã QR"
                                                                : "Thử lại tạo mã QR"}
                                                        </Button>
                                                    </>
                                                )
                                            )}
                                            {paymentLink && (
                                                <Button
                                                    component="a"
                                                    href={paymentLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    variant="outlined"
                                                    endIcon={
                                                        <OpenInNewRounded />
                                                    }
                                                >
                                                    Mở trang thanh toán
                                                </Button>
                                            )}
                                        </Stack>
                                        <Stack
                                            spacing={2}
                                            alignItems="center"
                                            sx={{
                                                minWidth: 0,
                                                textAlign: "center",
                                                overflowWrap: "anywhere",
                                            }}
                                        >
                                            <Typography
                                                variant="h3"
                                                component="h2"
                                            >
                                                Thông tin thanh toán
                                            </Typography>
                                            {[
                                                [
                                                    "Số tài khoản",
                                                    payment?.accountNumber,
                                                ],
                                                [
                                                    "Chủ tài khoản",
                                                    payment?.accountName,
                                                ],
                                                [
                                                    "Mã ngân hàng (BIN)",
                                                    payment?.bankBin,
                                                ],
                                                [
                                                    "Nội dung chuyển khoản",
                                                    payment?.transferContent,
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
                                            {paymentQuery.isPending && (
                                                <LoadingState />
                                            )}
                                            {!paymentQuery.isPending &&
                                                !payment?.accountNumber && (
                                                    <Typography color="text.secondary">
                                                        Chưa có thông tin tài
                                                        khoản nhận tiền.
                                                    </Typography>
                                                )}
                                        </Stack>
                                    </Box>
                                </>
                            )}
                            {expired && (
                                <Alert severity="warning">
                                    Đã hết thời gian thanh toán. Tải lại trang
                                    để xem trạng thái mới nhất hoặc hủy đơn để
                                    hệ thống xác nhận kết quả thanh toán.
                                </Alert>
                            )}
                        </>
                    )}
                    {status === "review" && (
                        <Alert severity="warning">
                            Giao dịch cần đối soát. Vui lòng liên hệ cửa hàng và
                            cung cấp mã đơn; không chuyển khoản thêm.
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
                    {!terminal && order.paymentMethod === "qr" && (
                        <Button
                            color="error"
                            disabled={action.isPending}
                            onClick={() => action.mutate("cancel")}
                            sx={{ alignSelf: "center" }}
                        >
                            Hủy đơn hàng
                        </Button>
                    )}
                    {status === "paid" && (
                        <Button
                            component={Link}
                            to={`/orders/${id}/success`}
                            variant="contained"
                            sx={{ alignSelf: "center" }}
                        >
                            Xem xác nhận đơn hàng
                        </Button>
                    )}
                    <Divider />
                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        gap={1}
                        justifyContent="space-between"
                    >
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
                </Stack>
            </Paper>
        </Stack>
    );
}
