import {
  Box,
  Button,
  CardActionArea,
  Container,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import LaptopMacRounded from "@mui/icons-material/LaptopMacRounded";
import { categoryIcon } from "@/modules/catalog/model/categoryIcons";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { services } from "@/app/services";
import { ProductCard } from "@/modules/catalog/components/ProductCard";
import "@/modules/catalog/pages/home-effects.css";
import { tokens } from "@/shared/theme/tokens";
import { useCustomerMode } from "@/shared/theme/customerMode";
import { parseCatalogFilters } from "@/modules/catalog/model/filters";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/shared/components/Feedback";

const allProductsFilters = parseCatalogFilters(new URLSearchParams());

export default function HomePage() {
  const { mode } = useCustomerMode();
  const dark = mode === "dark";
  const categories = useQuery({
    queryKey: ["catalog", "categories"],
    queryFn: services.catalog.categories,
  });
  const products = useQuery({
    queryKey: ["catalog", "featured"],
    queryFn: services.catalog.featured,
  });
  const productCount = useQuery({
    queryKey: ["catalog", "list", allProductsFilters],
    queryFn: () => services.catalog.list(allProductsFilters),
  });
  const brands = useQuery({
    queryKey: ["catalog", "brands"],
    queryFn: services.catalog.brands,
  });
  const rootCategories = categories.data?.filter((category) => !category.parentId) ?? [];
  const statistics = [
    { label: "Sản phẩm", value: productCount.data?.total, failed: productCount.isError },
    { label: "Thương hiệu", value: brands.data?.length, failed: brands.isError },
    { label: "Danh mục", value: categories.data?.length, failed: categories.isError },
  ].filter((item) => !item.failed);
  return (
    <Stack spacing={4}>
      <Box
        component="section"
        sx={{
          position: "relative",
          width: "100vw",
          left: "50%",
          transform: "translateX(-50%)",
          minHeight: { xs: `calc(100svh - ${tokens.layout.storefrontMobileHeaderHeight}px)`, md: `calc(100svh - ${tokens.layout.storefrontHeaderHeight}px)` },
          overflow: "hidden",
          color: dark ? "#fff" : "#172033",
          "@keyframes heroFloat": { "0%, 100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-14px)" } },
          "@media (prefers-reduced-motion: reduce)": { "& .hero-product": { animation: "none" } },
        }}
      >
        <Container maxWidth="lg" sx={{ minHeight: { xs: `calc(100svh - ${tokens.layout.storefrontMobileHeaderHeight}px)`, md: `calc(100svh - ${tokens.layout.storefrontHeaderHeight}px)` }, position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "1fr 1.1fr" }, alignItems: "center", gap: 3, py: { xs: 4, md: 5 } }}>
        <Box>
          <Typography sx={{ color: dark ? "#afc6ff" : "#315cae", fontWeight: 700, letterSpacing: ".16em", fontSize: ".75rem", mb: 3 }}>
            CHÀO MỪNG ĐẾN NUTEE
          </Typography>
          <Typography variant="h1" sx={{ fontSize: { xs: "clamp(1.4rem, 5.8vw, 2.75rem)", md: "clamp(2rem, 3.2vw, 3rem)" }, lineHeight: 1.2 }}>
            <Box component="span" sx={{ display: "block", whiteSpace: "nowrap" }}>
              Đồ án chuyên ngành
            </Box>
            <Box component="span" sx={{ display: "block", whiteSpace: "nowrap", color: tokens.color.blue }}>
              Thương mại điện tử
            </Box>
          </Typography>
          <Typography
            sx={{ color: dark ? "#d4dbe9" : "#526176", mt: 3, mb: 4, maxWidth: 440, fontSize: "1rem" }}
          >
            Khám phá những thiết bị đồng hành cùng bạn trong công việc, giải trí
            và mọi ý tưởng mới.
          </Typography>
          <Button
            variant="contained"
            component={Link}
            to="/products"
            endIcon={<ArrowForwardRounded />}
            sx={{ color: "#fff", px: 3, py: 1, borderRadius: 2, background: "linear-gradient(180deg, #3978ed, #1f55c7)", border: "1px solid #6197ff", borderBottom: "4px solid #173d94", boxShadow: "none", transition: "background 200ms, transform 150ms, border-width 150ms", "&:hover": { background: "linear-gradient(180deg, #3270df, #1d4daf)", boxShadow: "none" }, "&:active": { transform: "translateY(2px)", borderBottomWidth: "2px" }, "@media (prefers-reduced-motion: reduce)": { transition: "none" } }}
          >
            Khám phá sản phẩm
          </Button>
          {statistics.length > 0 && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: { xs: 2, sm: 3 }, mt: 4, pt: 2.5, borderTop: "1px solid", borderColor: dark ? "#46556c" : "#c9d4e4" }}>
              {statistics.map(({ label, value }) => (
                <Box key={label} sx={{ minWidth: 78 }}>
                  <Typography sx={{ fontSize: "1.25rem", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "text.primary" }}>
                    {value === undefined ? "—" : value.toLocaleString("vi-VN")}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">{label}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>
        <Box className="hero-product" sx={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: 0, animation: "heroFloat 7s ease-in-out infinite", filter: dark ? "drop-shadow(0 25px 45px rgba(31, 64, 160, .4))" : "drop-shadow(0 25px 45px rgba(80, 80, 80, .22))" }}>
          <Box
            component="img"
            src="/images/hero-medion.png"
            alt="Ảnh minh họa laptop Medion Akoya"
            aria-describedby="hero-image-credit"
            fetchPriority="high"
            sx={{
              width: "100%",
              maxWidth: 620,
              height: { xs: 260, sm: 380, md: 500 },
              objectFit: "contain",
              borderRadius: 4,
            }}
          />
          <Box
            component="img"
            src="/images/hero-keyboard.png"
            alt="Ảnh minh họa bàn phím Apple Magic Keyboard"
            aria-describedby="hero-image-credit"
            sx={{ position: "absolute", right: { xs: "0%", md: "-2%" }, bottom: { xs: "7%", md: "10%" }, width: { xs: "58%", md: "60%" }, objectFit: "contain", transform: "rotate(-8deg)", filter: "drop-shadow(0 12px 18px rgba(0, 0, 0, .6))" }}
          />
          <Box component="span" id="hero-image-credit" sx={{ position: "absolute", width: "1px", height: "1px", p: 0, margin: "-1px", overflow: "hidden", clip: "rect(0, 0, 0, 0)", whiteSpace: "nowrap", border: 0 }}>
            Ảnh laptop của PantheraLeo1359531 và ảnh bàn phím của Fletcher, chỉnh sửa bởi AGreuet, từ Wikimedia Commons. Thông tin giấy phép tại /image-credits.txt.
          </Box>
        </Box>
        </Container>
      </Box>
      {categories.isPending ? (
        <LoadingState />
      ) : categories.isError ? (
        <ErrorState error={categories.error} retry={() => void categories.refetch()} />
      ) : rootCategories.length === 0 ? (
        <Box>
          <EmptyState title="Chưa có danh mục" description="Danh mục sản phẩm sẽ xuất hiện tại đây." />
        </Box>
      ) : <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))", md: "repeat(6, minmax(0, 1fr))" },
          gap: 2,
        }}
      >
        {rootCategories.map((category) => {
          const Icon = categoryIcon(category.name);
          return (
          <Paper key={category.id} className={`home-hover-border${dark ? "" : " home-hover-border-light"}`} variant="outlined" sx={{ overflow: "hidden", bgcolor: dark ? "#141a25" : "#fff", color: "text.primary", borderColor: "divider" }}>
            <CardActionArea
              component={Link}
              to={`/products?${new URLSearchParams({ category: category.id })}`}
              sx={{
                p: 2,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                height: "100%",
                gap: 1,
              }}
            >
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: dark ? "#253653" : "#eaf1ff",
                  borderRadius: 2,
                  color: dark ? "#b9ccff" : "#174aa8",
                  display: "flex",
                }}
              >
                <Icon />
              </Box>
              <Typography fontWeight={600} sx={{ overflowWrap: "anywhere" }}>{category.name}</Typography>
            </CardActionArea>
          </Paper>
        ); })}
      </Box>}
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
            sx={{ color: dark ? "#b9ccff" : "#174aa8" }}
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
          <Box>
            <EmptyState
              title="Chưa có sản phẩm"
              description="Sản phẩm công khai sẽ xuất hiện tại đây."
            />
          </Box>
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
              <ProductCard key={p.id} product={p} home />
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
          bgcolor: dark ? "#141a25" : "#fff",
          color: "text.primary",
          borderColor: "divider",
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
