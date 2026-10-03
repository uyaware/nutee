import {
  Box,
  Button,
  CardActionArea,
  Chip,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import LaptopMacRounded from "@mui/icons-material/LaptopMacRounded";
import SmartphoneRounded from "@mui/icons-material/SmartphoneRounded";
import KeyboardRounded from "@mui/icons-material/KeyboardRounded";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { services } from "../../../services";
import { ProductCard } from "../components/ProductCard";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../../shared/components/Feedback";
import { tokens } from "../../../shared/theme/tokens";

export default function HomePage() {
  const products = useQuery({
    queryKey: ["catalog", "featured"],
    queryFn: services.catalog.featured,
  });
  return (
    <Stack spacing={4}>
      <Paper
        sx={{
          bgcolor: tokens.color.blueTint,
          borderRadius: 2,
          overflow: "hidden",
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1.15fr 1fr" },
        }}
      >
        <Box sx={{ p: { xs: 3, sm: 4, lg: 5 } }}>
          <Chip
            label="CHÀO MỪNG ĐẾN NUTEE"
            variant="outlined"
            color="primary"
            size="small"
            sx={{ fontWeight: 600, mb: 3 }}
          />
          <Typography variant="h1">
            Công nghệ cho
            <br />
            <Box component="span" sx={{ color: "primary.main" }}>
              nhịp sống của bạn.
            </Box>
          </Typography>
          <Typography
            color="text.secondary"
            sx={{ mt: 3, mb: 4, maxWidth: 440 }}
          >
            Từ góc làm việc đến những kết nối mỗi ngày. Khám phá không gian điện
            tử được xây dựng cho bạn.
          </Typography>
          <Button
            variant="contained"
            component={Link}
            to="/products"
            endIcon={<ArrowForwardRounded />}
          >
            Khám phá sản phẩm
          </Button>
        </Box>
        <Box
          sx={{
            minHeight: { xs: 220, md: 340 },
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "primary.main",
            overflow: "hidden",
          }}
        >
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              width: 370,
              height: 370,
              border: "1px solid",
              borderColor: "primary.contrastText",
              borderRadius: "50%",
              opacity: 0.18,
            }}
          />
          <Box
            component="img"
            src="/images/laptop.svg"
            alt="Minh họa laptop NUTEE"
            sx={{
              width: "90%",
              maxWidth: 430,
              height: 290,
              zIndex: 1,
              objectFit: "contain",
            }}
          />
          <Chip
            label="WORK. CREATE. CONNECT."
            sx={{
              position: "absolute",
              bottom: 24,
              bgcolor: "secondary.main",
              color: "secondary.contrastText",
              fontSize: 11,
              letterSpacing: ".12em",
            }}
          />
        </Box>
      </Paper>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
          gap: 2,
        }}
      >
        {[
          {
            icon: LaptopMacRounded,
            title: "Laptop",
            category: "laptop",
            desc: "Làm việc & sáng tạo",
          },
          {
            icon: SmartphoneRounded,
            title: "Điện thoại",
            category: "smartphone",
            desc: "Kết nối mỗi ngày",
          },
          {
            icon: KeyboardRounded,
            title: "Bàn phím",
            category: "keyboard",
            desc: "Hoàn thiện góc làm việc",
          },
        ].map(({ icon: Icon, title, desc, category }) => (
          <Paper key={title} variant="outlined" sx={{ overflow: "hidden" }}>
            <CardActionArea
              component={Link}
              to={`/products?category=${category}`}
              sx={{
                p: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                gap: 2,
              }}
            >
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: tokens.color.blueTint,
                  borderRadius: 2,
                  color: "primary.main",
                  display: "flex",
                }}
              >
                <Icon />
              </Box>
              <Box>
                <Typography fontWeight={600}>{title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {desc}
                </Typography>
              </Box>
            </CardActionArea>
          </Paper>
        ))}
      </Box>
      <Box>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ sm: "center" }}
          justifyContent="space-between"
          spacing={1}
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography variant="h2">Các sản phẩm nổi bật</Typography>
          </Box>
          <Button
            component={Link}
            to="/products"
            endIcon={<ArrowForwardRounded />}
          >
            Xem tất cả sản phẩm
          </Button>
        </Stack>
        {products.isPending ? (
          <LoadingState />
        ) : products.isError ? (
          <ErrorState
            error={products.error}
            retry={() => void products.refetch()}
          />
        ) : !products.data.length ? (
          <EmptyState
            title="Chưa có sản phẩm"
            description="Sản phẩm công khai sẽ xuất hiện tại đây."
          />
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, minmax(0, 1fr))",
                lg: "repeat(5, minmax(0, 1fr))",
              },
              gap: 2,
            }}
          >
            {products.data.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </Box>
        )}
      </Box>
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 3, md: 4 },
          display: "flex",
          gap: 2,
          alignItems: "flex-start",
        }}
      >
        <LaptopMacRounded color="primary" />
        <Box>
          <Typography variant="h3" component="h2">
            Chọn công nghệ theo cách của bạn.
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Tìm theo thương hiệu, khoảng giá và cấu hình. Xem thông số cùng đánh
            giá để chọn sản phẩm phù hợp.
          </Typography>
        </Box>
      </Paper>
    </Stack>
  );
}
