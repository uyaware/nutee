import { useState } from "react";
import {
    Alert,
    Box,
    Button,
    Chip,
    Divider,
    Paper,
    Rating,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import CheckCircleOutlineRounded from "@mui/icons-material/CheckCircleOutlineRounded";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { services } from "@/app/services";
import { useOrder } from "@/modules/orders/hooks/useOrder";
import { useSession } from "@/modules/auth/hooks/useSession";
import type { CustomerOrder } from "@/modules/orders/model/api";
import type { OwnReview } from "@/modules/catalog/model/review";
import {
    EmptyState,
    ErrorState,
    LoadingState,
} from "@/shared/components/Feedback";
import { ProductImage } from "@/modules/catalog/components/ProductImage";
import { errorMessage } from "@/shared/lib/errors";

const ratingLabels = [
    "",
    "Rất không hài lòng",
    "Không hài lòng",
    "Bình thường",
    "Hài lòng",
    "Rất hài lòng",
];

export default function ReviewPage() {
    const { id, itemId } = useParams();
    const session = useSession("customer");
    const orderQuery = useOrder(Number(id));
    const valid =
        Number.isSafeInteger(Number(id)) &&
        Number(id) > 0 &&
        Number.isSafeInteger(Number(itemId)) &&
        Number(itemId) > 0;
    const query = useQuery({
        queryKey: [
            "customer",
            session.data?.id,
            "reviews",
            Number(id),
            Number(itemId),
        ],
        queryFn: () => services.reviews.get(Number(id), Number(itemId)),
        enabled: !!session.data && valid,
        retry: false,
    });
    if (!valid)
        return (
            <EmptyState
                title="Chưa thể đánh giá"
                description="Chọn sản phẩm từ đơn hàng đã giao để viết đánh giá."
            />
        );
    if (orderQuery.isError)
        return (
            <ErrorState
                error={orderQuery.error}
                retry={() => void orderQuery.refetch()}
            />
        );
    if (query.isError)
        return (
            <ErrorState
                error={query.error}
                retry={() => void query.refetch()}
            />
        );
    if (orderQuery.isPending || query.isPending) return <LoadingState />;
    const item = orderQuery.data.items.find(
        (entry) => entry.id === Number(itemId),
    );
    if (!item || orderQuery.data.status !== "delivered")
        return (
            <EmptyState
                title="Chưa thể đánh giá"
                description="Chọn sản phẩm từ đơn hàng đã giao để viết đánh giá."
            />
        );
    return (
        <ReviewForm
            key={`${id}:${itemId}`}
            order={orderQuery.data}
            item={item}
            initial={query.data}
        />
    );
}

function ReviewForm({
    order,
    item,
    initial,
}: {
    order: CustomerOrder;
    item: CustomerOrder["items"][number];
    initial: OwnReview;
}) {
    const session = useSession("customer");
    const client = useQueryClient();
    const [rating, setRating] = useState<number | null>(initial.rating ?? 5);
    const [comment, setComment] = useState(initial.comment ?? "");
    const save = useMutation({
        mutationFn: () =>
            services.reviews.save(order.id, item.id, {
                rating: rating!,
                comment: comment.trim(),
            }),
        onSuccess: async (saved) => {
            client.setQueryData(
                ["customer", session.data?.id, "reviews", order.id, item.id],
                saved,
            );
            await client.invalidateQueries({ queryKey: ["catalog"] });
        },
    });
    const detailPath = `/account/orders/${order.id}`;
    return (
        <Stack spacing={2.5} sx={{ maxWidth: 800, mx: "auto", width: "100%" }}>
            <Button
                component={Link}
                to={detailPath}
                startIcon={<ArrowBackRounded />}
                color="secondary"
                sx={{ alignSelf: "flex-start" }}
            >
                Quay lại đơn hàng
            </Button>
            <Paper
                variant="outlined"
                sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: 2 }}
            >
                {save.isSuccess ? (
                    <Stack
                        spacing={2.5}
                        alignItems="center"
                        textAlign="center"
                        sx={{ py: 3 }}
                    >
                        <Box
                            sx={{
                                p: 2,
                                borderRadius: "50%",
                                bgcolor: "action.selected",
                                display: "flex",
                            }}
                        >
                            <CheckCircleOutlineRounded
                                color="success"
                                sx={{ fontSize: 48 }}
                            />
                        </Box>
                        <Typography variant="h2" component="h1">
                            Cảm ơn bạn đã chia sẻ!
                        </Typography>
                        <Typography color="text.secondary">
                            Trải nghiệm của bạn với {item.name} giúp khách hàng
                            lựa chọn dễ hơn.
                        </Typography>
                        <Stack
                            direction={{ xs: "column", sm: "row" }}
                            gap={1.5}
                        >
                            <Button
                                onClick={() => save.reset()}
                                variant="outlined"
                            >
                                Chỉnh sửa đánh giá
                            </Button>
                            <Button
                                component={Link}
                                to={detailPath}
                                variant="contained"
                            >
                                Về đơn hàng
                            </Button>
                            <Button
                                component={Link}
                                to={`/products/${item.productId}`}
                                variant="outlined"
                            >
                                Xem sản phẩm
                            </Button>
                        </Stack>
                    </Stack>
                ) : (
                    <Stack
                        component="form"
                        spacing={3}
                        onSubmit={(event) => {
                            event.preventDefault();
                            if (
                                rating &&
                                !save.isPending &&
                                comment.length <= 1000
                            )
                                save.mutate();
                        }}
                    >
                        <Stack spacing={0.5}>
                            <Typography variant="h2" component="h1">
                                Đánh giá sản phẩm
                            </Typography>
                            <Typography color="text.secondary">
                                Bạn cảm thấy thế nào về sản phẩm đã nhận?
                            </Typography>
                        </Stack>
                        <Stack
                            direction="row"
                            spacing={2}
                            alignItems="center"
                            sx={{
                                p: 2,
                                bgcolor: "background.default",
                                borderRadius: 2,
                            }}
                        >
                            <Box sx={{ width: 72, height: 72, flexShrink: 0 }}>
                                <ProductImage
                                    src={item.imageUrl ?? ""}
                                    alt={item.name}
                                />
                            </Box>
                            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                                <Typography fontWeight={600}>
                                    {item.name}
                                </Typography>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                >
                                    {item.configuration}
                                </Typography>
                                <Chip
                                    label="Đã nhận hàng"
                                    color="success"
                                    variant="outlined"
                                    size="small"
                                    sx={{ alignSelf: "flex-start", height: 24 }}
                                />
                            </Stack>
                        </Stack>
                        <Stack spacing={1.5} alignItems="center" sx={{ py: 1 }}>
                            <Typography
                                id="review-rating-label"
                                fontWeight={600}
                            >
                                Mức độ hài lòng
                            </Typography>
                            <Rating
                                aria-labelledby="review-rating-label"
                                name="product-rating"
                                value={rating}
                                disabled={save.isPending}
                                onChange={(_, value) => setRating(value)}
                                getLabelText={(value) =>
                                    `${value} sao · ${ratingLabels[value]}`
                                }
                                sx={{
                                    fontSize: 36,
                                    "& .MuiRating-label": { p: 0.5 },
                                }}
                            />
                            <Typography
                                color="primary.main"
                                variant="body2"
                                sx={{ minHeight: 22 }}
                            >
                                {rating
                                    ? ratingLabels[rating]
                                    : "Chọn số sao để đánh giá"}
                            </Typography>
                        </Stack>
                        <TextField
                            label="Nhận xét của bạn"
                            placeholder="Chia sẻ về chất lượng, trải nghiệm sử dụng hoặc điều bạn yêu thích…"
                            value={comment}
                            disabled={save.isPending}
                            onChange={(event) => setComment(event.target.value)}
                            multiline
                            minRows={4}
                            slotProps={{ htmlInput: { maxLength: 1000 } }}
                            helperText={`${comment.length}/1000 ký tự`}
                        />
                        {save.isError && (
                            <Alert severity="error">
                                {errorMessage(save.error)}
                            </Alert>
                        )}
                        <Divider />
                        <Stack
                            direction="row"
                            justifyContent="flex-end"
                            gap={1.5}
                        >
                            <Button
                                component={Link}
                                to={detailPath}
                                color="secondary"
                            >
                                Để sau
                            </Button>
                            <Button
                                type="submit"
                                variant="contained"
                                disabled={!rating || save.isPending}
                            >
                                Gửi đánh giá
                            </Button>
                        </Stack>
                    </Stack>
                )}
            </Paper>
        </Stack>
    );
}
