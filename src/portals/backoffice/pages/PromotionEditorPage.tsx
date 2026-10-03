import { useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  promotionScopeLabels,
  promotionStatus,
  promotionStatusLabels,
} from "../../../mocks/admin";
import type { AdminPromotion } from "../../../mocks/admin";
import { money } from "../../../shared/lib/format";
import {
  AdminConfirm,
  AdminMissing,
  AdminPageHeader,
  AdminSection,
} from "../components/AdminUI";
import { useAdminPrototype } from "../components/adminPrototypeContext";

const emptyPromotion: AdminPromotion = {
  id: "",
  code: "",
  type: "fixed",
  value: 100000,
  minOrder: 1000000,
  startsAt: "2026-10-03T03:00:00.000Z",
  endsAt: "2026-11-03T03:00:00.000Z",
  scope: "all",
  isActive: true,
  productIds: [],
  userIds: [],
};
const localDateTime = (iso: string) =>
  new Date(new Date(iso).getTime() + 7 * 3600000).toISOString().slice(0, 16);
const toIso = (value: string, fallback: string) => {
  const date = new Date(`${value}+07:00`);
  return Number.isFinite(date.getTime()) ? date.toISOString() : fallback;
};

export default function PromotionEditorPage() {
  const { id } = useParams();
  const { data } = useAdminPrototype();
  const promotion = id
    ? data.promotions.find((p) => p.id === id)
    : emptyPromotion;
  if (!promotion)
    return <AdminMissing label="khuyến mãi" to="/management/promotions" />;
  return <PromotionEditor key={id ?? "new"} initial={promotion} />;
}

function PromotionEditor({ initial }: { initial: AdminPromotion }) {
  const { data, setData, notify } = useAdminPrototype();
  const [draft, setDraft] = useState(() => structuredClone(initial));
  const [start, setStart] = useState(localDateTime(initial.startsAt));
  const [end, setEnd] = useState(localDateTime(initial.endsAt));
  const [error, setError] = useState("");
  const [remove, setRemove] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const requestedBack = (location.state as { backTo?: string } | null)?.backTo;
  const backTo = requestedBack?.startsWith("/management/promotions?")
    ? requestedBack
    : "/management/promotions";
  const patch = (value: Partial<AdminPromotion>) =>
    setDraft((current) => ({ ...current, ...value }));
  const customers = data.users.filter((u) => u.role === "customer");
  const preview = {
    ...draft,
    startsAt: toIso(start, initial.startsAt),
    endsAt: toIso(end, initial.endsAt),
  };
  return (
    <Stack
      component="form"
      spacing={3}
      onSubmit={(event) => {
        event.preventDefault();
        const code = draft.code.trim().toUpperCase();
        if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
          setError(
            "Mã gồm 3–32 ký tự: chữ không dấu, số, dấu gạch ngang hoặc gạch dưới.",
          );
          return;
        }
        if (
          data.promotions.some(
            (p) => p.id !== initial.id && p.code.toUpperCase() === code,
          )
        ) {
          setError("Mã khuyến mãi đã tồn tại.");
          return;
        }
        if (start >= end) {
          setError("Thời gian kết thúc phải sau thời gian bắt đầu.");
          return;
        }
        if (
          (draft.scope === "product" && !draft.productIds.length) ||
          (draft.scope === "user" && !draft.userIds.length)
        ) {
          setError("Chọn ít nhất một đối tượng áp dụng cho phạm vi này.");
          return;
        }
        const saved = {
          ...preview,
          code,
          id: initial.id || `preview-${crypto.randomUUID()}`,
          productIds: draft.scope === "product" ? draft.productIds : [],
          userIds: draft.scope === "user" ? draft.userIds : [],
        };
        setData((current) => ({
          ...current,
          promotions: initial.id
            ? current.promotions.map((p) => (p.id === initial.id ? saved : p))
            : [saved, ...current.promotions],
        }));
        notify("Đã cập nhật khuyến mãi");
        navigate(backTo);
      }}
    >
      <AdminPageHeader
        title={initial.id ? `Khuyến mãi ${initial.code}` : "Tạo khuyến mãi"}
        description="Thiết lập ưu đãi và chọn sản phẩm hoặc khách hàng được áp dụng."
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
            lg: "minmax(0, 2fr) minmax(0, 1fr)",
          },
          gap: 3,
          alignItems: "start",
        }}
      >
        <Stack spacing={3}>
          <AdminSection title="Thông tin ưu đãi">
            <TextField
              required
              label="Mã khuyến mãi"
              value={draft.code}
              onChange={(e) => patch({ code: e.target.value.toUpperCase() })}
              slotProps={{ htmlInput: { minLength: 3, maxLength: 32 } }}
              helperText="Ví dụ: NUTEE100, LAPTOP5"
            />
            <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
              <TextField
                select
                label="Loại giảm giá"
                value={draft.type}
                onChange={(e) =>
                  patch({
                    type: e.target.value as AdminPromotion["type"],
                    value: e.target.value === "percent" ? 5 : 100000,
                  })
                }
              >
                <MenuItem value="fixed">Số tiền cố định</MenuItem>
                <MenuItem value="percent">Phần trăm</MenuItem>
              </TextField>
              <TextField
                required
                type="number"
                label={
                  draft.type === "percent" ? "Mức giảm (%)" : "Mức giảm (VND)"
                }
                value={draft.value}
                onChange={(e) => patch({ value: Number(e.target.value) })}
                slotProps={{
                  htmlInput: {
                    min: 1,
                    max: draft.type === "percent" ? 100 : 1000000000,
                    step: 1,
                  },
                }}
              />
            </Stack>
            <TextField
              required
              label="Giá trị đơn tối thiểu (VND)"
              type="number"
              value={draft.minOrder}
              onChange={(e) => patch({ minOrder: Number(e.target.value) })}
              slotProps={{ htmlInput: { min: 0, max: 1000000000, step: 1 } }}
            />
            <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
              <TextField
                required
                label="Bắt đầu (giờ Việt Nam)"
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { max: "2099-12-31T23:59" },
                }}
              />
              <TextField
                required
                label="Kết thúc (giờ Việt Nam)"
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { max: "2099-12-31T23:59" },
                }}
              />
            </Stack>
            <TextField
              select
              label="Kích hoạt"
              value={String(draft.isActive)}
              onChange={(e) => patch({ isActive: e.target.value === "true" })}
            >
              <MenuItem value="true">Bật khuyến mãi</MenuItem>
              <MenuItem value="false">Tạm dừng</MenuItem>
            </TextField>
          </AdminSection>
          <AdminSection title="Phạm vi áp dụng">
            <TextField
              select
              label="Áp dụng cho"
              value={draft.scope}
              onChange={(e) =>
                patch({ scope: e.target.value as AdminPromotion["scope"] })
              }
            >
              {Object.entries(promotionScopeLabels).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
            {draft.scope === "product" && (
              <Autocomplete
                multiple
                options={data.products}
                value={data.products.filter((p) =>
                  draft.productIds.includes(p.id),
                )}
                getOptionLabel={(p) => p.name}
                getOptionKey={(p) => p.id}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                onChange={(_, products) =>
                  patch({ productIds: products.map((p) => p.id) })
                }
                renderInput={(props) => (
                  <TextField
                    {...props}
                    label="Chọn sản phẩm"
                    helperText="Có thể tìm theo tên và chọn nhiều sản phẩm."
                  />
                )}
                sx={{
                  "& .MuiInputBase-root": { height: "auto", minHeight: 44 },
                  "& .MuiChip-root": { maxWidth: "100%" },
                }}
              />
            )}
            {draft.scope === "user" && (
              <Autocomplete
                multiple
                options={customers}
                value={customers.filter((u) => draft.userIds.includes(u.id))}
                getOptionLabel={(u) => `${u.name} · ${u.email}`}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                onChange={(_, users) =>
                  patch({ userIds: users.map((u) => u.id) })
                }
                renderInput={(props) => (
                  <TextField
                    {...props}
                    label="Chọn khách hàng"
                    helperText="Chọn các khách hàng được cấp mã ưu đãi."
                  />
                )}
                sx={{
                  "& .MuiInputBase-root": { height: "auto", minHeight: 44 },
                  "& .MuiChip-root": { maxWidth: "100%" },
                }}
              />
            )}
            <Typography variant="body2" color="text.secondary">
              Mỗi mã có một phạm vi áp dụng.
            </Typography>
          </AdminSection>
        </Stack>
        <AdminSection title="Xem trước ưu đãi">
          <Chip
            label={promotionStatusLabels[promotionStatus(preview)]}
            variant="outlined"
            color={
              promotionStatus(preview) === "active" ? "success" : "default"
            }
            sx={{ alignSelf: "flex-start" }}
          />
          <Typography
            variant="h3"
            component="h2"
            sx={{ overflowWrap: "anywhere" }}
          >
            {draft.code || "MÃ ƯU ĐÃI"}
          </Typography>
          <Typography color="primary.main" fontSize={28} fontWeight={700}>
            {draft.type === "percent"
              ? `Giảm ${draft.value}%`
              : `Giảm ${money(draft.value)}`}
          </Typography>
          <Typography>Cho đơn từ {money(draft.minOrder)}</Typography>
          <Typography color="text.secondary">
            {promotionScopeLabels[draft.scope]}
            {draft.scope === "product"
              ? ` · ${draft.productIds.length} sản phẩm`
              : draft.scope === "user"
                ? ` · ${draft.userIds.length} khách hàng`
                : ""}
          </Typography>
        </AdminSection>
      </Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        gap={2}
      >
        <Box>
          {initial.id && (
            <Button color="error" onClick={() => setRemove(true)}>
              Xóa khuyến mãi
            </Button>
          )}
        </Box>
        <Stack direction="row" gap={2}>
          <Button component={Link} to={backTo}>
            Hủy
          </Button>
          <Button variant="contained" type="submit">
            Lưu thay đổi
          </Button>
        </Stack>
      </Stack>
      <AdminConfirm
        open={remove}
        title="Xóa khuyến mãi?"
        description={initial.code}
        label="Xóa khuyến mãi"
        danger
        onClose={() => setRemove(false)}
        onConfirm={() => {
          setData((current) => ({
            ...current,
            promotions: current.promotions.filter((p) => p.id !== initial.id),
          }));
          notify("Đã xóa khuyến mãi");
          navigate(backTo);
        }}
      />
    </Stack>
  );
}
