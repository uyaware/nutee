import { useEffect, useState } from "react";
import {
    Box,
    Breadcrumbs,
    Button,
    Chip,
    Dialog,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    Link as MuiLink,
    Paper,
    Rating,
    MenuItem,
    TextField,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
    Tooltip,
    Typography,
} from "@mui/material";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import OpenInFullRounded from "@mui/icons-material/OpenInFullRounded";
import ChevronLeftRounded from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import CheckCircleOutlineRounded from "@mui/icons-material/CheckCircleOutlineRounded";
import { Link, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { services } from "@/app/services";
import {
    EmptyState,
    ErrorState,
    LoadingState,
} from "@/shared/components/Feedback";
import { money } from "@/shared/lib/format";
import { ServiceError } from "@/shared/lib/errors";
import type { ProductDetail } from "@/modules/catalog/model/types";
import { ProductImage } from "@/modules/catalog/components/ProductImage";
import { AddToCart } from "@/modules/cart/components/AddToCart";
import { ProductReviews } from "@/modules/catalog/components/ProductReviews";

function ProductGallery({ product }: { product: ProductDetail }) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [zoomed, setZoomed] = useState(false);
    const selected = product.images[selectedIndex];
    const changeImage = (direction: number) =>
        setSelectedIndex(
            (index) =>
                (index + direction + product.images.length) %
                product.images.length,
        );
    return (
        <Stack spacing={2} sx={{ minWidth: 0 }}>
            <Box
                sx={{
                    position: "relative",
                    borderRadius: 2,
                    bgcolor: "background.default",
                    p: { xs: 3, sm: 5 },
                    height: { xs: 280, sm: 380, lg: 440 },
                }}
            >
                <ProductImage
                    src={selected?.url ?? product.imageUrl}
                    alt={product.name}
                    eager
                />
                <Tooltip title="Phóng to ảnh">
                    <IconButton
                        aria-label="Phóng to ảnh sản phẩm"
                        onClick={() => setZoomed(true)}
                        sx={{
                            position: "absolute",
                            top: 12,
                            right: 12,
                            bgcolor: "background.paper",
                        }}
                    >
                        <OpenInFullRounded fontSize="small" />
                    </IconButton>
                </Tooltip>
                {product.images.length > 1 && (
                    <>
                        <IconButton
                            aria-label="Ảnh trước"
                            onClick={() => changeImage(-1)}
                            sx={{
                                position: "absolute",
                                left: 8,
                                top: "calc(50% - 22px)",
                                bgcolor: "background.paper",
                            }}
                        >
                            <ChevronLeftRounded />
                        </IconButton>
                        <IconButton
                            aria-label="Ảnh tiếp theo"
                            onClick={() => changeImage(1)}
                            sx={{
                                position: "absolute",
                                right: 8,
                                top: "calc(50% - 22px)",
                                bgcolor: "background.paper",
                            }}
                        >
                            <ChevronRightRounded />
                        </IconButton>
                        <Typography
                            variant="caption"
                            sx={{
                                position: "absolute",
                                bottom: 12,
                                left: "50%",
                                transform: "translateX(-50%)",
                                px: 1.5,
                                py: 0.5,
                                borderRadius: 2,
                                bgcolor: "background.paper",
                                color: "text.secondary",
                            }}
                        >
                            {selectedIndex + 1} / {product.images.length}
                        </Typography>
                    </>
                )}
            </Box>
            <Stack
                direction="row"
                gap={1.5}
                justifyContent="center"
                useFlexGap
                flexWrap="wrap"
                aria-label="Chọn ảnh sản phẩm"
            >
                {product.images.map((image, index) => (
                    <Button
                        key={image.id}
                        aria-label={`Xem ảnh sản phẩm ${index + 1}`}
                        aria-pressed={selectedIndex === index}
                        onClick={() => setSelectedIndex(index)}
                        variant="outlined"
                        sx={{
                            minWidth: 72,
                            width: 72,
                            height: 72,
                            p: 1,
                            bgcolor:
                                selectedIndex === index
                                    ? "action.selected"
                                    : "background.paper",
                            borderColor:
                                selectedIndex === index
                                    ? "primary.main"
                                    : "divider",
                            borderWidth: selectedIndex === index ? 2 : 1,
                        }}
                    >
                        <ProductImage src={image.url} alt="" />
                    </Button>
                ))}
            </Stack>
            <Dialog
                open={zoomed}
                onClose={() => setZoomed(false)}
                fullWidth
                maxWidth="md"
                aria-labelledby="product-image-title"
            >
                <DialogTitle id="product-image-title" sx={{ pr: 8 }}>
                    {product.name}
                    <IconButton
                        aria-label="Đóng ảnh phóng to"
                        onClick={() => setZoomed(false)}
                        sx={{ position: "absolute", top: 8, right: 8 }}
                    >
                        <CloseRounded />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ height: { xs: 300, sm: 520 } }}>
                        <ProductImage
                            src={selected?.url ?? product.imageUrl}
                            alt={product.name}
                            eager
                        />
                    </Box>
                </DialogContent>
            </Dialog>
        </Stack>
    );
}

export default function ProductDetailPage() {
    const [variantId, setVariantId] = useState<number | null>(null);
    const { id = "" } = useParams();
    const location = useLocation();
    const query = useQuery({
        queryKey: ["catalog", "detail", id],
        queryFn: () => services.catalog.detail(id),
    });
    const state = location.state as { catalogReturnTo?: unknown } | null;
    const returnTo =
        typeof state?.catalogReturnTo === "string" &&
        /^\/products(?:\?|$)/.test(state.catalogReturnTo)
            ? state.catalogReturnTo
            : "/products";
    useEffect(() => {
        document.title = query.data
            ? `${query.data.name} · NUTEE`
            : "Chi tiết sản phẩm · NUTEE";
    }, [query.data, id]);
    if (query.isPending) return <LoadingState />;
    if (query.isError)
        return (
            <Stack spacing={3}>
                {query.error instanceof ServiceError &&
                query.error.code === "NOT_FOUND" ? (
                    <EmptyState
                        title="Không tìm thấy sản phẩm"
                        description="Sản phẩm không tồn tại hoặc đã ngừng hiển thị."
                    />
                ) : (
                    <ErrorState
                        error={query.error}
                        retry={() => void query.refetch()}
                    />
                )}
                <Button component={Link} to={returnTo}>
                    Quay lại danh sách
                </Button>
            </Stack>
        );
    const detail = query.data;
    const variant =
        detail.variants.find(
            (item) =>
                item.id ===
                (variantId ??
                    Number(
                        new URLSearchParams(location.search).get("variant"),
                    )),
        ) ??
        detail.variants.find((item) => item.id === detail.defaultVariantId) ??
        detail.variants.find((item) => item.quantity > 0) ??
        detail.variants[0];
    const variantImage = detail.images.find(
        (image) => image.id === String(variant?.imageId),
    );
    const product = {
        ...detail,
        price: variant?.price ?? detail.price,
        originalPrice:
            variant?.originalPrice ?? variant?.price ?? detail.originalPrice,
        promotionCode: variant?.promotionCode ?? null,
        stock: variant?.quantity ?? detail.stock,
        sku: variant?.sku ?? detail.sku,
        specifications: variant?.specifications ?? detail.specifications,
        imageUrl: variantImage?.url ?? detail.imageUrl,
        images: variantImage
            ? [
                  variantImage,
                  ...detail.images.filter(
                      (image) => image.id !== variantImage.id,
                  ),
              ]
            : detail.images,
    };
    return (
        <Stack spacing={3} sx={{ maxWidth: 1240, mx: "auto" }}>
            <Breadcrumbs
                aria-label="Đường dẫn danh mục"
                sx={{ fontSize: 13, overflowWrap: "anywhere" }}
            >
                <MuiLink component={Link} to="/" color="text.secondary">
                    Trang chủ
                </MuiLink>
                {product.breadcrumb.map((category) => (
                    <MuiLink
                        key={category.id}
                        component={Link}
                        to={`/products?category=${encodeURIComponent(category.id)}`}
                        color="text.secondary"
                    >
                        {category.name}
                    </MuiLink>
                ))}
                <Typography variant="body2" color="text.primary">
                    {product.name}
                </Typography>
            </Breadcrumbs>
            <Paper
                variant="outlined"
                sx={{ p: { xs: 2, sm: 3, lg: 4 }, borderRadius: 2 }}
            >
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: {
                            xs: "minmax(0, 1fr)",
                            md: "minmax(0, 1.1fr) minmax(0, 1fr)",
                        },
                        gap: { xs: 3, md: 5 },
                        alignItems: "start",
                    }}
                >
                    <ProductGallery
                        key={`${id}:${variant?.id}`}
                        product={product}
                    />
                    <Stack
                        spacing={2.5}
                        sx={{
                            minWidth: 0,
                            overflowWrap: "anywhere",
                            py: { md: 1 },
                        }}
                    >
                        <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            gap={2}
                        >
                            {product.brandId && product.brandName && (
                                <MuiLink
                                    component={Link}
                                    to={`/products?brand=${encodeURIComponent(product.brandId)}`}
                                    sx={{ fontWeight: 600, fontSize: 13 }}
                                >
                                    {product.brandName}
                                </MuiLink>
                            )}
                        </Stack>
                        <Box>
                            <Typography
                                component="h1"
                                sx={{
                                    fontSize: { xs: 26, sm: 32 },
                                    lineHeight: 1.25,
                                    fontWeight: 700,
                                    letterSpacing: "-0.035em",
                                }}
                            >
                                {product.name}
                            </Typography>
                            <Stack
                                direction="row"
                                gap={1}
                                alignItems="center"
                                sx={{ mt: 1.5 }}
                                useFlexGap
                                flexWrap="wrap"
                            >
                                <Rating
                                    value={product.rating.average}
                                    precision={0.1}
                                    readOnly
                                    size="small"
                                    aria-label={`${product.rating.average.toFixed(1)} trên 5 sao`}
                                />
                                <MuiLink
                                    href="#product-reviews"
                                    sx={{ fontSize: 13 }}
                                >
                                    {product.rating.count
                                        ? `${product.rating.average.toFixed(1)} · ${product.rating.count} đánh giá`
                                        : "Chưa có đánh giá"}
                                </MuiLink>
                            </Stack>
                        </Box>
                        {product.description && (
                            <Typography color="text.secondary">
                                {product.description}
                            </Typography>
                        )}
                        {detail.variants.length > 0 && (
                            <TextField
                                select
                                label="Phiên bản"
                                value={variant?.id ?? ""}
                                onChange={(event) =>
                                    setVariantId(Number(event.target.value))
                                }
                            >
                                {detail.variants.map((item) => {
                                    const configuration =
                                        item.specifications.find(
                                            (spec) =>
                                                spec.key === "configuration",
                                        )?.value;
                                    return (
                                        <MenuItem
                                            key={item.id}
                                            value={item.id}
                                            sx={{
                                                whiteSpace: "normal",
                                                overflowWrap: "anywhere",
                                            }}
                                        >
                                            {configuration
                                                ? `${configuration} · `
                                                : ""}
                                            {item.sku} · {money(item.price)}
                                            {item.quantity === 0
                                                ? " · Hết hàng"
                                                : ""}
                                        </MenuItem>
                                    );
                                })}
                            </TextField>
                        )}
                        <Box
                            sx={{
                                p: 2.5,
                                borderRadius: 2,
                                bgcolor: "action.selected",
                            }}
                        >
                            <Typography variant="body2" color="text.secondary">
                                Giá bán
                            </Typography>
                            <Typography
                                component="p"
                                color="primary.main"
                                sx={{
                                    fontSize: { xs: 30, sm: 36 },
                                    fontWeight: 700,
                                    lineHeight: 1.4,
                                    letterSpacing: "-0.04em",
                                    fontVariantNumeric: "tabular-nums",
                                }}
                            >
                                {money(product.price)}
                            </Typography>
                            {product.originalPrice !== undefined &&
                                product.originalPrice > product.price && (
                                    <Stack
                                        direction="row"
                                        spacing={1}
                                        alignItems="center"
                                    >
                                        <Typography
                                            sx={{
                                                textDecoration: "line-through",
                                            }}
                                            color="text.secondary"
                                        >
                                            {money(product.originalPrice)}
                                        </Typography>
                                        <Chip
                                            size="small"
                                            label={`Promotion ${product.promotionCode}`}
                                            color="success"
                                            variant="outlined"
                                        />
                                    </Stack>
                                )}
                            <Stack
                                direction="row"
                                gap={0.75}
                                alignItems="center"
                                sx={{ mt: 0.5 }}
                            >
                                <CheckCircleOutlineRounded
                                    aria-hidden="true"
                                    sx={{
                                        fontSize: 17,
                                        color: product.stock
                                            ? "success.main"
                                            : "warning.main",
                                    }}
                                />
                                <Typography
                                    variant="body2"
                                    color={
                                        product.stock
                                            ? "success.main"
                                            : "warning.main"
                                    }
                                >
                                    {product.stock
                                        ? "Còn hàng · Sẵn sàng đặt mua"
                                        : "Tạm hết hàng"}
                                </Typography>
                            </Stack>
                        </Box>
                        {product.specifications.length > 0 && (
                            <Stack spacing={1.5}>
                                <Typography variant="body2" fontWeight={600}>
                                    Cấu hình sản phẩm
                                </Typography>
                                <Typography>
                                    {product.specifications[0].value}
                                </Typography>
                                {product.specifications.length > 1 && (
                                    <Stack
                                        direction="row"
                                        gap={1}
                                        useFlexGap
                                        flexWrap="wrap"
                                    >
                                        {product.specifications
                                            .slice(1, 4)
                                            .map((spec) => (
                                                <Chip
                                                    key={spec.key}
                                                    label={`${spec.label}: ${spec.value}`}
                                                    variant="outlined"
                                                    size="small"
                                                />
                                            ))}
                                    </Stack>
                                )}
                            </Stack>
                        )}
                        <Divider />
                        <AddToCart
                            key={`${product.id}:${variant?.id}`}
                            variantId={variant ? String(variant.id) : undefined}
                            stock={variant?.quantity ?? 0}
                        />
                        <Button
                            component={Link}
                            to={returnTo}
                            startIcon={<ArrowBackRounded />}
                            color="secondary"
                            sx={{ alignSelf: "flex-start" }}
                        >
                            Tiếp tục xem sản phẩm
                        </Button>
                    </Stack>
                </Box>
            </Paper>
            <Stack
                direction="row"
                gap={1}
                useFlexGap
                flexWrap="wrap"
                component="nav"
                aria-label="Nội dung sản phẩm"
                sx={{
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    pb: 1,
                }}
            >
                <Button
                    component="a"
                    href="#product-specifications"
                    color="secondary"
                >
                    Thông số kỹ thuật
                </Button>
                <Button component="a" href="#product-reviews" color="secondary">
                    Đánh giá ({product.rating.count})
                </Button>
            </Stack>
            <Paper
                component="section"
                id="product-specifications"
                variant="outlined"
                aria-labelledby="product-specs-title"
                sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: 2 }}
            >
                <Typography
                    id="product-specs-title"
                    variant="h2"
                    sx={{ mb: 2 }}
                >
                    Thông số kỹ thuật
                </Typography>
                {!product.specifications.length ? (
                    <Typography color="text.secondary">
                        Thông số đang được cập nhật.
                    </Typography>
                ) : (
                    <TableContainer>
                        <Table
                            aria-label="Thông số kỹ thuật"
                            sx={{ tableLayout: "fixed" }}
                        >
                            <TableBody>
                                {product.specifications.map((spec, index) => (
                                    <TableRow
                                        key={`${spec.key}-${index}`}
                                        sx={{
                                            bgcolor:
                                                index % 2 === 0
                                                    ? "background.default"
                                                    : "transparent",
                                            "&:last-child td, &:last-child th":
                                                { borderBottom: 0 },
                                        }}
                                    >
                                        <TableCell
                                            component="th"
                                            scope="row"
                                            sx={{
                                                width: { xs: "38%", sm: "30%" },
                                                fontWeight: 500,
                                                color: "text.secondary",
                                                overflowWrap: "anywhere",
                                            }}
                                        >
                                            {spec.label}
                                        </TableCell>
                                        <TableCell
                                            sx={{
                                                fontWeight: 500,
                                                overflowWrap: "anywhere",
                                            }}
                                        >
                                            {spec.value}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>
            <ProductReviews key={id} id={id} rating={product.rating} />
        </Stack>
    );
}
