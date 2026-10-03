import { useAdminFilters } from "../components/useAdminFilters";
import { useState } from "react";
import {
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
import {
  promotionScopeLabels,
  promotionStatus,
  promotionStatusLabels,
} from "../../../mocks/admin";
import type { AdminPromotion } from "../../../mocks/admin";
import { dateTime, money } from "../../../shared/lib/format";
import {
  AdminConfirm,
  AdminPageHeader,
  AdminTable,
} from "../components/AdminUI";
import { useAdminPrototype } from "../components/adminPrototypeContext";

export default function PromotionsPage() {
  const { data, setData, notify } = useAdminPrototype();
  const { params, q, search, update } = useAdminFilters();
  const [selected, setSelected] = useState<AdminPromotion | null>(null);
  const status = Object.hasOwn(
    promotionStatusLabels,
    params.get("status") ?? "",
  )
    ? params.get("status")!
    : "all";
  const scope = Object.hasOwn(promotionScopeLabels, params.get("scope") ?? "")
    ? params.get("scope")!
    : "any";
  const rows = data.promotions.filter(
    (p) =>
      p.code.toLowerCase().includes(search) &&
      (status === "all" || promotionStatus(p) === status) &&
      (scope === "any" || p.scope === scope),
  );
  return (
    <Stack spacing={3}>
      <AdminPageHeader
        title="Khuyến mãi"
        description="Thiết lập mã ưu đãi, thời gian và phạm vi áp dụng."
        action={
          <Button
            component={Link}
            to="/management/promotions/new"
            variant="contained"
            startIcon={<AddRounded />}
          >
            Tạo khuyến mãi
          </Button>
        }
      />
      <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
        <TextField
          label="Tìm mã khuyến mãi"
          value={q}
          onChange={(e) => update("q", e.target.value)}
        />
        <TextField
          select
          label="Trạng thái"
          value={status}
          onChange={(e) => update("status", e.target.value)}
        >
          <MenuItem value="all">Tất cả trạng thái</MenuItem>
          {Object.entries(promotionStatusLabels).map(([key, label]) => (
            <MenuItem key={key} value={key}>
              {label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Phạm vi"
          value={scope}
          onChange={(e) => update("scope", e.target.value)}
        >
          <MenuItem value="any">Tất cả phạm vi</MenuItem>
          {Object.entries(promotionScopeLabels).map(([key, label]) => (
            <MenuItem key={key} value={key}>
              {label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      <AdminTable
        label="Danh sách khuyến mãi"
        rows={rows}
        minWidth={920}
        columns={[
          "Mã ưu đãi",
          "Mức giảm",
          "Thời gian áp dụng",
          "Phạm vi",
          "Trạng thái",
          "Thao tác",
        ]}
        renderRow={(p) => (
          <>
            <TableCell component="th" scope="row">
              <Typography fontWeight={700}>{p.code}</Typography>
              <Typography variant="caption" color="text.secondary">
                Đơn từ {money(p.minOrder)}
              </Typography>
            </TableCell>
            <TableCell sx={{ whiteSpace: "nowrap" }}>
              {p.type === "percent" ? `${p.value}%` : money(p.value)}
            </TableCell>
            <TableCell>
              <Typography variant="body2">{dateTime(p.startsAt)}</Typography>
              <Typography variant="body2" color="text.secondary">
                đến {dateTime(p.endsAt)}
              </Typography>
            </TableCell>
            <TableCell>
              {promotionScopeLabels[p.scope]}
              {p.scope !== "all" && (
                <Typography
                  variant="caption"
                  display="block"
                  color="text.secondary"
                >
                  {p.scope === "product"
                    ? `${p.productIds.length} sản phẩm`
                    : `${p.userIds.length} khách hàng`}
                </Typography>
              )}
            </TableCell>
            <TableCell>
              <Chip
                size="small"
                variant="outlined"
                color={
                  promotionStatus(p) === "active"
                    ? "success"
                    : promotionStatus(p) === "scheduled"
                      ? "primary"
                      : "default"
                }
                label={promotionStatusLabels[promotionStatus(p)]}
              />
            </TableCell>
            <TableCell>
              <Stack direction="row">
                <Button
                  component={Link}
                  to={`/management/promotions/${p.id}`}
                  state={{ backTo: `/management/promotions?${params}` }}
                >
                  Chi tiết
                </Button>
                <Button onClick={() => setSelected(p)}>
                  {p.isActive ? "Tạm dừng" : "Bật lại"}
                </Button>
              </Stack>
            </TableCell>
          </>
        )}
      />
      <AdminConfirm
        open={!!selected}
        title={
          selected?.isActive ? "Tạm dừng khuyến mãi?" : "Bật lại khuyến mãi?"
        }
        description={`${selected?.code ?? ""} sẽ đổi trạng thái trong bản xem thử.`}
        onClose={() => setSelected(null)}
        onConfirm={() => {
          if (!selected) return;
          setData((current) => ({
            ...current,
            promotions: current.promotions.map((p) =>
              p.id === selected.id ? { ...p, isActive: !p.isActive } : p,
            ),
          }));
          notify("Đã đổi trạng thái khuyến mãi");
          setSelected(null);
        }}
      />
    </Stack>
  );
}
