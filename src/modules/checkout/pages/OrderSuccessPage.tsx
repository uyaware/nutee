import { Alert, Box, Button, Paper, Stack, Typography } from "@mui/material";
import CheckCircleOutlineRounded from "@mui/icons-material/CheckCircleOutlineRounded";
import { Link, useParams } from "react-router-dom";
import { useOrder } from "@/modules/orders/hooks/useOrder";
import { orderProducts, paymentLabels } from "@/modules/orders/model/api";
import {
    EmptyState,
    ErrorState,
    LoadingState,
} from "@/shared/components/Feedback";
import {
    OrderProducts,
    OrderTotals,
} from "@/modules/checkout/components/CheckoutSummary";

export default function OrderSuccessPage() {
    const id = Number(useParams().id);
    const query = useOrder(id);
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
    const paid = order.paymentStatus === "paid";
    const accepted =
        order.status !== "cancelled" && (paid || order.paymentMethod === "cod");
    return (
        <Paper
            variant="outlined"
            sx={{ maxWidth: 760, mx: "auto", p: { xs: 2.5, sm: 5 } }}
        >
            <Stack spacing={3}>
                <Stack spacing={2} alignItems="center" textAlign="center">
                    {accepted && (
                        <CheckCircleOutlineRounded
                            color="success"
                            sx={{ fontSize: 72 }}
                        />
                    )}
                    <Typography variant="h1">
                        {accepted
                            ? "Đặt hàng thành công!"
                            : "Trạng thái đơn hàng"}
                    </Typography>
                    <Typography color="text.secondary">
                        {accepted
                            ? "Cảm ơn bạn đã chọn NUTEE. Bạn có thể theo dõi đơn trong lịch sử mua hàng."
                            : "Kiểm tra trạng thái thanh toán trước khi tiếp tục."}
                    </Typography>
                    <Typography fontWeight={600}>
                        Mã đơn: {order.code}
                    </Typography>
                </Stack>
                <Alert severity={accepted ? "success" : "warning"}>
                    {order.status === "cancelled"
                        ? "Đơn đã hủy."
                        : paid
                          ? "Hệ thống đã xác nhận thanh toán."
                          : order.paymentMethod === "cod"
                            ? "Thanh toán khi nhận hàng. Cửa hàng sẽ xác nhận thời gian giao hàng."
                            : (paymentLabels[order.paymentStatus] ??
                              order.paymentStatus)}
                </Alert>
                <Box>
                    <Typography variant="h3" component="h2" sx={{ mb: 1 }}>
                        Địa chỉ nhận hàng
                    </Typography>
                    <Typography>
                        {order.recipient} · {order.phone}
                    </Typography>
                    <Typography color="text.secondary">
                        {order.addressLine}
                    </Typography>
                </Box>
                <OrderProducts items={orderProducts(order)} />
                <OrderTotals quote={order} />
                {!paid &&
                    order.paymentMethod === "qr" &&
                    order.status !== "cancelled" && (
                        <Button
                            component={Link}
                            to={`/orders/${id}/payment`}
                            variant="contained"
                        >
                            Kiểm tra thanh toán
                        </Button>
                    )}
                <Stack direction={{ xs: "column", sm: "row" }} gap={1.5}>
                    <Button
                        component={Link}
                        to={`/account/orders/${id}`}
                        variant="contained"
                        fullWidth
                    >
                        Theo dõi đơn hàng
                    </Button>
                    <Button
                        component={Link}
                        to="/products"
                        variant="outlined"
                        fullWidth
                    >
                        Tiếp tục mua sắm
                    </Button>
                </Stack>
            </Stack>
        </Paper>
    );
}
