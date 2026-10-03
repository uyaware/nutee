import { useAdminFilters } from "../components/useAdminFilters";
import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TableCell,
  TextField,
  Typography,
} from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import {
  AdminConfirm,
  AdminPageHeader,
  AdminTable,
} from "../components/AdminUI";
import { useAdminPrototype } from "../components/adminPrototypeContext";
import type { AdminBrand, AdminCategory } from "../../../mocks/admin";

export default function TaxonomyPage({
  kind,
}: {
  kind: "brands" | "categories";
}) {
  return <TaxonomyEditor key={kind} kind={kind} />;
}

function TaxonomyEditor({ kind }: { kind: "brands" | "categories" }) {
  const { data, setData, notify } = useAdminPrototype();
  const { params, q, search, update } = useAdminFilters();
  const isCategory = kind === "categories";
  const label = isCategory ? "danh mục" : "thương hiệu";
  const [draft, setDraft] = useState<AdminCategory | null>(null);
  const [error, setError] = useState("");
  const [remove, setRemove] = useState<AdminBrand | AdminCategory | null>(null);
  const status = ["active", "hidden"].includes(params.get("status") ?? "")
    ? params.get("status")!
    : "all";
  const records: AdminCategory[] = isCategory
    ? data.categories
    : data.brands.map((b) => ({ ...b, parentId: "" }));
  const rows = records
    .filter(
      (r) =>
        r.name.toLocaleLowerCase("vi").includes(search) &&
        (status === "all" || r.isActive === (status === "active")),
    )
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));
  const count = (id: string) =>
    data.products.filter((p) =>
      isCategory ? p.categoryIds.includes(id) : p.brandId === id,
    ).length;
  const children = (id: string) =>
    isCategory ? data.categories.filter((c) => c.parentId === id).length : 0;
  const isDescendant = (id: string, ancestor: string) => {
    const visited = new Set<string>();
    let current = id;
    while (current && !visited.has(current)) {
      if (current === ancestor) return true;
      visited.add(current);
      current = data.categories.find((c) => c.id === current)?.parentId ?? "";
    }
    return false;
  };
  const categoryPath = (category: AdminCategory) => {
    const names = [category.name];
    const visited = new Set([category.id]);
    let parent = data.categories.find((c) => c.id === category.parentId);
    while (parent && !visited.has(parent.id)) {
      names.unshift(parent.name);
      visited.add(parent.id);
      parent = data.categories.find((c) => c.id === parent?.parentId);
    }
    return names.join(" / ");
  };
  return (
    <Stack spacing={3}>
      <AdminPageHeader
        title={isCategory ? "Danh mục" : "Thương hiệu"}
        description={
          isCategory
            ? "Sắp xếp cây danh mục và nhóm sản phẩm trong cửa hàng."
            : "Quản lý các thương hiệu xuất hiện trong danh mục sản phẩm."
        }
        action={
          <Button
            startIcon={<AddRounded />}
            variant="contained"
            onClick={() => {
              setError("");
              setDraft({ id: "", name: "", parentId: "", isActive: true });
            }}
          >
            Thêm {label}
          </Button>
        }
      />
      <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
        <TextField
          label={`Tìm tên ${label}`}
          value={q}
          onChange={(e) => update("q", e.target.value)}
        />
        <TextField
          select
          label="Hiển thị"
          value={status}
          onChange={(e) => update("status", e.target.value)}
          sx={{ maxWidth: { sm: 240 } }}
        >
          <MenuItem value="all">Tất cả</MenuItem>
          <MenuItem value="active">Đang hiển thị</MenuItem>
          <MenuItem value="hidden">Đã ẩn</MenuItem>
        </TextField>
      </Stack>
      <AdminTable
        label={`Danh sách ${label}`}
        rows={rows}
        columns={[
          isCategory ? "Danh mục / đường dẫn" : "Thương hiệu",
          ...(isCategory ? ["Danh mục cha"] : []),
          "Sản phẩm",
          "Hiển thị",
          "Thao tác",
        ]}
        renderRow={(row) => (
          <>
            <TableCell component="th" scope="row">
              <Typography fontWeight={600}>{row.name}</Typography>
              {isCategory && (
                <Typography variant="caption" color="text.secondary">
                  {categoryPath(row)}
                </Typography>
              )}
            </TableCell>
            {isCategory && (
              <TableCell>
                {data.categories.find((c) => c.id === row.parentId)?.name ??
                  "Danh mục gốc"}
              </TableCell>
            )}
            <TableCell>{count(row.id)}</TableCell>
            <TableCell>
              <Chip
                size="small"
                variant="outlined"
                color={row.isActive ? "success" : "default"}
                label={row.isActive ? "Đang hiển thị" : "Đã ẩn"}
              />
            </TableCell>
            <TableCell>
              <Stack direction="row">
                <Button
                  onClick={() => {
                    setError("");
                    setDraft({
                      ...row,
                      parentId: row.parentId,
                    });
                  }}
                >
                  Sửa
                </Button>
                <Button color="error" onClick={() => setRemove(row)}>
                  Xóa
                </Button>
              </Stack>
            </TableCell>
          </>
        )}
      />
      <Dialog
        open={!!draft}
        onClose={() => setDraft(null)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="taxonomy-title"
      >
        {draft && (
          <Box
            component="form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!draft.name.trim()) {
                setError(`Nhập tên ${label}.`);
                return;
              }
              if (
                records.some(
                  (r) =>
                    r.id !== draft.id &&
                    r.name.toLocaleLowerCase("vi") ===
                      draft.name.trim().toLocaleLowerCase("vi"),
                )
              ) {
                setError("Tên này đã có trong danh sách.");
                return;
              }
              if (
                isCategory &&
                draft.parentId &&
                isDescendant(draft.parentId, draft.id)
              ) {
                setError(
                  "Danh mục cha không được là chính nó hoặc một danh mục con.",
                );
                return;
              }
              const saved = {
                ...draft,
                id: draft.id || `preview-${crypto.randomUUID()}`,
                name: draft.name.trim(),
              };
              setData((current) =>
                isCategory
                  ? {
                      ...current,
                      categories: draft.id
                        ? current.categories.map((c) =>
                            c.id === draft.id ? saved : c,
                          )
                        : [...current.categories, saved],
                    }
                  : {
                      ...current,
                      brands: draft.id
                        ? current.brands.map((b) =>
                            b.id === draft.id
                              ? {
                                  id: saved.id,
                                  name: saved.name,
                                  isActive: saved.isActive,
                                }
                              : b,
                          )
                        : [
                            ...current.brands,
                            {
                              id: saved.id,
                              name: saved.name,
                              isActive: saved.isActive,
                            },
                          ],
                    },
              );
              notify(`Đã cập nhật ${label}`);
              setDraft(null);
            }}
          >
            <DialogTitle id="taxonomy-title">
              {draft.id ? "Chỉnh sửa" : "Thêm"} {label}
            </DialogTitle>
            <DialogContent>
              <Stack spacing={2.5} sx={{ pt: 1 }}>
                {error && <Alert severity="error">{error}</Alert>}
                <TextField
                  autoFocus
                  required
                  label={`Tên ${label}`}
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  slotProps={{ htmlInput: { maxLength: 80 } }}
                />
                {isCategory && (
                  <TextField
                    select
                    label="Danh mục cha"
                    value={draft.parentId}
                    onChange={(e) =>
                      setDraft({ ...draft, parentId: e.target.value })
                    }
                    helperText="Danh mục con không thể làm cha của chính nó."
                  >
                    <MenuItem value="">Không có — danh mục gốc</MenuItem>
                    {data.categories
                      .filter((c) => !draft.id || !isDescendant(c.id, draft.id))
                      .map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                          {categoryPath(c)}
                        </MenuItem>
                      ))}
                  </TextField>
                )}
                <TextField
                  select
                  label="Hiển thị"
                  value={String(draft.isActive)}
                  onChange={(e) =>
                    setDraft({ ...draft, isActive: e.target.value === "true" })
                  }
                >
                  <MenuItem value="true">Đang hiển thị</MenuItem>
                  <MenuItem value="false">Ẩn</MenuItem>
                </TextField>
                <Typography variant="body2" color="text.secondary">
                  Thay đổi chỉ xuất hiện trong bản xem thử này.
                </Typography>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setDraft(null)}>Hủy</Button>
              <Button variant="contained" type="submit">
                Xem thử thay đổi
              </Button>
            </DialogActions>
          </Box>
        )}
      </Dialog>
      {remove &&
        (count(remove.id) || children(remove.id) ? (
          <Dialog
            open
            onClose={() => setRemove(null)}
            fullWidth
            maxWidth="xs"
            aria-labelledby="taxonomy-in-use"
          >
            <DialogTitle id="taxonomy-in-use">
              {isCategory ? "Danh mục" : "Thương hiệu"} đang được sử dụng
            </DialogTitle>
            <DialogContent>
              <Typography>
                {remove.name} đang gắn với {count(remove.id)} sản phẩm
                {isCategory ? ` và ${children(remove.id)} danh mục con` : ""}.
                Bạn có thể ẩn trong form chỉnh sửa.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setRemove(null)}>Đóng</Button>
            </DialogActions>
          </Dialog>
        ) : (
          <AdminConfirm
            open
            title={`Xóa ${label}?`}
            description={remove.name}
            label="Xóa"
            danger
            onClose={() => setRemove(null)}
            onConfirm={() => {
              setData((current) =>
                isCategory
                  ? {
                      ...current,
                      categories: current.categories.filter(
                        (c) => c.id !== remove.id,
                      ),
                    }
                  : {
                      ...current,
                      brands: current.brands.filter((b) => b.id !== remove.id),
                    },
              );
              notify(`Đã xóa ${label}`);
              setRemove(null);
            }}
          />
        ))}
    </Stack>
  );
}
