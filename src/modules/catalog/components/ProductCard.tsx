import {
    Box,
    Card,
    CardActionArea,
    CardContent,
    Typography,
} from "@mui/material";
import { styled, useTheme } from "@mui/material/styles";
import { Link } from "react-router-dom";
import type { ProductSummary } from "@/shared/types/database";
import { money } from "@/shared/lib/format";
import { ProductImage } from "@/modules/catalog/components/ProductImage";

const ProductCardSurface = styled(Card, {
    shouldForwardProp: (prop) => prop !== "home",
})<{ home: boolean }>(({ theme, home }) => ({
    height: "100%",
    minWidth: 0,
    ...(home && {
        backgroundColor: theme.palette.productCard.background,
        color: theme.palette.productCard.text,
        borderColor: theme.palette.productCard.border,
        "& .MuiTypography-colorTextSecondary": {
            color: theme.palette.productCard.secondaryText,
        },
        "& .MuiTypography-colorWarningMain": {
            color: theme.palette.productCard.warning,
        },
    }),
}));

export function ProductCard({
    product,
    returnTo,
    home = false,
}: {
    product: ProductSummary;
    returnTo?: string;
    home?: boolean;
}) {
    const dark = useTheme().palette.mode === "dark";
    return (
        <ProductCardSurface
            home={home}
            className={
                home
                    ? `home-hover-border${dark ? "" : " home-hover-border-light"}`
                    : undefined
            }
        >
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
                        bgcolor: home
                            ? "productCard.mediaBackground"
                            : "background.default",
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
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 1 }}
                    >
                        {product.specifications[0]?.value}
                    </Typography>
                    <Typography
                        sx={{
                            mt: 1.25,
                            fontWeight: 700,
                            color: home ? "productCard.price" : "primary.main",
                            fontVariantNumeric: "tabular-nums",
                        }}
                    >
                        {money(product.price)}
                    </Typography>
                    {product.originalPrice !== undefined &&
                        product.originalPrice > product.price && (
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ textDecoration: "line-through" }}
                            >
                                {money(product.originalPrice)}
                            </Typography>
                        )}
                    <Typography
                        variant="caption"
                        color={
                            product.stock ? "text.secondary" : "warning.main"
                        }
                    >
                        {product.stock ? "Còn hàng" : "Hết hàng"}
                    </Typography>
                </CardContent>
            </CardActionArea>
        </ProductCardSurface>
    );
}
