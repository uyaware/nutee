import { useState } from "react";
import {
    Alert,
    Pagination,
    Button,
    MenuItem,
    Paper,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { services } from "@/app/services";
import { useSession } from "@/modules/auth/hooks/useSession";
import { useOrder } from "@/modules/orders/hooks/useOrder";
import { orderProducts } from "@/modules/orders/model/api";
import { errorMessage } from "@/shared/lib/errors";
import {
    afterSaleTypes,
    type AfterSaleRequest,
} from "@/modules/after-sales/model/types";
import { dateTime } from "@/shared/lib/format";
import {
    EmptyState,
    ErrorState,
    LoadingState,
} from "@/shared/components/Feedback";
import { OrderProducts } from "@/modules/checkout/components/CheckoutSummary";

export default function AfterSaleCreatePage() {
    const [params, setParams] = useSearchParams();
    const navigate = useNavigate();
    const [type, setType] = useState<AfterSaleRequest["type"]>("warranty");
    const [reason, setReason] = useState("");
    const [page, setPage] = useState(0);
    const client = useQueryClient();
    const session = useSession("customer");
    const orders = useQuery({
        queryKey: ["customer", session.data?.id, "orders", "after-sales", page],
        queryFn: () => services.orders.list(page, "delivered"),
        enabled: !!session.data,
        retry: false,
    });
    const selected = useOrder(Number(params.get("orderId")));
    const eligible = orders.data?.content ?? [];
    const order = params.has("orderId") ? selected.data : eligible[0];
    const item = params.has("itemId")
        ? order?.items.find(
              (entry) => String(entry.id) === params.get("itemId"),
          )
        : order?.items[0];
    const create = useMutation({
        mutationFn: () =>
            services.afterSales.create({
                orderItemId: item!.id,
                type,
                reason: reason.trim(),
            }),
        onSuccess: async (request) => {
            await client.invalidateQueries({
                queryKey: ["customer", session.data?.id, "after-sales"],
            });
            navigate(`/account/after-sales/${request.id}`);
        },
    });
    if (
        orders.isPending ||
        (params.has("orderId") &&
            selected.isPending &&
            Number.isSafeInteger(Number(params.get("orderId"))) &&
            Number(params.get("orderId")) > 0)
    )
        return <LoadingState />;
    if (orders.isError)
        return (
            <ErrorState
                error={orders.error}
                retry={() => void orders.refetch()}
            />
        );
    if (params.has("orderId") && selected.isError)
        return (
            <ErrorState
                error={selected.error}
                retry={() => void selected.refetch()}
            />
        );
    if (!order || !item || order.status !== "delivered")
        return (
            <Stack spacing={2}>
                <EmptyState
                    title="Chọn sản phẩm từ đơn đã giao"
                    description="Chọn sản phẩm thuộc đơn hàng đã giao để gửi yêu cầu hỗ trợ."
                />
                <Button component={Link} to="/account/orders?status=delivered">
                    Xem đơn đã giao
                </Button>
                <Button component={Link} to="/account/after-sales/new">
                    Tạo yêu cầu
                </Button>
            </Stack>
        );
    return (
        <Stack spacing={3} sx={{ maxWidth: 800 }}>
            <Button
                component={Link}
                to="/account/after-sales"
                startIcon={<ArrowBackRounded />}
                sx={{ alignSelf: "flex-start" }}
            >
                Quay lại hậu mãi
            </Button>
            <Typography variant="h1">Tạo yêu cầu bảo hành / đổi trả</Typography>
            {(orders.data?.totalElements ?? 0) > 20 && (
                <Pagination
                    count={Math.ceil(orders.data!.totalElements / 20)}
                    page={page + 1}
                    onChange={(_, value) => {
                        setPage(value - 1);
                        setParams({});
                    }}
                />
            )}
            <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
                <Stack
                    component="form"
                    spacing={3}
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (!reason.trim() || reason.trim().length > 2000)
                            return;
                        if (!create.isPending) create.mutate();
                    }}
                >
                    <TextField
                        select
                        label="Đơn hàng đã giao"
                        disabled={create.isPending}
                        value={order.id}
                        onChange={(event) =>
                            setParams({ orderId: event.target.value })
                        }
                    >
                        {(eligible.some((entry) => entry.id === order.id)
                            ? eligible
                            : [order, ...eligible]
                        ).map((entry) => (
                            <MenuItem key={entry.id} value={entry.id}>
                                {entry.code} · {dateTime(entry.createdAt)}
                            </MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        select
                        label="Sản phẩm cần hỗ trợ"
                        disabled={create.isPending}
                        value={item.id}
                        onChange={(event) =>
                            setParams({
                                orderId: String(order.id),
                                itemId: event.target.value,
                            })
                        }
                    >
                        {order.items.map((entry) => (
                            <MenuItem key={entry.id} value={entry.id}>
                                {entry.name}
                            </MenuItem>
                        ))}
                    </TextField>
                    <OrderProducts
                        items={orderProducts(order).filter(
                            (entry) => entry.id === String(item.id),
                        )}
                    />
                    <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
                        <TextField
                            select
                            label="Loại yêu cầu"
                            disabled={create.isPending}
                            value={type}
                            onChange={(event) =>
                                setType(
                                    event.target
                                        .value as AfterSaleRequest["type"],
                                )
                            }
                            sx={{ flex: 1 }}
                        >
                            {Object.entries(afterSaleTypes).map(
                                ([value, label]) => (
                                    <MenuItem key={value} value={value}>
                                        {label}
                                    </MenuItem>
                                ),
                            )}
                        </TextField>
                        <TextField
                            key={item.id}
                            label="Số lượng"
                            type="number"
                            value={item.quantity}
                            slotProps={{ input: { readOnly: true } }}
                            helperText={`Yêu cầu áp dụng cho toàn bộ ${item.quantity} sản phẩm đã mua trong dòng này.`}
                            sx={{ flex: 1 }}
                        />
                    </Stack>
                    <TextField
                        label="Lý do và mô tả vấn đề"
                        disabled={create.isPending}
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        required
                        multiline
                        minRows={4}
                        slotProps={{ htmlInput: { maxLength: 2000 } }}
                    />
                    {create.isError && (
                        <Alert severity="error">
                            {errorMessage(create.error)}
                        </Alert>
                    )}
                    <Stack
                        direction={{ xs: "column-reverse", sm: "row" }}
                        justifyContent="space-between"
                        gap={2}
                    >
                        <Button
                            component={Link}
                            to={`/account/orders/${order.id}`}
                            variant="outlined"
                        >
                            Quay lại đơn hàng
                        </Button>
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={create.isPending || !reason.trim()}
                        >
                            {create.isPending ? "Đang gửi…" : "Gửi yêu cầu"}
                        </Button>
                    </Stack>
                </Stack>
            </Paper>
        </Stack>
    );
}
