import { useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Divider,
  Pagination,
  Paper,
  Rating,
  Stack,
  Typography,
} from "@mui/material";
import VerifiedOutlined from "@mui/icons-material/VerifiedOutlined";
import RateReviewOutlined from "@mui/icons-material/RateReviewOutlined";
import { Link } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { services } from "@/app/services";
import { ErrorState, LoadingState } from "@/shared/components/Feedback";
import type { ProductDetail } from "@/modules/catalog/model/types";
import { prototypeOrders } from "@/modules/orders/fixtures/orders";

export function ProductReviews({
  id,
  rating,
}: {
  id: string;
  rating: ProductDetail["rating"];
}) {
  const [page, setPage] = useState(1);
  const purchasedOrder = prototypeOrders.find(
    (order) =>
      order.userId === "customer-1" &&
      order.status === "delivered" &&
      order.items.some((item) => item.productId === id),
  );
  const purchasedItem = purchasedOrder?.items.find(
    (item) => item.productId === id,
  );
  const query = useQuery({
    queryKey: ["catalog", "reviews", id, page],
    queryFn: () => services.catalog.reviews(id, page),
    placeholderData: keepPreviousData,
  });
  return (
    <Paper
      component="section"
      id="product-reviews"
      variant="outlined"
      aria-labelledby="product-reviews-title"
      sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: 2 }}
    >
      <Stack direction="row" gap={1} alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h2" id="product-reviews-title">
          Đánh giá sản phẩm
        </Typography>
        <Typography variant="body2" color="text.secondary">
          ({rating.count})
        </Typography>
      </Stack>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            md: "240px minmax(0, 1fr)",
          },
          gap: { xs: 3, md: 4 },
          alignItems: "start",
        }}
      >
        <Stack
          spacing={1.5}
          alignItems="center"
          sx={{
            p: 3,
            bgcolor: "background.default",
            borderRadius: 2,
            textAlign: "center",
          }}
        >
          <Typography
            component="p"
            sx={{
              fontSize: 48,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.05em",
            }}
          >
            {rating.count ? rating.average.toFixed(1) : "—"}
            <Typography
              component="span"
              color="text.secondary"
              sx={{ fontSize: 18, fontWeight: 400, ml: 0.5 }}
            >
              / 5
            </Typography>
          </Typography>
          <Rating
            value={rating.average}
            precision={0.1}
            readOnly
            aria-label={`Trung bình ${rating.average.toFixed(1)} trên 5 sao`}
          />
          <Typography variant="body2" color="text.secondary">
            {rating.count
              ? `${rating.count} lượt đánh giá từ khách hàng`
              : "Chưa có đánh giá"}
          </Typography>
          <Button
            component={Link}
            to={
              purchasedOrder && purchasedItem
                ? `/account/orders/${purchasedOrder.id}/review/${purchasedItem.id}`
                : "/account/orders?status=delivered"
            }
            variant="outlined"
            startIcon={<RateReviewOutlined />}
            fullWidth
          >
            Viết đánh giá
          </Button>
        </Stack>
        <Stack spacing={2.5} sx={{ minWidth: 0 }} aria-busy={query.isFetching}>
          {query.isPending ? (
            <LoadingState />
          ) : query.isError ? (
            <ErrorState
              error={query.error}
              retry={() => void query.refetch()}
            />
          ) : !query.data.total ? (
            <Stack spacing={1} sx={{ py: { xs: 1, md: 4 } }}>
              <Typography fontWeight={600}>
                Chia sẻ trải nghiệm đầu tiên
              </Typography>
              <Typography color="text.secondary">
                Bạn đã nhận sản phẩm? Đánh giá của bạn sẽ giúp người mua khác
                lựa chọn dễ hơn.
              </Typography>
            </Stack>
          ) : (
            <>
              <Stack divider={<Divider />} spacing={2.5}>
                {query.data.items.map((review) => (
                  <Stack
                    component="article"
                    key={review.id}
                    spacing={1.5}
                    sx={{ overflowWrap: "anywhere" }}
                  >
                    <Stack
                      direction="row"
                      spacing={1.5}
                      alignItems="flex-start"
                    >
                      <Avatar
                        sx={{
                          width: 36,
                          height: 36,
                          bgcolor: "action.selected",
                          color: "primary.main",
                          fontSize: 14,
                          fontWeight: 600,
                        }}
                      >
                        {review.authorName
                          .trim()
                          .charAt(0)
                          .toLocaleUpperCase("vi")}
                      </Avatar>
                      <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="baseline"
                          gap={1}
                          useFlexGap
                          flexWrap="wrap"
                        >
                          <Typography fontWeight={600}>
                            {review.authorName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Intl.DateTimeFormat("vi-VN", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              timeZone: "Asia/Ho_Chi_Minh",
                            }).format(new Date(review.createdAt))}
                          </Typography>
                        </Stack>
                        <Stack
                          direction="row"
                          gap={1.5}
                          alignItems="center"
                          useFlexGap
                          flexWrap="wrap"
                        >
                          <Rating
                            value={review.rating}
                            readOnly
                            size="small"
                            aria-label={`${review.rating} trên 5 sao`}
                          />
                          <Stack direction="row" gap={0.5} alignItems="center">
                            <VerifiedOutlined
                              aria-hidden="true"
                              sx={{ fontSize: 14, color: "success.main" }}
                            />
                            <Typography variant="caption" color="success.main">
                              Đã mua hàng
                            </Typography>
                          </Stack>
                        </Stack>
                      </Stack>
                    </Stack>
                    {review.comment && (
                      <Typography
                        sx={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}
                      >
                        {review.comment}
                      </Typography>
                    )}
                  </Stack>
                ))}
              </Stack>
              {query.data.total > query.data.pageSize && (
                <Pagination
                  count={Math.ceil(query.data.total / query.data.pageSize)}
                  page={query.data.page}
                  onChange={(_, value) => setPage(value)}
                  disabled={query.isPlaceholderData}
                  size="small"
                  sx={{ alignSelf: "center" }}
                  getItemAriaLabel={(type, value) =>
                    type === "page"
                      ? `Trang đánh giá ${value}`
                      : type === "next"
                        ? "Đánh giá tiếp"
                        : "Đánh giá trước"
                  }
                />
              )}
            </>
          )}
        </Stack>
      </Box>
    </Paper>
  );
}
