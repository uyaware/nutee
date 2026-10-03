import { useAdminFilters } from "../components/useAdminFilters";
import { useState } from "react";
import {
  Avatar,
  Button,
  Chip,
  MenuItem,
  Stack,
  TableCell,
  TextField,
  Typography,
} from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import { Link } from "react-router-dom";
import { productKindLabels } from "../../../mocks/admin";
import type { AdminProduct } from "../../../mocks/admin";
import { money } from "../../../shared/lib/format";
import {
  AdminConfirm,
  AdminPageHeader,
  AdminTable,
} from "../components/AdminUI";
import { useAdminPrototype } from "../components/adminPrototypeContext";
import { VisibilityCheckbox } from "../components/VisibilityCheckbox";

export default function ProductsPage() {
  const { data, setData, notify } = useAdminPrototype();
  const { params, q, search, update } = useAdminFilters();
  const [selected, setSelected] = useState<AdminProduct | null>(null);
  const requestedStatus = params.get("status") ?? "all";
  const status = ["published", "hidden", "out"].includes(requestedStatus)
    ? requestedStatus
    : "all";
  const brand = data.brands.some((b) => b.id === params.get("brand"))
    ? params.get("brand")!
    : "all";
  const category = data.categories.some((c) => c.id === params.get("category"))
    ? params.get("category")!
    : "all";
  const sort = ["name", "price-asc", "price-desc"].includes(
    params.get("sort") ?? "",
  )
    ? params.get("sort")!
    : "updated";
  const rows = data.products
    .filter(
      (p) =>
        `${p.name} ${p.sku}`.toLocaleLowerCase("vi").includes(search) &&
        (status === "all" ||
          (status === "out" ? p.stock === 0 : p.status === status)) &&
        (brand === "all" || p.brandId === brand) &&
        (category === "all" || p.categoryIds.includes(category)),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name, "vi")
        : sort === "price-asc"
          ? a.price - b.price
          : sort === "price-desc"
            ? b.price - a.price
            : b.updatedAt.localeCompare(a.updatedAt),
    );
  return (
    <Stack spacing={3}>
      <AdminPageHeader
        title="Sản phẩm"
        description="Quản lý danh mục bán hàng, hình ảnh và thông số sản phẩm."
        action={
          <Button
            component={Link}
            to="/management/products/new"
            startIcon={<AddRounded />}
            variant="contained"
            color="secondary"
          >
            Thêm sản phẩm
          </Button>
        }
      />
      <Stack direction="row" gap={1} flexWrap="wrap">
        <Chip label={`${data.products.length} sản phẩm`} variant="outlined" />
        <Chip
          label={`${data.products.filter((p) => p.status === "published").length} công khai`}
          color="success"
          variant="outlined"
        />
        <Chip
          label={`${data.products.filter((p) => !p.stock).length} hết hàng`}
          color="warning"
          variant="outlined"
        />
      </Stack>
      <Stack direction={{ xs: "column", lg: "row" }} gap={2}>
        <TextField
          label="Tìm tên hoặc SKU"
          value={q}
          onChange={(e) => update("q", e.target.value)}
          sx={{ flex: 2 }}
        />
        <TextField
          select
          label="Trạng thái"
          value={status}
          onChange={(e) => update("status", e.target.value)}
          sx={{ flex: 1 }}
        >
          <MenuItem value="all">Tất cả</MenuItem>
          <MenuItem value="published">Hiển thị</MenuItem>
          <MenuItem value="hidden">Ẩn</MenuItem>
          <MenuItem value="out">Hết hàng</MenuItem>
        </TextField>
        <TextField
          select
          label="Thương hiệu"
          value={brand}
          onChange={(e) => update("brand", e.target.value)}
          sx={{ flex: 1 }}
        >
          <MenuItem value="all">Tất cả hãng</MenuItem>
          {data.brands.map((b) => (
            <MenuItem key={b.id} value={b.id}>
              {b.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Danh mục"
          value={category}
          onChange={(e) => update("category", e.target.value)}
          sx={{ flex: 1 }}
        >
          <MenuItem value="all">Tất cả danh mục</MenuItem>
          {data.categories.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Sắp xếp"
          value={sort}
          onChange={(e) => update("sort", e.target.value)}
          sx={{ flex: 1 }}
        >
          <MenuItem value="updated">Mới cập nhật</MenuItem>
          <MenuItem value="name">Tên A–Z</MenuItem>
          <MenuItem value="price-asc">Giá tăng dần</MenuItem>
          <MenuItem value="price-desc">Giá giảm dần</MenuItem>
        </TextField>
      </Stack>
      <AdminTable
        label="Danh sách sản phẩm"
        rows={rows}
        columns={[
          "Sản phẩm / SKU",
          "Thương hiệu",
          "Hiển thị",
          "Tồn kho",
          "Giá bán",
          "Thao tác",
        ]}
        minWidth={980}
        renderRow={(p) => (
          <>
            <TableCell component="th" scope="row">
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar
                  variant="rounded"
                  src={p.images[0]?.url}
                  alt={p.images[0]?.alt ?? p.name}
                  sx={{
                    width: 56,
                    height: 56,
                    bgcolor: "background.default",
                    "& img": { objectFit: "contain" },
                  }}
                />
                <Stack>
                  <Typography fontWeight={600}>{p.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {p.sku} · {productKindLabels[p.kind]}
                  </Typography>
                </Stack>
              </Stack>
            </TableCell>
            <TableCell>
              {data.brands.find((b) => b.id === p.brandId)?.name}
            </TableCell>
            <TableCell>
              <VisibilityCheckbox
                checked={p.status === "published"}
                name={p.name}
                showStatus
                onChange={() => setSelected(p)}
              />
            </TableCell>
            <TableCell>
              <Typography color={!p.stock ? "warning.main" : "text.primary"}>
                {p.stock ? `${p.stock} sản phẩm` : "Hết hàng"}
              </Typography>
            </TableCell>
            <TableCell sx={{ whiteSpace: "nowrap" }}>
              {money(p.price)}
            </TableCell>
            <TableCell>
              <Stack direction="row">
                <Button
                  component={Link}
                  to={`/management/products/${p.id}/edit`}
                  state={{ backTo: `/management/products?${params}` }}
                >
                  Sửa
                </Button>
              </Stack>
            </TableCell>
          </>
        )}
      />
      <AdminConfirm
        open={!!selected}
        title={
          selected?.status === "published"
            ? "Ẩn sản phẩm?"
            : "Hiển thị sản phẩm?"
        }
        description={`${selected?.name ?? ""} sẽ ${selected?.status === "published" ? "được ẩn" : "được hiển thị"}.`}
        onClose={() => setSelected(null)}
        onConfirm={() => {
          if (!selected) return;
          setData((current) => ({
            ...current,
            products: current.products.map((p) =>
              p.id === selected.id
                ? {
                    ...p,
                    status: p.status === "published" ? "hidden" : "published",
                  }
                : p,
            ),
          }));
          notify("Đã đổi trạng thái sản phẩm");
          setSelected(null);
        }}
      />
    </Stack>
  );
}
