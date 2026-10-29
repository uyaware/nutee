import { useAdminFilters } from "@/modules/management/hooks/useAdminFilters";
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
import { Link } from "react-router-dom";
import { roleLabels } from "@/modules/auth/model/permissions";
import {
  AdminPageHeader,
  AdminTable,
} from "@/modules/management/components/AdminUI";
import { useAdminPrototype } from "@/modules/management/model/adminPrototypeContext";

export default function UsersPage() {
  const { data } = useAdminPrototype();
  const { params, q, search, update } = useAdminFilters();
  const role = Object.hasOwn(roleLabels, params.get("role") ?? "")
    ? params.get("role")!
    : "all";
  const status = ["active", "locked"].includes(params.get("status") ?? "")
    ? params.get("status")!
    : "all";
  const rows = data.users
    .filter(
      (u) =>
        `${u.name} ${u.email} ${u.phone ?? ""}`
          .toLocaleLowerCase("vi")
          .includes(search) &&
        (role === "all" || u.role === role) &&
        (status === "all" || u.isActive === (status === "active")),
    )
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));
  return (
    <Stack spacing={3}>
      <AdminPageHeader
        title="Tài khoản"
        description="Tra cứu khách hàng, phân vai trò và quản lý trạng thái tài khoản."
      />
      <Stack direction="row" gap={1} flexWrap="wrap">
        {Object.entries(roleLabels).map(([key, label]) => (
          <Chip
            key={key}
            label={`${data.users.filter((u) => u.role === key).length} ${label.toLocaleLowerCase("vi")}`}
            variant="outlined"
          />
        ))}
      </Stack>
      <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
        <TextField
          type="search"
          label="Tìm tên, email hoặc điện thoại"
          value={q}
          onChange={(e) => update("q", e.target.value)}
          sx={{ flex: 2 }}
        />
        <TextField
          select
          label="Vai trò"
          value={role}
          onChange={(e) => update("role", e.target.value)}
          sx={{ flex: 1 }}
        >
          <MenuItem value="all">Tất cả vai trò</MenuItem>
          {Object.entries(roleLabels).map(([key, label]) => (
            <MenuItem key={key} value={key}>
              {label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Trạng thái"
          value={status}
          onChange={(e) => update("status", e.target.value)}
          sx={{ flex: 1 }}
        >
          <MenuItem value="all">Tất cả trạng thái</MenuItem>
          <MenuItem value="active">Hoạt động</MenuItem>
          <MenuItem value="locked">Đã khóa</MenuItem>
        </TextField>
      </Stack>
      <AdminTable
        label="Danh sách tài khoản"
        rows={rows}
        columns={["Tài khoản", "Liên hệ", "Vai trò", "Trạng thái", "Thao tác"]}
        renderRow={(u) => (
          <>
            <TableCell component="th" scope="row">
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar
                  sx={{ bgcolor: "action.selected", color: "primary.main" }}
                >
                  {u.name.slice(0, 1)}
                </Avatar>
                <Typography fontWeight={600}>{u.name}</Typography>
              </Stack>
            </TableCell>
            <TableCell>
              {u.email}
              <Typography
                variant="caption"
                display="block"
                color="text.secondary"
              >
                {u.phone || "Chưa có số điện thoại"}
              </Typography>
            </TableCell>
            <TableCell>{roleLabels[u.role]}</TableCell>
            <TableCell>
              <Chip
                variant="outlined"
                size="small"
                color={u.isActive ? "success" : "error"}
                label={u.isActive ? "Hoạt động" : "Đã khóa"}
              />
            </TableCell>
            <TableCell>
              <Button
                component={Link}
                to={`/management/users/${u.id}`}
                state={{ backTo: `/management/users?${params}` }}
              >
                Chi tiết / quyền
              </Button>
            </TableCell>
          </>
        )}
      />
    </Stack>
  );
}
