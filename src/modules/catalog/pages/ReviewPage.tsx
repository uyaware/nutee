import { useState } from "react";
import {
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
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { prototypeOrders } from "@/modules/orders/fixtures/orders";
import { EmptyState } from "@/shared/components/Feedback";
import { ProductImage } from "@/modules/catalog/components/ProductImage";

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
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [rating, setRating] = useState<number | null>(5);
  const [comment, setComment] = useState("");
  const order = prototypeOrders.find(
    (entry) => entry.id === id && entry.userId === "customer-1",
  );
  const item = order?.items.find((entry) => entry.id === itemId);
  if (!order || !item || order.status !== "delivered")
    return (
      <Stack spacing={2}>
        <EmptyState
          title="Chưa thể đánh giá"
          description="Chọn sản phẩm từ đơn hàng đã giao để viết đánh giá."
        />
        <Button component={Link} to="/account/orders">
          Về danh sách đơn hàng
        </Button>
      </Stack>
    );
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
      <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: 2 }}>
        {params.get("sent") === "1" ? (
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
              Trải nghiệm của bạn với {item.name} giúp khách hàng lựa chọn dễ
              hơn.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} gap={1.5}>
              <Button component={Link} to={detailPath} variant="contained">
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
              if (rating)
                navigate(
                  `/account/orders/${order.id}/review/${item.id}?sent=1`,
                );
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
              sx={{ p: 2, bgcolor: "background.default", borderRadius: 2 }}
            >
              <Box sx={{ width: 72, height: 72, flexShrink: 0 }}>
                <ProductImage src={item.imageUrl} alt={item.name} />
              </Box>
              <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                <Typography fontWeight={600}>{item.name}</Typography>
                <Typography variant="body2" color="text.secondary">
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
              <Typography id="review-rating-label" fontWeight={600}>
                Mức độ hài lòng
              </Typography>
              <Rating
                aria-labelledby="review-rating-label"
                name="product-rating"
                value={rating}
                onChange={(_, value) => setRating(value)}
                getLabelText={(value) =>
                  `${value} sao · ${ratingLabels[value]}`
                }
                sx={{ fontSize: 36, "& .MuiRating-label": { p: 0.5 } }}
              />
              <Typography
                color="primary.main"
                variant="body2"
                sx={{ minHeight: 22 }}
              >
                {rating ? ratingLabels[rating] : "Chọn số sao để đánh giá"}
              </Typography>
            </Stack>
            <TextField
              label="Nhận xét của bạn"
              placeholder="Chia sẻ về chất lượng, trải nghiệm sử dụng hoặc điều bạn yêu thích…"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              multiline
              minRows={4}
              slotProps={{ htmlInput: { maxLength: 1000 } }}
              helperText={`${comment.length}/1000 ký tự`}
            />
            <Divider />
            <Stack direction="row" justifyContent="flex-end" gap={1.5}>
              <Button component={Link} to={detailPath} color="secondary">
                Để sau
              </Button>
              <Button type="submit" variant="contained" disabled={!rating}>
                Gửi đánh giá
              </Button>
            </Stack>
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}
