import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import ArrowUpwardRounded from "@mui/icons-material/ArrowUpwardRounded";
import ArrowDownwardRounded from "@mui/icons-material/ArrowDownwardRounded";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ADMIN_DEMO_NOW, productKindLabels } from "../../../mocks/admin";
import type { AdminProduct } from "../../../mocks/admin";
import { money } from "../../../shared/lib/format";
import {
  AdminConfirm,
  AdminMissing,
  AdminPageHeader,
  AdminSection,
} from "../components/AdminUI";
import { useAdminPrototype } from "../components/adminPrototypeContext";
import { VisibilityCheckbox } from "../components/VisibilityCheckbox";

const emptyProduct: AdminProduct = {
  id: "",
  name: "",
  sku: "",
  brandId: "brand-1",
  kind: "laptop",
  price: 0,
  stock: 0,
  status: "hidden",
  updatedAt: ADMIN_DEMO_NOW,
  images: [{ url: "/images/laptop.svg", alt: "Minh họa laptop" }],
  categoryIds: ["laptop"],
  specifications: [{ key: "configuration", label: "Cấu hình", value: "" }],
};

export default function ProductEditorPage() {
  const { id } = useParams();
  const { data } = useAdminPrototype();
  const product = id ? data.products.find((p) => p.id === id) : emptyProduct;
  if (!product)
    return <AdminMissing label="sản phẩm" to="/management/products" />;
  return <ProductEditor key={id ?? "new"} initial={product} />;
}

function ProductEditor({ initial }: { initial: AdminProduct }) {
  const { data, setData, notify } = useAdminPrototype();
  const [draft, setDraft] = useState(() => structuredClone(initial));
  const [error, setError] = useState("");
  const [remove, setRemove] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const requestedBack = (location.state as { backTo?: string } | null)?.backTo;
  const backTo = requestedBack?.startsWith("/management/products?")
    ? requestedBack
    : "/management/products";
  const patch = (value: Partial<AdminProduct>) =>
    setDraft((current) => ({ ...current, ...value }));
  const moveImage = (index: number, direction: number) => {
    const images = [...draft.images];
    [images[index], images[index + direction]] = [
      images[index + direction],
      images[index],
    ];
    patch({ images });
  };
  return (
    <Stack
      component="form"
      spacing={3}
      onSubmit={(event) => {
        event.preventDefault();
        if (!draft.name.trim()) {
          setError("Nhập tên sản phẩm.");
          return;
        }
        if (!draft.categoryIds.length) {
          setError("Chọn ít nhất một danh mục.");
          return;
        }
        if (
          draft.images.some(
            (image) =>
              !/^(https?:\/\/|\/(?!\/))/.test(image.url) || !image.alt.trim(),
          )
        ) {
          setError(
            "Ảnh cần URL http/https hoặc đường dẫn /images/... và mô tả ảnh.",
          );
          return;
        }
        if (
          draft.specifications.some(
            (spec) =>
              !spec.key.trim() || !spec.label.trim() || !spec.value.trim(),
          ) ||
          new Set(draft.specifications.map((spec) => spec.key.trim())).size !==
            draft.specifications.length
        ) {
          setError("Điền đủ thông số và dùng khóa khác nhau cho từng dòng.");
          return;
        }
        const productId = initial.id || `preview-${crypto.randomUUID()}`;
        const saved = {
          ...draft,
          id: productId,
          name: draft.name.trim(),
          sku: initial.sku || productId,
          updatedAt: new Date().toISOString(),
        };
        setData((current) => ({
          ...current,
          products: initial.id
            ? current.products.map((p) => (p.id === initial.id ? saved : p))
            : [saved, ...current.products],
        }));
        notify(initial.id ? "Đã cập nhật sản phẩm" : "Đã thêm sản phẩm");
        navigate(backTo);
      }}
    >
      <AdminPageHeader
        title={initial.id ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm"}
        description="Thông tin bán hàng, gallery và thông số theo từng cấu hình."
        action={
          <Button component={Link} to={backTo}>
            Về danh sách
          </Button>
        }
      />
      {error && (
        <Alert severity="error" onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            xl: "minmax(0, 2fr) minmax(0, 1fr)",
          },
          gap: 3,
          alignItems: "start",
        }}
      >
        <Stack spacing={3}>
          <AdminSection title="Thông tin sản phẩm">
            <TextField
              required
              label="Tên sản phẩm"
              value={draft.name}
              onChange={(e) => patch({ name: e.target.value })}
              slotProps={{ htmlInput: { maxLength: 160 } }}
            />
            <TextField
              select
              label="Loại sản phẩm"
              value={draft.kind}
              onChange={(e) =>
                patch({ kind: e.target.value as AdminProduct["kind"] })
              }
            >
              {Object.entries(productKindLabels).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
            <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
              <TextField
                select
                required
                label="Thương hiệu"
                value={draft.brandId}
                onChange={(e) => patch({ brandId: e.target.value })}
              >
                {data.brands.map((b) => (
                  <MenuItem
                    key={b.id}
                    value={b.id}
                    disabled={!b.isActive && b.id !== draft.brandId}
                  >
                    {b.name}
                    {!b.isActive ? " (đã ẩn)" : ""}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Danh mục"
                value={draft.categoryIds}
                slotProps={{
                  select: {
                    multiple: true,
                    renderValue: (value) =>
                      (value as string[])
                        .map(
                          (id) =>
                            data.categories.find((c) => c.id === id)?.name,
                        )
                        .join(", "),
                  },
                }}
                onChange={(e) =>
                  patch({
                    categoryIds:
                      typeof e.target.value === "string"
                        ? e.target.value.split(",")
                        : e.target.value,
                  })
                }
              >
                {data.categories.map((c) => (
                  <MenuItem
                    key={c.id}
                    value={c.id}
                    disabled={!c.isActive && !draft.categoryIds.includes(c.id)}
                  >
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
              <TextField
                required
                label="Giá bán (VND)"
                type="number"
                value={draft.price}
                onChange={(e) => patch({ price: Number(e.target.value) })}
                slotProps={{
                  htmlInput: { min: 1000, max: 1000000000, step: 1 },
                }}
              />
              <TextField
                required
                label="Số lượng tồn"
                type="number"
                value={draft.stock}
                onChange={(e) => patch({ stock: Number(e.target.value) })}
                slotProps={{ htmlInput: { min: 0, max: 999999, step: 1 } }}
              />
            </Stack>
            <VisibilityCheckbox
              checked={draft.status === "published"}
              name="sản phẩm"
              onChange={(checked) =>
                patch({ status: checked ? "published" : "hidden" })
              }
            />
          </AdminSection>
          <AdminSection
            title="Hình ảnh"
            description="Nhập URL ảnh. Ảnh đầu tiên là ảnh đại diện; dùng mũi tên để đổi thứ tự."
          >
            {draft.images.map((image, index) => (
              <Stack
                key={index}
                spacing={1.5}
                sx={{
                  p: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  gap={1}
                >
                  <Typography fontWeight={600}>
                    {index === 0 ? "Ảnh đại diện" : `Ảnh ${index + 1}`}
                  </Typography>
                  <Stack direction="row">
                    <IconButton
                      aria-label={`Đưa ảnh ${index + 1} lên trước`}
                      disabled={index === 0}
                      onClick={() => moveImage(index, -1)}
                    >
                      <ArrowUpwardRounded fontSize="small" />
                    </IconButton>
                    <IconButton
                      aria-label={`Đưa ảnh ${index + 1} xuống sau`}
                      disabled={index === draft.images.length - 1}
                      onClick={() => moveImage(index, 1)}
                    >
                      <ArrowDownwardRounded fontSize="small" />
                    </IconButton>
                    <IconButton
                      aria-label={`Xóa ảnh ${index + 1}`}
                      disabled={draft.images.length === 1}
                      onClick={() =>
                        patch({
                          images: draft.images.filter((_, i) => i !== index),
                        })
                      }
                    >
                      <DeleteOutlineRounded fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>
                <TextField
                  required
                  label={`URL ảnh ${index + 1}`}
                  value={image.url}
                  onChange={(e) =>
                    patch({
                      images: draft.images.map((img, i) =>
                        i === index ? { ...img, url: e.target.value } : img,
                      ),
                    })
                  }
                  helperText="Ví dụ: /images/laptop.svg hoặc https://..."
                />
                <TextField
                  required
                  label={`Mô tả ảnh ${index + 1}`}
                  value={image.alt}
                  onChange={(e) =>
                    patch({
                      images: draft.images.map((img, i) =>
                        i === index ? { ...img, alt: e.target.value } : img,
                      ),
                    })
                  }
                />
              </Stack>
            ))}
            <Button
              startIcon={<AddRounded />}
              onClick={() =>
                patch({ images: [...draft.images, { url: "", alt: "" }] })
              }
              sx={{ alignSelf: "flex-start" }}
            >
              Thêm ảnh URL
            </Button>
          </AdminSection>
          <AdminSection
            title="Thông số kỹ thuật"
            description="Mỗi thông số có khóa, tên hiển thị và giá trị. Có thể thêm dòng theo loại sản phẩm."
          >
            {draft.specifications.map((spec, index) => (
              <Stack
                key={index}
                direction={{ xs: "column", sm: "row" }}
                gap={1.5}
              >
                {(["key", "label", "value"] as const).map((field) => (
                  <TextField
                    key={field}
                    required
                    label={`${field === "key" ? "Khóa" : field === "label" ? "Tên thông số" : "Giá trị"} ${index + 1}`}
                    value={spec[field]}
                    onChange={(e) =>
                      patch({
                        specifications: draft.specifications.map((s, i) =>
                          i === index ? { ...s, [field]: e.target.value } : s,
                        ),
                      })
                    }
                  />
                ))}
                <IconButton
                  aria-label={`Xóa thông số ${index + 1}`}
                  onClick={() =>
                    patch({
                      specifications: draft.specifications.filter(
                        (_, i) => i !== index,
                      ),
                    })
                  }
                >
                  <DeleteOutlineRounded />
                </IconButton>
              </Stack>
            ))}
            <Button
              startIcon={<AddRounded />}
              onClick={() =>
                patch({
                  specifications: [
                    ...draft.specifications,
                    { key: "", label: "", value: "" },
                  ],
                })
              }
              sx={{ alignSelf: "flex-start" }}
            >
              Thêm thông số
            </Button>
          </AdminSection>
        </Stack>
        <AdminSection title="Xem trước sản phẩm">
          <Box
            component="img"
            key={draft.images[0]?.url}
            src={
              /^(https?:\/\/|\/(?!\/))/.test(draft.images[0]?.url ?? "")
                ? draft.images[0]?.url
                : `/images/${draft.kind}.svg`
            }
            alt={draft.images[0]?.alt || "Xem trước sản phẩm"}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = `/images/${draft.kind}.svg`;
            }}
            sx={{
              width: "100%",
              height: 220,
              objectFit: "contain",
              bgcolor: "background.default",
              borderRadius: 2,
            }}
          />
          <Typography variant="body2" color="text.secondary">
            {data.brands.find((b) => b.id === draft.brandId)?.name}
          </Typography>
          <Typography
            variant="h3"
            component="h2"
            sx={{ overflowWrap: "anywhere" }}
          >
            {draft.name || "Tên sản phẩm"}
          </Typography>
          <Typography color="primary.main" fontWeight={700} fontSize={24}>
            {money(draft.price)}
          </Typography>
          <Stack direction="row" gap={1} flexWrap="wrap">
            <Chip
              size="small"
              variant="outlined"
              label={draft.status === "published" ? "Hiển thị" : "Ẩn"}
            />
            <Chip
              size="small"
              color={draft.stock ? "success" : "warning"}
              variant="outlined"
              label={draft.stock ? `Còn ${draft.stock} sản phẩm` : "Hết hàng"}
            />
          </Stack>
          <Table size="small" aria-label="Thông số xem trước">
            <TableBody>
              {draft.specifications
                .filter((s) => s.label || s.value)
                .map((s, i) => (
                  <TableRow key={i}>
                    <TableCell component="th" scope="row">
                      {s.label}
                    </TableCell>
                    <TableCell sx={{ overflowWrap: "anywhere" }}>
                      {s.value}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </AdminSection>
      </Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        gap={2}
        justifyContent="space-between"
      >
        <Box>
          {initial.id && (
            <Button
              color="error"
              onClick={() => setRemove(true)}
              startIcon={<DeleteOutlineRounded />}
            >
              Xóa sản phẩm
            </Button>
          )}
        </Box>
        <Stack direction="row" gap={2}>
          <Button component={Link} to={backTo}>
            Hủy
          </Button>
          <Button variant="contained" type="submit">
            {initial.id ? "Lưu thay đổi" : "Thêm sản phẩm"}
          </Button>
        </Stack>
      </Stack>
      <AdminConfirm
        open={remove}
        title="Xóa sản phẩm?"
        description={initial.name}
        label="Xóa sản phẩm"
        danger
        onClose={() => setRemove(false)}
        onConfirm={() => {
          setData((current) => ({
            ...current,
            products: current.products.filter((p) => p.id !== initial.id),
            promotions: current.promotions.map((p) => ({
              ...p,
              productIds: p.productIds.filter((id) => id !== initial.id),
            })),
          }));
          notify("Đã xóa sản phẩm");
          navigate(backTo);
        }}
      />
    </Stack>
  );
}
