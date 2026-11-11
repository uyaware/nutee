import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "@/app/services";
import { useSession } from "@/modules/auth/hooks/useSession";
import { AdminConfirm, AdminPageHeader, AdminSection } from "@/modules/management/components/AdminUI";
import type { ManagementProduct, ProductImage, ProductVariant, Specification, TaxonomyOption } from "@/modules/management/products/model/managementProduct";
import { ErrorState, LoadingState } from "@/shared/components/Feedback";
import { errorMessage } from "@/shared/lib/errors";

export default function ConnectedProductEditorPage() {
    const { id } = useParams();
    const session = useSession("backoffice");
    const product = useQuery({ queryKey: ["management", session.data?.id, "product", id], queryFn: () => api.request<ManagementProduct>(`/management/products/${id}`), enabled: !!id, retry: false });
    const brands = useQuery({ queryKey: ["management", session.data?.id, "taxonomy", "brands", ""], queryFn: () => api.request<TaxonomyOption[]>("/management/taxonomy/brands"), retry: false });
    const categories = useQuery({ queryKey: ["management", session.data?.id, "taxonomy", "categories", ""], queryFn: () => api.request<TaxonomyOption[]>("/management/taxonomy/categories"), retry: false });
    if (brands.isPending || categories.isPending || (!!id && product.isPending)) return <LoadingState />;
    if (brands.isError) return <ErrorState error={brands.error} />;
    if (categories.isError) return <ErrorState error={categories.error} />;
    if (id && product.isError) return <ErrorState error={product.error} />;
    return <ProductEditor key={id ?? "new"} product={id ? product.data : undefined} brands={brands.data} categories={categories.data} />;
}

function ProductEditor({ product, brands, categories }: { product?: ManagementProduct; brands: TaxonomyOption[]; categories: TaxonomyOption[] }) {
    const navigate = useNavigate();
    const client = useQueryClient();
    const [name, setName] = useState(product?.name ?? "");
    const [description, setDescription] = useState(product?.description ?? "");
    const [published, setPublished] = useState(product?.published ?? false);
    const [brandId, setBrandId] = useState(product?.brandId?.toString() ?? "");
    const [categoryIds, setCategoryIds] = useState<number[]>(product?.categoryIds ?? []);
    const [defaultVariantId, setDefaultVariantId] = useState(product?.defaultVariantId?.toString() ?? "");
    const [variantDraft, setVariantDraft] = useState<ProductVariant | "new" | null>(null);
    const [imageDraft, setImageDraft] = useState<ProductImage | "new" | null>(null);
    const [deleting, setDeleting] = useState<{ kind: "variants" | "images"; id: number; label: string } | null>(null);
    const refresh = async () => { await Promise.all([client.invalidateQueries({ queryKey: ["management"] }), client.invalidateQueries({ queryKey: ["catalog"] })]); };
    const save = useMutation({
        mutationFn: () => api.request<ManagementProduct>(product ? `/management/products/${product.id}` : "/management/products", {
            method: product ? "PUT" : "POST", body: { name: name.trim(), description, published, brandId: brandId ? Number(brandId) : null, categoryIds, defaultVariantId: defaultVariantId ? Number(defaultVariantId) : null },
        }),
        onSuccess: async (saved) => { await refresh(); if (!product) navigate(`/management/products/${saved.id}/edit`, { replace: true }); },
    });
    const remove = useMutation({
        mutationFn: (item: NonNullable<typeof deleting>) => api.request<void>(`/management/products/${product!.id}/${item.kind}/${item.id}`, { method: "DELETE" }),
        onSuccess: async () => { setDeleting(null); await refresh(); },
        onError: () => setDeleting(null),
    });
    return <Stack spacing={3}>
        <AdminPageHeader title={product ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm"} description="Quản lý thông tin, ảnh và các biến thể." action={<Button component={Link} to="/management/products">Về danh sách</Button>} />
        <Stack component="form" spacing={2} onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
            <AdminSection title="Thông tin sản phẩm">
                {save.isError && <Alert severity="error">{errorMessage(save.error)}</Alert>}
                <TextField required label="Tên sản phẩm" value={name} onChange={(event) => setName(event.target.value)} slotProps={{ htmlInput: { maxLength: 255 } }} />
                <TextField label="Mô tả" multiline minRows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
                <TextField select label="Thương hiệu" value={brandId} onChange={(event) => setBrandId(event.target.value)}>
                    <MenuItem value="">Không chọn</MenuItem>{brands.map((brand) => <MenuItem key={brand.id} value={String(brand.id)}>{brand.name}</MenuItem>)}
                </TextField>
                <Typography>Danh mục</Typography>
                <Stack direction="row" flexWrap="wrap">{categories.map((category) => <FormControlLabel key={category.id} label={category.name} control={<Checkbox checked={categoryIds.includes(category.id)} onChange={(_, checked) => setCategoryIds((current) => checked ? [...current, category.id] : current.filter((value) => value !== category.id))} />} />)}</Stack>
                <FormControlLabel label="Công khai sản phẩm" control={<Checkbox checked={published} onChange={(_, checked) => setPublished(checked)} />} />
                {product && <TextField select label="Biến thể mặc định" value={defaultVariantId} onChange={(event) => setDefaultVariantId(event.target.value)}>
                    <MenuItem value="">Chưa chọn</MenuItem>{product.variants.map((variant) => <MenuItem key={variant.id} value={String(variant.id)}>{variant.sku}</MenuItem>)}
                </TextField>}
                <Button type="submit" variant="contained" disabled={save.isPending || !name.trim()} sx={{ alignSelf: "flex-start" }}>Lưu sản phẩm</Button>
            </AdminSection>
        </Stack>
        {product ? <>
            {remove.isError && <Alert severity="error">{errorMessage(remove.error)}</Alert>}
            <AdminSection title="Ảnh sản phẩm">
                {product.images.map((image) => <Stack key={image.id} direction="row" gap={1} alignItems="center" flexWrap="wrap">
                    <Typography sx={{ overflowWrap: "anywhere", flex: 1 }}>{image.url}{image.primary ? " · Ảnh chính" : ""}</Typography>
                    <Button onClick={() => setImageDraft(image)}>Sửa</Button><Button color="error" onClick={() => { remove.reset(); setDeleting({ kind: "images", id: image.id, label: image.url }); }}>Xóa</Button>
                </Stack>)}
                <Button onClick={() => setImageDraft("new")} sx={{ alignSelf: "flex-start" }}>Thêm ảnh</Button>
            </AdminSection>
            <AdminSection title="Biến thể">
                {product.variants.map((variant) => <Stack key={variant.id} direction="row" gap={1} alignItems="center" flexWrap="wrap">
                    <Typography sx={{ flex: 1 }}>{variant.sku} · {variant.price.toLocaleString("vi-VN")} ₫ · Tồn {variant.quantity}</Typography>
                    <Button onClick={() => setVariantDraft(variant)}>Sửa</Button><Button color="error" onClick={() => { remove.reset(); setDeleting({ kind: "variants", id: variant.id, label: variant.sku }); }}>Xóa</Button>
                </Stack>)}
                <Button onClick={() => setVariantDraft("new")} sx={{ alignSelf: "flex-start" }}>Thêm biến thể</Button>
            </AdminSection>
            {variantDraft && <VariantDialog product={product} variant={variantDraft === "new" ? undefined : variantDraft} onClose={() => setVariantDraft(null)} onSaved={refresh} />}
            {imageDraft && <ImageDialog product={product} image={imageDraft === "new" ? undefined : imageDraft} onClose={() => setImageDraft(null)} onSaved={refresh} />}
            <AdminConfirm open={!!deleting} title="Xác nhận xóa?" description={deleting?.label ?? ""} label="Xóa" danger onClose={() => setDeleting(null)} onConfirm={() => { if (deleting) remove.mutate(deleting); }} />
        </> : <Alert severity="info">Lưu sản phẩm trước, sau đó thêm ảnh và biến thể.</Alert>}
    </Stack>;
}

function VariantDialog({ product, variant, onClose, onSaved }: { product: ManagementProduct; variant?: ProductVariant; onClose: () => void; onSaved: () => Promise<void> }) {
    const [sku, setSku] = useState(variant?.sku ?? "");
    const [price, setPrice] = useState(String(variant?.price ?? 0));
    const [quantity, setQuantity] = useState(String(variant?.quantity ?? 0));
    const [imageId, setImageId] = useState(variant?.imageId?.toString() ?? "");
    const [specs, setSpecs] = useState<Specification[]>(variant?.specifications ?? []);
    const save = useMutation({ mutationFn: () => api.request<ManagementProduct>(`/management/products/${product.id}/variants${variant ? `/${variant.id}` : ""}`, {
        method: variant ? "PUT" : "POST", body: { sku: sku.trim(), price: Number(price), quantity: Number(quantity), expectedQuantity: variant?.quantity ?? null, imageId: imageId ? Number(imageId) : null, specifications: specs },
    }), onSuccess: async () => { await onSaved(); onClose(); } });
    return <Dialog open onClose={onClose} fullWidth maxWidth="sm"><Stack component="form" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
        <DialogTitle>{variant ? "Sửa biến thể" : "Thêm biến thể"}</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
            {save.isError && <Alert severity="error">{errorMessage(save.error)}</Alert>}
            <TextField required label="SKU" value={sku} onChange={(event) => setSku(event.target.value)} slotProps={{ htmlInput: { maxLength: 16 } }} />
            <TextField required type="number" label="Giá bán" value={price} onChange={(event) => setPrice(event.target.value)} slotProps={{ htmlInput: { min: 0, max: 2147483647, step: 1 } }} />
            <TextField required type="number" label="Tồn kho" value={quantity} onChange={(event) => setQuantity(event.target.value)} slotProps={{ htmlInput: { min: 0, max: 2147483647, step: 1 } }} />
            <TextField select label="Ảnh biến thể" value={imageId} onChange={(event) => setImageId(event.target.value)}><MenuItem value="">Không chọn</MenuItem>{product.images.map((image) => <MenuItem key={image.id} value={String(image.id)}>{image.url}</MenuItem>)}</TextField>
            <Typography>Thông số</Typography>
            {specs.map((spec, index) => <Stack key={index} direction="row" gap={1}>
                <TextField required label="Tên" value={spec.name} onChange={(event) => setSpecs((current) => current.map((item, i) => i === index ? { ...item, name: event.target.value } : item))} />
                <TextField required label="Giá trị" value={spec.value} onChange={(event) => setSpecs((current) => current.map((item, i) => i === index ? { ...item, value: event.target.value } : item))} />
                <Button color="error" onClick={() => setSpecs((current) => current.filter((_, i) => i !== index))}>Xóa</Button>
            </Stack>)}
            <Button onClick={() => setSpecs((current) => [...current, { name: "", value: "" }])} sx={{ alignSelf: "flex-start" }}>Thêm thông số</Button>
        </Stack></DialogContent><DialogActions><Button onClick={onClose}>Hủy</Button><Button type="submit" variant="contained" disabled={save.isPending || !sku.trim()}>Lưu</Button></DialogActions>
    </Stack></Dialog>;
}

function ImageDialog({ product, image, onClose, onSaved }: { product: ManagementProduct; image?: ProductImage; onClose: () => void; onSaved: () => Promise<void> }) {
    const [url, setUrl] = useState(image?.url ?? "");
    const [primary, setPrimary] = useState(image?.primary ?? false);
    const save = useMutation({ mutationFn: () => api.request<ManagementProduct>(`/management/products/${product.id}/images${image ? `/${image.id}` : ""}`, {
        method: image ? "PUT" : "POST", body: { url: url.trim(), primary },
    }), onSuccess: async () => { await onSaved(); onClose(); } });
    return <Dialog open onClose={onClose} fullWidth maxWidth="sm"><Stack component="form" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
        <DialogTitle>{image ? "Sửa ảnh" : "Thêm ảnh"}</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
            {save.isError && <Alert severity="error">{errorMessage(save.error)}</Alert>}
            <TextField required label="Đường dẫn ảnh" helperText="URL http/https hoặc đường dẫn bắt đầu bằng /." value={url} onChange={(event) => setUrl(event.target.value)} />
            <FormControlLabel label="Ảnh chính" control={<Checkbox checked={primary} onChange={(_, checked) => setPrimary(checked)} />} />
        </Stack></DialogContent><DialogActions><Button onClick={onClose}>Hủy</Button><Button type="submit" variant="contained" disabled={save.isPending || !url.trim()}>Lưu</Button></DialogActions>
    </Stack></Dialog>;
}
