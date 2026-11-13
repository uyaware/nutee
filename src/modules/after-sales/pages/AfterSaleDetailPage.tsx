import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Paper,
    Stack,
    Typography,
} from "@mui/material";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import { Link, useLocation, useParams } from "react-router-dom";
import {
    afterSaleActions,
    afterSaleLabels,
    afterSaleTypes,
    type AfterSaleStatus,
} from "@/modules/after-sales/model/types";
import type { Portal } from "@/shared/types/database";
import { dateTime } from "@/shared/lib/format";
import {
    EmptyState,
    ErrorState,
    LoadingState,
} from "@/shared/components/Feedback";
import { AfterSaleBadge } from "@/modules/after-sales/components/AfterSaleBadge";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { services } from "@/app/services";
import { useSession } from "@/modules/auth/hooks/useSession";
import { errorMessage } from "@/shared/lib/errors";
import { StatusHistoryStepper } from "@/shared/components/StatusHistoryStepper";
import { OrderProducts } from "@/modules/checkout/components/CheckoutSummary";

export default function AfterSaleDetailPage({ portal }: { portal: Portal }) {
    const customer = portal === "customer";
    const base = customer ? "/account/after-sales" : "/management/after-sales";
    const { id } = useParams();
    const location = useLocation();
    const session = useSession(portal);
    const client = useQueryClient();
    const [next, setNext] = useState<AfterSaleStatus | null>(null);
    const validId = Number.isSafeInteger(Number(id)) && Number(id) > 0;
    const key = [portal, session.data?.id, "after-sales", Number(id)];
    const query = useQuery({
        queryKey: key,
        queryFn: () => services.afterSales.get(portal, Number(id)),
        enabled: !!session.data && validId,
        retry: false,
    });
    const request = query.data;
    const transition = useMutation({
        mutationFn: (status: AfterSaleStatus) =>
            services.afterSales.transition(Number(id), request!.status, status),
        onSuccess: async (updated) => {
            client.setQueryData(key, updated);
            setNext(null);
            await client.invalidateQueries({
                queryKey: [portal, session.data?.id, "after-sales"],
            });
        },
    });
    if (validId && query.isPending) return <LoadingState />;
    if (query.isError)
        return (
            <ErrorState
                error={query.error}
                retry={() => void query.refetch()}
            />
        );
    if (!request)
        return (
            <Stack spacing={2}>
                <EmptyState
                    title="Không tìm thấy yêu cầu"
                    description="Chọn một yêu cầu trong danh sách để xem chi tiết."
                />
                <Button component={Link} to={base}>
                    {customer ? "Về danh sách hậu mãi" : "Về danh sách yêu cầu"}
                </Button>
            </Stack>
        );
    const item = request.item;
    const status = request.status;
    const state = location.state as { backTo?: string } | null;
    const backTo = state?.backTo?.startsWith(`${base}?`) ? state.backTo : base;
    return (
        <Stack spacing={3}>
            <Button
                component={Link}
                to={backTo}
                startIcon={<ArrowBackRounded />}
                sx={{ alignSelf: "flex-start" }}
            >
                {customer ? "Quay lại hậu mãi" : "Quay lại yêu cầu"}
            </Button>
            <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ sm: "center" }}
                gap={2}
            >
                <Stack spacing={1}>
                    <Typography variant="h1">
                        Yêu cầu {String(request.id)}
                    </Typography>
                    <Typography color="text.secondary">
                        Gửi lúc {dateTime(request.createdAt)}
                    </Typography>
                </Stack>
                <Box>
                    <AfterSaleBadge status={status} />
                </Box>
            </Stack>
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: {
                        xs: "minmax(0, 1fr)",
                        lg: "minmax(0, 1fr) 320px",
                    },
                    gap: 3,
                    alignItems: "start",
                }}
            >
                <Stack spacing={3}>
                    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
                        <Stack spacing={2}>
                            <Typography variant="h2">
                                Thông tin yêu cầu
                            </Typography>
                            {item && (
                                <OrderProducts
                                    items={[
                                        {
                                            ...item,
                                            imageUrl: item.imageUrl ?? "",
                                            configuration:
                                                item.configuration ?? "",
                                        },
                                    ]}
                                />
                            )}
                            <Divider />
                            <Typography>
                                <strong>Loại yêu cầu:</strong>{" "}
                                {afterSaleTypes[request.type]}
                            </Typography>
                            <Typography>
                                <strong>Số lượng:</strong> {request.quantity}
                            </Typography>
                            <Typography
                                sx={{
                                    whiteSpace: "pre-wrap",
                                    overflowWrap: "anywhere",
                                }}
                            >
                                <strong>Lý do / mô tả:</strong> {request.reason}
                                {request.description
                                    ? `\n${request.description}`
                                    : ""}
                            </Typography>
                            <Typography>
                                <strong>Mã bảo hành:</strong>{" "}
                                {item?.warrantyCode ?? "Chưa có"}
                            </Typography>
                            <Typography>
                                <strong>Hạn bảo hành:</strong>{" "}
                                {item?.warrantyExpiresAt
                                    ? dateTime(item.warrantyExpiresAt)
                                    : "Chưa có"}
                            </Typography>
                            {request.orderId && (
                                <Button
                                    component={Link}
                                    to={`${customer ? "/account" : "/management"}/orders/${request.orderId}`}
                                    variant="outlined"
                                    sx={{ alignSelf: "flex-start" }}
                                >
                                    Xem đơn {request.orderCode}
                                </Button>
                            )}
                        </Stack>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
                        <Stack spacing={2}>
                            <Typography variant="h2">
                                Tiến trình xử lý
                            </Typography>
                            <StatusHistoryStepper
                                label="Lịch sử trạng thái yêu cầu"
                                finished={
                                    status === "completed" ||
                                    status === "rejected"
                                }
                                entries={request.history.map((entry) => ({
                                    title:
                                        afterSaleLabels[entry.status] ??
                                        entry.status,
                                    description: `${dateTime(entry.at)} · ${entry.actorName ?? ""}`,
                                    negative: entry.status === "rejected",
                                }))}
                            />
                        </Stack>
                    </Paper>
                </Stack>
                <Stack spacing={3}>
                    <Paper variant="outlined" sx={{ p: 3 }}>
                        <Stack spacing={1.5}>
                            <Typography variant="h3" component="h2">
                                Liên hệ khách hàng
                            </Typography>
                            <Typography fontWeight={600}>
                                {request.customer.name}
                            </Typography>
                            <Typography>{request.customer.phone}</Typography>
                            <Typography color="text.secondary">
                                {request.customer.addressLine}
                            </Typography>
                        </Stack>
                    </Paper>
                    {!customer && (
                        <Paper variant="outlined" sx={{ p: 3 }}>
                            <Stack spacing={2}>
                                {transition.isError && (
                                    <Alert severity="error">
                                        {errorMessage(transition.error)}
                                    </Alert>
                                )}
                                {(afterSaleActions[status] ?? []).map(
                                    (action) => (
                                        <Button
                                            key={action.status}
                                            variant="contained"
                                            color={
                                                action.status === "rejected"
                                                    ? "error"
                                                    : "primary"
                                            }
                                            disabled={transition.isPending}
                                            onClick={() => {
                                                transition.reset();
                                                setNext(action.status);
                                            }}
                                        >
                                            {action.label}
                                        </Button>
                                    ),
                                )}
                                {!afterSaleActions[status]?.length && (
                                    <Typography color="text.secondary">
                                        Yêu cầu đã kết thúc xử lý.
                                    </Typography>
                                )}
                            </Stack>
                        </Paper>
                    )}
                    {customer && (
                        <Button
                            component={Link}
                            to="/account/after-sales/new"
                            variant="outlined"
                        >
                            Tạo yêu cầu khác
                        </Button>
                    )}
                </Stack>
            </Box>
            <Dialog
                open={!!next}
                onClose={() => {
                    if (!transition.isPending) setNext(null);
                }}
                aria-labelledby="after-sale-confirm"
            >
                <DialogTitle id="after-sale-confirm">
                    {next ? afterSaleLabels[next] : ""}
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        Xác nhận cập nhật trạng thái yêu cầu {request.id}?
                    </Typography>
                    {transition.isError && (
                        <Alert severity="error">
                            {errorMessage(transition.error)}
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button
                        disabled={transition.isPending}
                        onClick={() => setNext(null)}
                    >
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        disabled={transition.isPending || !next}
                        onClick={() => {
                            if (next) transition.mutate(next);
                        }}
                    >
                        Xác nhận
                    </Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
}
