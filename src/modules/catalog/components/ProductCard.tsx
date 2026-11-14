import {
    Box,
    Card,
    CardActionArea,
    CardContent,
    Typography,
} from "@mui/material";
import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { trackEvent } from "@/shared/analytics/posthog";
import type { ProductSummary } from "@/shared/types/database";
import { money } from "@/shared/lib/format";
import { ProductImage } from "@/modules/catalog/components/ProductImage";

export function ProductCard({
    product,
    returnTo,
    dark = false,
    home = false,
    listId,
    index,
}: {
    product: ProductSummary;
    returnTo?: string;
    dark?: boolean;
    home?: boolean;
    listId: string;
    index: number;
}) {
    const cardRef = useRef<HTMLDivElement>(null);
    const trackedImpression = useRef<string | null>(null);
    const location = useLocation();
    const page = home ? "home" : "catalog";
    useEffect(() => {
        const element = cardRef.current;
        const key = `${location.key}:${listId}:${product.id}:${index}`;
        if (!element || typeof IntersectionObserver === "undefined" || trackedImpression.current === key) return;
        const observer = new IntersectionObserver((entries) => {
            if (trackedImpression.current === key || !entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5)) return;
            trackedImpression.current = key;
            trackEvent("product_impression", {
                product_id: String(product.id), list_id: listId, position: index + 1, page,
            });
            observer.disconnect();
        }, { threshold: 0.5 });
        observer.observe(element);
        return () => observer.disconnect();
    }, [location.key, listId, product.id, index, page]);
    return (
        <Card ref={cardRef} className={home ? `home-hover-border${dark ? "" : " home-hover-border-light"}` : undefined} sx={{ height: "100%", minWidth: 0, ...(dark && { bgcolor: "#141a25", color: "#f2f4f8", borderColor: "#38465c", "& .MuiTypography-colorTextSecondary": { color: "#b8c5d8" }, "& .MuiTypography-colorWarningMain": { color: "#ffca80" } }) }}>
            <CardActionArea
                component={Link}
                onClick={() => trackEvent("product_click", {
                    product_id: String(product.id), list_id: listId, position: index + 1, page,
                })}
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
                        bgcolor: dark ? "#1b2230" : "background.default",
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
                            color: dark ? "#a8c3ff" : "primary.main",
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
        </Card>
    );
}
