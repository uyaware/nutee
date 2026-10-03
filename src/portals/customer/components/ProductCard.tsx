import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Typography,
} from "@mui/material";
import { Link } from "react-router-dom";
import type { ProductSummary } from "../../../shared/types/database";
import { money } from "../../../shared/lib/format";
import { ProductImage } from "./ProductImage";

export function ProductCard({
  product,
  returnTo,
}: {
  product: ProductSummary;
  returnTo?: string;
}) {
  return (
    <Card sx={{ height: "100%", minWidth: 0 }}>
      <CardActionArea
        component={Link}
        to={`/products/${product.id}`}
        state={returnTo ? { catalogReturnTo: returnTo } : undefined}
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
        }}
      >
        <Box
          sx={{
            bgcolor: "background.default",
            p: 2,
            height: { xs: 160, lg: 140 },
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ProductImage
            src={product.imageUrl}
            alt={`Minh họa ${product.name}`}
          />
        </Box>
        <CardContent sx={{ flex: 1, overflowWrap: "anywhere" }}>
          <Typography variant="caption" color="text.secondary">
            {product.brandName}
          </Typography>
          <Typography
            component="h3"
            variant="body1"
            sx={{ mt: 0.75, minHeight: 44, fontWeight: 600 }}
          >
            {product.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {product.specifications[0]?.value}
          </Typography>
          <Typography
            sx={{
              mt: 1.25,
              fontWeight: 700,
              color: "primary.main",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {money(product.price)}
          </Typography>
          <Typography
            variant="caption"
            color={product.stock ? "text.secondary" : "warning.main"}
          >
            {product.stock ? "Còn hàng" : "Hết hàng"}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
