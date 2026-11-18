import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Alert,
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Button,
    Checkbox,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    MenuItem,
    Radio,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import SaveOutlined from "@mui/icons-material/SaveOutlined";
import AddRounded from "@mui/icons-material/AddRounded";
import AddPhotoAlternateOutlined from "@mui/icons-material/AddPhotoAlternateOutlined";
import EditOutlined from "@mui/icons-material/EditOutlined";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import ImageOutlined from "@mui/icons-material/ImageOutlined";
import CategoryOutlined from "@mui/icons-material/CategoryOutlined";
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import CloseRounded from "@mui/icons-material/CloseRounded";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "@/app/services";
import { useSession } from "@/modules/auth/hooks/useSession";
import {
    AdminConfirm,
    AdminPageHeader,
    AdminSection,
} from "@/modules/management/components/AdminUI";
import type {
    ManagementProduct,
    ProductImage,
    ProductVariant,
    Specification,
    TaxonomyOption,
} from "@/modules/management/products/model/managementProduct";
import { ErrorState, LoadingState } from "@/shared/components/Feedback";
import { reportSuccessToast } from "@/shared/lib/successToast";

export default function ConnectedProductEditorPage() {
    const { id } = useParams();
    const session = useSession("backoffice");
    const product = useQuery({
        queryKey: ["management", session.data?.id, "product", id],
        queryFn: () =>
            api.request<ManagementProduct>(`/management/products/${id}`),
        enabled: !!id,
        retry: false,
    });
    const brands = useQuery({
        queryKey: ["management", session.data?.id, "taxonomy", "brands", ""],
        queryFn: () =>
            api.request<TaxonomyOption[]>("/management/taxonomy/brands"),
        retry: false,
    });
    const categories = useQuery({
        queryKey: [
            "management",
            session.data?.id,
            "taxonomy",
            "categories",
            "",
        ],
        queryFn: () =>
            api.request<TaxonomyOption[]>("/management/taxonomy/categories"),
        retry: false,
    });
    if (brands.isPending || categories.isPending || (!!id && product.isPending))
        return <LoadingState />;
    if (brands.isError) return <ErrorState error={brands.error} />;
    if (categories.isError) return <ErrorState error={categories.error} />;
    if (id && product.isError) return <ErrorState error={product.error} />;
    return (
        <ProductEditor
            key={id ?? "new"}
            product={id ? product.data : undefined}
            brands={brands.data}
            categories={categories.data}
        />
    );
}

function ProductEditor({
    product,
    brands,
    categories,
}: {
    product?: ManagementProduct;
    brands: TaxonomyOption[];
    categories: TaxonomyOption[];
}) {
    const navigate = useNavigate();
    const client = useQueryClient();
    const [name, setName] = useState(product?.name ?? "");
    const [description, setDescription] = useState(product?.description ?? "");
    const [published, setPublished] = useState(product?.published ?? false);
    const [brandId, setBrandId] = useState(product?.brandId?.toString() ?? "");
    const [categoryIds, setCategoryIds] = useState<number[]>(
        product?.categoryIds ?? [],
    );
    const [defaultVariantId, setDefaultVariantId] = useState(
        product?.defaultVariantId?.toString() ?? "",
    );
    const [variantDraft, setVariantDraft] = useState<
        ProductVariant | "new" | null
    >(null);
    const [imageDraft, setImageDraft] = useState<ProductImage | "new" | null>(
        null,
    );
    const [deleting, setDeleting] = useState<{
        kind: "variants" | "images";
        id: number;
        label: string;
    } | null>(null);
    const refresh = async () => {
        await Promise.all([
            client.invalidateQueries({ queryKey: ["management"] }),
            client.invalidateQueries({ queryKey: ["catalog"] }),
        ]);
    };
    const save = useMutation({
        mutationFn: () =>
            api.request<ManagementProduct>(
                product
                    ? `/management/products/${product.id}`
                    : "/management/products",
                {
                    method: product ? "PUT" : "POST",
                    body: {
                        name: name.trim(),
                        description,
                        published,
                        brandId: brandId ? Number(brandId) : null,
                        categoryIds,
                        defaultVariantId: defaultVariantId
                            ? Number(defaultVariantId)
                            : null,
                    },
                },
            ),
        onSuccess: async (saved) => {
            reportSuccessToast(product ? "Đã lưu thay đổi sản phẩm." : "Đã tạo sản phẩm.");
            await refresh();
            if (!product)
                navigate(`/management/products/${saved.id}/edit`, {
                    replace: true,
                });
        },
    });
    const remove = useMutation({
        mutationFn: (item: NonNullable<typeof deleting>) =>
            api.request<void>(
                `/management/products/${product!.id}/${item.kind}/${item.id}`,
                { method: "DELETE" },
            ),
        onSuccess: async (_, item) => {
            reportSuccessToast(item.kind === "images" ? "Đã xóa ảnh sản phẩm." : "Đã xóa biến thể.");
            setDeleting(null);
            await refresh();
        },
        onError: () => setDeleting(null),
    });
    const primary = useMutation({
        mutationFn: (image: ProductImage) => api.request(`/management/products/${product!.id}/images/${image.id}`, {
            method: "PUT", body: { url: image.url, primary: true },
        }),
        onSuccess: async () => {
            reportSuccessToast("Đã cập nhật ảnh chính.");
            await refresh();
        },
    });
    const primaryVariant = useMutation({
        mutationFn: (variantId: number) => api.request<ManagementProduct>(
            `/management/products/${product!.id}/default-variant/${variantId}`,
            { method: "PUT" },
        ),
        onSuccess: async (saved) => {
            reportSuccessToast("Đã cập nhật biến thể chính.");
            setDefaultVariantId(String(saved.defaultVariantId ?? ""));
            await refresh();
        },
    });
    const orderedCategories: { category: TaxonomyOption; depth: number }[] = [];
    const visited = new Set<number>();
    const appendCategory = (category: TaxonomyOption, depth: number) => {
        if (visited.has(category.id)) return;
        visited.add(category.id);
        orderedCategories.push({ category, depth });
        categories.filter((child) => child.parentId === category.id).forEach((child) => appendCategory(child, depth + 1));
    };
    categories.filter((category) => category.parentId == null || !categories.some((parent) => parent.id === category.parentId)).forEach((category) => appendCategory(category, 0));
    categories.forEach((category) => appendCategory(category, 0));
    return (
        <Stack spacing={3}>
            <AdminPageHeader
                title={product ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm"}
                description="Quản lý thông tin, ảnh và các biến thể."
                action={
                    <Button component={Link} to="/management/products" variant="outlined" startIcon={<ArrowBackRounded />}>
                        Về danh sách
                    </Button>
                }
            />
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) minmax(0, 1fr)" }, gap: 3, alignItems: "start" }}>
            <Stack spacing={3}>
            <Stack
                component="form"
                spacing={2}
                onSubmit={(event) => {
                    event.preventDefault();
                    save.mutate();
                }}
            >
                <AdminSection title="Thông tin sản phẩm" description="Thông tin cơ bản và danh mục hiển thị trên cửa hàng.">
                    {save.isError && <ErrorState error={save.error} />}
                    <TextField
                        required
                        label="Tên sản phẩm"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        slotProps={{ htmlInput: { maxLength: 255 } }}
                    />
                    <TextField
                        label="Mô tả"
                        multiline
                        minRows={3}
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                    />
                    <TextField
                        select
                        label="Thương hiệu"
                        value={brandId}
                        onChange={(event) => setBrandId(event.target.value)}
                    >
                        <MenuItem value="">Không chọn</MenuItem>
                        {brands.map((brand) => (
                            <MenuItem key={brand.id} value={String(brand.id)}>
                                {brand.name}
                            </MenuItem>
                        ))}
                    </TextField>
                    <Accordion disableGutters variant="outlined" sx={{ borderRadius: "8px !important", "&:before": { display: "none" }, overflow: "hidden" }}>
                    <AccordionSummary expandIcon={<ExpandMoreRounded />}>
                        <Stack direction="row" alignItems="center" spacing={1}><CategoryOutlined color="action" fontSize="small" /><Typography fontWeight={600}>Danh mục</Typography><Chip size="small" label={`${categoryIds.length} đã chọn`} /></Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                    <Stack role="group" aria-label="Danh mục" sx={{ maxHeight: 320, overflowY: "auto" }}>
                        {orderedCategories.map(({ category, depth }) => (
                            <FormControlLabel
                                sx={{ ml: depth * 3, mr: 0, borderLeft: depth ? "1px solid" : undefined, borderColor: "divider", pl: depth ? 1 : 0 }}
                                key={category.id}
                                label={category.name}
                                control={
                                    <Checkbox
                                        checked={categoryIds.includes(
                                            category.id,
                                        )}
                                        onChange={(_, checked) =>
                                            setCategoryIds((current) =>
                                                checked
                                                    ? [...current, category.id]
                                                    : current.filter(
                                                          (value) =>
                                                              value !==
                                                              category.id,
                                                      ),
                                            )
                                        }
                                    />
                                }
                            />
                        ))}
                    </Stack>
                    </AccordionDetails>
                    </Accordion>
                    <FormControlLabel
                        label="Công khai sản phẩm"
                        control={
                            <Checkbox
                                checked={published}
                                onChange={(_, checked) => setPublished(checked)}
                            />
                        }
                    />
                    <Button
                        type="submit"
                        variant="contained"
                        startIcon={<SaveOutlined />}
                        disabled={save.isPending || primaryVariant.isPending || !name.trim()}
                        sx={{ alignSelf: "flex-end" }}
                    >
                        Lưu sản phẩm
                    </Button>
                </AdminSection>
            </Stack>
            {product && (
                    <AdminSection title="Ảnh sản phẩm" description="Chọn ảnh chính và quản lý ảnh dùng cho các biến thể.">
                        {primary.isError && <ErrorState error={primary.error} />}
                        {product.images.length > 0 && <Typography variant="body2" color="text.secondary" sx={{ width: 90, textAlign: "center" }}>Ảnh chính</Typography>}
                        {product.images.map((image) => (
                            <Stack
                                key={image.id}
                                direction="row"
                                gap={1}
                                alignItems="center"
                                flexWrap="wrap"
                                sx={{ p: 1.5, border: "1px solid", borderColor: image.primary ? "primary.light" : "divider", bgcolor: image.primary ? "action.selected" : "background.paper", borderRadius: 2 }}
                            >
                                <Box sx={{ width: 90, textAlign: "center" }}><Radio checked={image.primary} onChange={() => primary.mutate(image)} disabled={primary.isPending} inputProps={{ "aria-label": `Chọn ảnh ${image.id} làm ảnh chính` }} /></Box>
                                <Box component="img" src={image.url} alt="Ảnh sản phẩm" sx={{ width: 80, height: 80, objectFit: "contain", borderRadius: 1, bgcolor: "action.hover", mr: "auto" }} />
                                <Stack direction="row" sx={{ ml: "auto" }}>
                                    <Button size="small" startIcon={<EditOutlined />} onClick={() => setImageDraft(image)}>
                                        Sửa
                                    </Button>
                                    <Button
                                        color="error"
                                        size="small"
                                        startIcon={<DeleteOutlineRounded />}
                                        onClick={() => {
                                            remove.reset();
                                            setDeleting({
                                                kind: "images",
                                                id: image.id,
                                                label: image.url,
                                            });
                                        }}
                                    >
                                        Xóa
                                    </Button>
                                </Stack>
                            </Stack>
                        ))}
                        {product.images.length === 0 && <Stack alignItems="center" spacing={1} sx={{ py: 3, color: "text.secondary", border: "1px dashed", borderColor: "divider", borderRadius: 2 }}><ImageOutlined sx={{ fontSize: 36 }} /><Typography>Chưa có ảnh sản phẩm</Typography></Stack>}
                        <Button
                            onClick={() => setImageDraft("new")}
                            variant="outlined"
                            startIcon={<AddPhotoAlternateOutlined />}
                            sx={{ alignSelf: "flex-start" }}
                        >
                            Thêm ảnh
                        </Button>
                    </AdminSection>
            )}
            </Stack>
            <Stack spacing={3}>
            {product ? (
                <>
                    {remove.isError && <ErrorState error={remove.error} />}
                    {primaryVariant.isError && <ErrorState error={primaryVariant.error} />}
                    <AdminSection title="Biến thể" description="Quản lý cấu hình, giá bán và số lượng tồn kho.">
                        {product.variants.length > 0 && <Typography variant="body2" color="text.secondary" sx={{ width: 100, textAlign: "center" }}>Biến thể chính</Typography>}
                        {product.variants.map((variant) => (
                            <Stack
                                key={variant.id}
                                direction="row"
                                gap={1}
                                alignItems="center"
                                flexWrap="wrap"
                                sx={{ p: 1.5, border: "1px solid", borderColor: defaultVariantId === String(variant.id) ? "primary.light" : "divider", bgcolor: defaultVariantId === String(variant.id) ? "action.selected" : "background.paper", borderRadius: 2 }}
                            >
                                <Box sx={{ width: 100, textAlign: "center" }}><Radio checked={defaultVariantId === String(variant.id)} onChange={() => primaryVariant.mutate(variant.id)} disabled={primaryVariant.isPending || save.isPending} inputProps={{ "aria-label": `Chọn ${variant.sku} làm biến thể chính` }} /></Box>
                                {product.images.find((image) => image.id === variant.imageId) && <Box component="img" src={product.images.find((image) => image.id === variant.imageId)!.url} alt="" sx={{ width: 64, height: 64, objectFit: "contain", borderRadius: 1, bgcolor: "action.hover" }} />}
                                <Box sx={{ flex: 1, minWidth: 160 }}>
                                    <Button onClick={() => setVariantDraft(variant)} sx={{ p: 0 }}>{variant.sku}</Button>
                                    <Typography variant="body2" color="text.secondary">{variant.specifications.map((spec) => `${spec.name}: ${spec.value}`).join(" · ") || "Chưa có cấu hình"}</Typography>
                                    <Typography variant="body2">{variant.price.toLocaleString("vi-VN")} ₫ · Tồn {variant.quantity}</Typography>
                                </Box>
                                <Stack direction="row" sx={{ ml: "auto" }}>
                                    <Button
                                        onClick={() => setVariantDraft(variant)}
                                        size="small"
                                        startIcon={<EditOutlined />}
                                    >
                                        Sửa
                                    </Button>
                                    <Button
                                        color="error"
                                        size="small"
                                        startIcon={<DeleteOutlineRounded />}
                                        onClick={() => {
                                            remove.reset();
                                            setDeleting({
                                                kind: "variants",
                                                id: variant.id,
                                                label: variant.sku,
                                            });
                                        }}
                                    >
                                        Xóa
                                    </Button>
                                </Stack>
                            </Stack>
                        ))}
                        {product.variants.length === 0 && <Stack alignItems="center" spacing={1} sx={{ py: 4, color: "text.secondary", border: "1px dashed", borderColor: "divider", borderRadius: 2 }}><Inventory2Outlined sx={{ fontSize: 36 }} /><Typography>Chưa có biến thể</Typography><Typography variant="body2">Thêm biến thể để quản lý giá và tồn kho.</Typography></Stack>}
                        <Button
                            onClick={() => setVariantDraft("new")}
                            variant="outlined"
                            startIcon={<AddRounded />}
                            sx={{ alignSelf: "flex-start" }}
                        >
                            Thêm biến thể
                        </Button>
                    </AdminSection>
                    {variantDraft && (
                        <VariantDialog
                            product={product}
                            variant={
                                variantDraft === "new"
                                    ? undefined
                                    : variantDraft
                            }
                            onClose={() => setVariantDraft(null)}
                            onSaved={refresh}
                        />
                    )}
                    {imageDraft && (
                        <ImageDialog
                            product={product}
                            image={
                                imageDraft === "new" ? undefined : imageDraft
                            }
                            onClose={() => setImageDraft(null)}
                            onSaved={refresh}
                        />
                    )}
                    <AdminConfirm
                        open={!!deleting}
                        title="Xác nhận xóa?"
                        description={deleting?.label ?? ""}
                        label="Xóa"
                        danger
                        onClose={() => setDeleting(null)}
                        onConfirm={() => {
                            if (deleting) remove.mutate(deleting);
                        }}
                    />
                </>
            ) : (
                <Alert severity="info">
                    Lưu sản phẩm trước, sau đó thêm ảnh và biến thể.
                </Alert>
            )}
            </Stack>
            </Box>
        </Stack>
    );
}

function VariantDialog({
    product,
    variant,
    onClose,
    onSaved,
}: {
    product: ManagementProduct;
    variant?: ProductVariant;
    onClose: () => void;
    onSaved: () => Promise<void>;
}) {
    const [sku, setSku] = useState(variant?.sku ?? "");
    const [price, setPrice] = useState(String(variant?.price ?? 0));
    const [quantity, setQuantity] = useState(String(variant?.quantity ?? 0));
    const [imageId, setImageId] = useState(variant?.imageId?.toString() ?? "");
    const [specs, setSpecs] = useState<Specification[]>(
        variant?.specifications ?? [],
    );
    const save = useMutation({
        mutationFn: () =>
            api.request<ManagementProduct>(
                `/management/products/${product.id}/variants${variant ? `/${variant.id}` : ""}`,
                {
                    method: variant ? "PUT" : "POST",
                    body: {
                        sku: sku.trim(),
                        price: Number(price),
                        quantity: Number(quantity),
                        expectedQuantity: variant?.quantity ?? null,
                        imageId: imageId ? Number(imageId) : null,
                        specifications: specs,
                    },
                },
            ),
        onSuccess: async () => {
            reportSuccessToast(variant ? "Đã lưu biến thể." : "Đã thêm biến thể.");
            await onSaved();
            onClose();
        },
    });
    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="sm">
            <Stack
                component="form"
                onSubmit={(event) => {
                    event.preventDefault();
                    save.mutate();
                }}
            >
                <DialogTitle>
                    {variant ? "Sửa biến thể" : "Thêm biến thể"}
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ pt: 1 }}>
                        {save.isError && <ErrorState error={save.error} />}
                        <TextField
                            required
                            label="SKU"
                            value={sku}
                            onChange={(event) => setSku(event.target.value)}
                            slotProps={{ htmlInput: { maxLength: 16 } }}
                        />
                        <TextField
                            required
                            type="number"
                            label="Giá bán"
                            value={price}
                            onChange={(event) => setPrice(event.target.value)}
                            slotProps={{
                                htmlInput: { min: 0, max: 2147483647, step: 1 },
                            }}
                        />
                        <TextField
                            required
                            type="number"
                            label="Tồn kho"
                            value={quantity}
                            onChange={(event) =>
                                setQuantity(event.target.value)
                            }
                            slotProps={{
                                htmlInput: { min: 0, max: 2147483647, step: 1 },
                            }}
                        />
                        <Typography>Ảnh biến thể</Typography>
                        <Stack direction="row" flexWrap="wrap" gap={1} role="radiogroup" aria-label="Ảnh biến thể">
                            <FormControlLabel label="Không chọn" control={<Radio checked={!imageId} onChange={() => setImageId("")} />} />
                            {product.images.map((image) => (
                                <FormControlLabel
                                    key={image.id}
                                    label={<Box component="img" src={image.url} alt={image.primary ? "Ảnh chính" : `Ảnh ${image.id}`} sx={{ width: 72, height: 72, objectFit: "contain", bgcolor: "action.hover", borderRadius: 1 }} />}
                                    control={<Radio checked={imageId === String(image.id)} onChange={() => setImageId(String(image.id))} />}
                                />
                            ))}
                        </Stack>
                        <Typography>Thông số</Typography>
                        {specs.map((spec, index) => (
                            <Stack key={index} direction="row" gap={1}>
                                <TextField
                                    required
                                    label="Tên"
                                    value={spec.name}
                                    onChange={(event) =>
                                        setSpecs((current) =>
                                            current.map((item, i) =>
                                                i === index
                                                    ? {
                                                          ...item,
                                                          name: event.target
                                                              .value,
                                                      }
                                                    : item,
                                            ),
                                        )
                                    }
                                />
                                <TextField
                                    required
                                    label="Giá trị"
                                    value={spec.value}
                                    onChange={(event) =>
                                        setSpecs((current) =>
                                            current.map((item, i) =>
                                                i === index
                                                    ? {
                                                          ...item,
                                                          value: event.target
                                                              .value,
                                                      }
                                                    : item,
                                            ),
                                        )
                                    }
                                />
                                <Button
                                    color="error"
                                    startIcon={<DeleteOutlineRounded />}
                                    onClick={() =>
                                        setSpecs((current) =>
                                            current.filter(
                                                (_, i) => i !== index,
                                            ),
                                        )
                                    }
                                >
                                    Xóa
                                </Button>
                            </Stack>
                        ))}
                        <Button
                            onClick={() =>
                                setSpecs((current) => [
                                    ...current,
                                    { name: "", value: "" },
                                ])
                            }
                            startIcon={<AddRounded />}
                            sx={{ alignSelf: "flex-start" }}
                        >
                            Thêm thông số
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} startIcon={<CloseRounded />}>Hủy</Button>
                    <Button
                        type="submit"
                        variant="contained"
                        startIcon={<SaveOutlined />}
                        disabled={save.isPending || !sku.trim()}
                    >
                        Lưu
                    </Button>
                </DialogActions>
            </Stack>
        </Dialog>
    );
}

function ImageDialog({
    product,
    image,
    onClose,
    onSaved,
}: {
    product: ManagementProduct;
    image?: ProductImage;
    onClose: () => void;
    onSaved: () => Promise<void>;
}) {
    const [url, setUrl] = useState(image?.url ?? "");
    const [primary, setPrimary] = useState(image?.primary ?? false);
    const save = useMutation({
        mutationFn: () =>
            api.request<ManagementProduct>(
                `/management/products/${product.id}/images${image ? `/${image.id}` : ""}`,
                {
                    method: image ? "PUT" : "POST",
                    body: { url: url.trim(), primary },
                },
            ),
        onSuccess: async () => {
            reportSuccessToast(image ? "Đã lưu ảnh sản phẩm." : "Đã thêm ảnh sản phẩm.");
            await onSaved();
            onClose();
        },
    });
    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="sm">
            <Stack
                component="form"
                onSubmit={(event) => {
                    event.preventDefault();
                    save.mutate();
                }}
            >
                <DialogTitle>{image ? "Sửa ảnh" : "Thêm ảnh"}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ pt: 1 }}>
                        {save.isError && <ErrorState error={save.error} />}
                        <TextField
                            required
                            label="Đường dẫn ảnh"
                            helperText="URL http/https hoặc đường dẫn bắt đầu bằng /."
                            value={url}
                            onChange={(event) => setUrl(event.target.value)}
                        />
                        <FormControlLabel
                            label="Ảnh chính"
                            control={
                                <Checkbox
                                    checked={primary}
                                    onChange={(_, checked) =>
                                        setPrimary(checked)
                                    }
                                />
                            }
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} startIcon={<CloseRounded />}>Hủy</Button>
                    <Button
                        type="submit"
                        variant="contained"
                        startIcon={<SaveOutlined />}
                        disabled={save.isPending || !url.trim()}
                    >
                        Lưu
                    </Button>
                </DialogActions>
            </Stack>
        </Dialog>
    );
}
