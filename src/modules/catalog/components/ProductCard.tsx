
import {
    Box,
    Card,
    CardActionArea,
    CardContent,
    Rating,
    Typography,
} from "@mui/material";
import { styled, useTheme } from "@mui/material/styles";
import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";

import type { ProductSummary } from "@/shared/types/database";
import { money } from "@/shared/lib/format";
import { ProductImage } from "@/modules/catalog/components/ProductImage";
import { trackEvent } from "@/shared/analytics/posthog";

const ProductCardSurface = styled(Card, {
    shouldForwardProp: (prop) => prop !== "home",
})<{ home: boolean }>(({ theme, home }) => ({
    height: "100%",
    minWidth: 0,
    overflow: "visible",
    boxShadow:
        theme.palette.mode === "dark"
            ? "0 3px 12px rgba(0, 0, 0, 0.24)"
            : "0 3px 12px rgba(35, 54, 82, 0.10)",
    "@media (prefers-reduced-motion: no-preference)": {
        "&&": {
            transition: "transform 200ms ease, border-color 180ms ease",
        },
        "& .product-card-image img": {
            transition: "transform 250ms ease",
        },
        "&:hover, &:focus-within": {
            transform: "translateY(-4px)",
        },
        "&:hover .product-card-image img, &:focus-within .product-card-image img":
            {
                transform: "scale(1.05)",
            },
    },
    ...(!home && {
        borderWidth: 2,
        borderColor: theme.palette.divider,
    }),
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
    listId,
    index,
}: {
    product: ProductSummary;
    returnTo?: string;
    home?: boolean;
    listId: string;
    index: number;
}) {
    const dark = useTheme().palette.mode === "dark";
    const location = useLocation();

    const cardRef = useRef<HTMLDivElement>(null);
    const trackedImpression = useRef<string | null>(null);

    const page = home ? "home" : "catalog";

    const saving =
        product.originalPrice !== undefined &&
        product.originalPrice > product.price
            ? product.originalPrice - product.price
            : 0;

    // Track product impression when at least 50% visible
    useEffect(() => {
        const element = cardRef.current;
        const key = `${location.key}:${listId}:${product.id}:${index}`;

        if (
            !element ||
            typeof IntersectionObserver === "undefined" ||
            trackedImpression.current === key
        ) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (
                    trackedImpression.current === key ||
                    !entries.some(
                        (entry) =>
                            entry.isIntersecting &&
                            entry.intersectionRatio >= 0.5,
                    )
                ) {
                    return;
                }

                trackedImpression.current = key;

                trackEvent("product_impression", {
                    product_id: String(product.id),
                    list_id: listId,
                    position: index + 1,
                    page,
                });

                observer.disconnect();
            },
            { threshold: 0.5 },
        );

        observer.observe(element);

        return () => observer.disconnect();
    }, [location.key, listId, product.id, index, page]);

    const handleProductClick = () => {
        trackEvent("product_click", {
            product_id: String(product.id),
            list_id: listId,
            position: index + 1,
            page,
        });
    };

    return (
        <ProductCardSurface
            ref={cardRef}
            home={home}
            className={
                home
                    ? `home-hover-border${dark ? "" : " home-hover-border-light"}`
                    : undefined
            }
        >
            <CardActionArea
                component={Link}
                onClick={handleProductClick}
                to={`/products/${product.id}`}
                state={
                    returnTo
                        ? { catalogReturnTo: returnTo }
                        : undefined
                }
                sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "stretch",
                    overflow: "visible",
                }}
            >
                <Box
                    sx={{
                        bgcolor: home
                            ? "productCard.mediaBackground"
                            : "background.default",
                        height: { xs: 160, lg: 140 },
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative",
                        borderRadius: "8px 8px 0 0",
                    }}
                >
                    <Box
                        className="product-card-image"
                        sx={{
                            width: "100%",
                            height: "100%",
                            overflow: "hidden",
                            borderRadius: "inherit",
                        }}
                    >
                        <ProductImage
                            src={product.imageUrl}
                            alt={`Minh họa ${product.name}`}
                            fit="cover"
                        />
                    </Box>

                    {saving > 0 && (
                        <Typography
                            component="span"
                            variant="caption"
                            sx={{
                                position: "absolute",
                                top: -10,
                                right: 0,
                                transform: "translateX(6px)",
                                px: 1,
                                py: 0.4,
                                borderRadius: 1,
                                bgcolor: dark ? "#bcd4ff" : "#244e9e",
                                color: dark ? "#132a4e" : "#fff",
                                fontWeight: 700,
                                boxShadow: 2,
                                zIndex: 1,
                            }}
                        >
                            Tiết kiệm {money(saving)}
                        </Typography>
                    )}
                </Box>

                <CardContent sx={{ flex: 1, overflowWrap: "anywhere" }}>
                    {product.brandName && (
                        <Typography
                            component="span"
                            variant="caption"
                            sx={{
                                display: "inline-flex",
                                px: 1,
                                py: 0.25,
                                borderRadius: 1,
                                bgcolor: dark
                                    ? "rgba(148, 174, 222, 0.15)"
                                    : "#edf2fa",
                                color: dark ? "#c4d2e9" : "#526782",
                                fontWeight: 600,
                            }}
                        >
                            {product.brandName}
                        </Typography>
                    )}

                    <Typography
                        component="h3"
                        variant="body1"
                        sx={{
                            mt: 0.75,
                            minHeight: 44,
                            fontWeight: 600,
                        }}
                    >
                        {product.name}
                    </Typography>

                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            flexWrap: "wrap",
                            justifyContent: "space-between",
                            gap: 0.5,
                            mt: 1,
                        }}
                    >
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                            }}
                        >
                            <Rating
                                value={
                                    product.reviewCount
                                        ? product.avgRating
                                        : 0
                                }
                                precision={0.5}
                                readOnly
                                size="small"
                                sx={{
                                    "& .MuiRating-iconEmpty": {
                                        color: dark
                                            ? "#aeb8c8"
                                            : "#a5afbd",
                                    },
                                }}
                                aria-label={
                                    product.reviewCount
                                        ? `${product.avgRating.toFixed(1)} trên 5 sao`
                                        : "Chưa có đánh giá"
                                }
                            />

                            {product.reviewCount > 0 && (
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                >
                                    {product.avgRating.toFixed(1)}
                                </Typography>
                            )}
                        </Box>

                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontSize: "0.7rem" }}
                        >
                            Đã bán{" "}
                            {product.soldCount.toLocaleString("vi-VN")}
                        </Typography>
                    </Box>

                    <Typography
                        sx={{
                            mt: 1.25,
                            fontWeight: 700,
                            color: home
                                ? "productCard.price"
                                : "primary.main",
                            fontVariantNumeric: "tabular-nums",
                        }}
                    >
                        {money(product.price)}
                    </Typography>

                    {saving > 0 && (
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: 0.75,
                                mt: 0.25,
                            }}
                        >
                            <Typography
                                component="del"
                                variant="caption"
                                color="text.secondary"
                            >
                                {money(product.originalPrice!)}
                            </Typography>
                        </Box>
                    )}

                    {!product.stock && (
                        <Typography
                            component="div"
                            variant="caption"
                            color="warning.main"
                        >
                            Hết hàng
                        </Typography>
                    )}
                </CardContent>
            </CardActionArea>
        </ProductCardSurface>
    );
}
