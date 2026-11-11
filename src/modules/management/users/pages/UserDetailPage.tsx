import { useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Link, useLocation, useParams } from "react-router-dom";
import { roleLabels } from "@/modules/auth/model/permissions";
import type { Role, User } from "@/shared/types/database";
import { useSession } from "@/modules/auth/hooks/useSession";
import { prototypeOrders } from "@/modules/orders/fixtures/orders";
import { dateTime, money } from "@/shared/lib/format";
import { StatusBadge } from "@/shared/components/StatusBadge";
import {
  AdminConfirm,
  AdminMissing,
  AdminPageHeader,
  AdminSection,
} from "@/modules/management/components/AdminUI";
import { useAdminPrototype } from "@/modules/management/model/adminPrototypeContext";

export default function UserDetailPage() {
  const { id } = useParams();
  const { data } = useAdminPrototype();
  const user = data.users.find((u) => u.id === id);
  if (!user) return <AdminMissing label="tài khoản" to="/management/users" />;
  return (
    <UserEditor key={`${user.id}:${user.role}:${user.isActive}`} user={user} />
  );
}

function UserEditor({ user }: { user: User }) {
  const { data, setData, notify } = useAdminPrototype();
  const session = useSession("backoffice");
  const location = useLocation();
  const requestedBack = (location.state as { backTo?: string } | null)?.backTo;
  const backTo = requestedBack?.startsWith("/management/users?")
    ? requestedBack
    : "/management/users";
  const [role, setRole] = useState<Role>(user.role);
  const [isActive, setActive] = useState(user.isActive);
  const [confirm, setConfirm] = useState(false);
  const self = user.id === session.data?.id;
  const lastAdmin =
    user.role === "admin" &&
    user.isActive &&
    data.users.filter((u) => u.role === "admin" && u.isActive).length === 1;
  const blocked = self || (lastAdmin && (role !== "admin" || !isActive));
  const changed = role !== user.role || isActive !== user.isActive;
  const orders = prototypeOrders.filter((o) => o.userId === user.id);
  return (
    <Stack spacing={3}>
      <AdminPageHeader
        title={`Tài khoản ${user.name}`}
        description="Hồ sơ, vai trò và trạng thái truy cập của tài khoản."
        action={
          <Button component={Link} to={backTo}>
            Về danh sách
          </Button>
        }
      />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
          gap: 3,
          alignItems: "start",
        }}
      >
        <AdminSection title="Thông tin tài khoản">
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar sx={{ width: 56, height: 56, bgcolor: "primary.main" }}>
              {user.name.slice(0, 1)}
            </Avatar>
            <Box>
              <Typography fontWeight={700}>{user.name}</Typography>
              <Typography
                color="text.secondary"
                sx={{ overflowWrap: "anywhere" }}
              >
                {user.email}
              </Typography>
            </Box>
          </Stack>
          <Typography>Điện thoại: {user.phone || "Chưa cập nhật"}</Typography>
          <Stack direction="row" gap={1} flexWrap="wrap">
            <Chip label={roleLabels[user.role]} variant="outlined" />
            <Chip
              label={user.isActive ? "Hoạt động" : "Đã khóa"}
              variant="outlined"
              color={user.isActive ? "success" : "error"}
            />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Mã tài khoản: {user.id}
          </Typography>
        </AdminSection>
        <AdminSection title="Vai trò và quyền truy cập">
          {self && (
            <Alert severity="info">
              Đây là tài khoản đang đăng nhập. Các lựa chọn thay đổi quyền và
              khóa tài khoản được tắt.
            </Alert>
          )}
          <TextField
            select
            label="Vai trò"
            value={role}
            disabled={self}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            {Object.entries(roleLabels).map(([key, label]) => (
              <MenuItem key={key} value={key}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Trạng thái tài khoản"
            value={String(isActive)}
            disabled={self}
            onChange={(e) => setActive(e.target.value === "true")}
          >
            <MenuItem value="true">Hoạt động</MenuItem>
            <MenuItem value="false">Đã khóa</MenuItem>
          </TextField>
          <Typography color="text.secondary">
            {role === "admin"
              ? "Quản lý dữ liệu bán hàng, tài khoản và xem báo cáo kinh doanh."
              : role === "staff"
                ? "Quản lý sản phẩm, thương hiệu, danh mục và xử lý yêu cầu của khách hàng."
                : "Mua hàng và quản lý thông tin cá nhân trong cửa hàng."}
          </Typography>
          {lastAdmin && !self && blocked && (
            <Alert severity="warning">
              Cần giữ ít nhất một quản trị viên đang hoạt động.
            </Alert>
          )}
          <Button
            variant="contained"
            disabled={!changed || blocked}
            onClick={() => setConfirm(true)}
            sx={{ alignSelf: "flex-start" }}
          >
            Lưu thay đổi quyền
          </Button>
        </AdminSection>
      </Box>
      <AdminSection title="Đơn hàng liên quan">
        {orders.length ? (
          orders.map((order) => (
            <Stack
              key={order.id}
              direction={{ xs: "column", sm: "row" }}
              gap={2}
              alignItems={{ sm: "center" }}
              justifyContent="space-between"
            >
              <Box>
                <Typography fontWeight={600}>
                  {order.id.toUpperCase()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {dateTime(order.createdAt)} · {money(order.total)}
                </Typography>
              </Box>
              <StatusBadge status={order.status} />
              <Button component={Link} to={`/management/orders/${order.id}`}>
                Xem đơn
              </Button>
            </Stack>
          ))
        ) : (
          <Typography color="text.secondary">
            Tài khoản này chưa có đơn hàng.
          </Typography>
        )}
      </AdminSection>
      <AdminConfirm
        open={confirm}
        title="Xác nhận thay đổi quyền?"
        description={`${user.name}: ${roleLabels[role]} · ${isActive ? "Hoạt động" : "Đã khóa"}.`}
        danger={!isActive || role === "admin"}
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          if (blocked) return;
          setData((current) => ({
            ...current,
            users: current.users.map((u) =>
              u.id === user.id ? { ...u, role, isActive } : u,
            ),
          }));
          notify("Đã cập nhật quyền tài khoản");
          setConfirm(false);
        }}
      />
    </Stack>
  );
}
