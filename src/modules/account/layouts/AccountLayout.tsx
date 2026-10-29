import {
  Avatar,
  Box,
  Button,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import PersonOutlineRounded from "@mui/icons-material/PersonOutlineRounded";
import LocationOnOutlined from "@mui/icons-material/LocationOnOutlined";
import ShieldOutlined from "@mui/icons-material/ShieldOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import SupportAgentRounded from "@mui/icons-material/SupportAgentRounded";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useLogout, useSession } from "@/modules/auth/hooks/useSession";
import { ErrorState } from "@/shared/components/Feedback";
import { tokens } from "@/shared/theme/tokens";

const navigation = [
  { path: "profile", label: "Hồ sơ", icon: PersonOutlineRounded },
  { path: "addresses", label: "Địa chỉ", icon: LocationOnOutlined },
  { path: "security", label: "Bảo mật", icon: ShieldOutlined },
  { path: "orders", label: "Đơn hàng", icon: ReceiptLongOutlined },
  {
    path: "after-sales",
    label: "Bảo hành & đổi trả",
    icon: SupportAgentRounded,
  },
];

export function AccountLayout() {
  const session = useSession("customer");
  const logout = useLogout("customer");
  const user = session.data;
  return (
    <Stack
      spacing={3}
      sx={{ maxWidth: 1200, mx: "auto", py: { xs: 0, md: 1 } }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        useFlexGap
        flexWrap="wrap"
        gap={1}
      >
        <Typography variant="h2" component="p">
          Tài khoản của bạn
        </Typography>
        <Button
          component={Link}
          to="/products"
          startIcon={<ArrowBackRounded />}
          color="secondary"
        >
          Tiếp tục mua sắm
        </Button>
      </Stack>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            md: "264px minmax(0, 1fr)",
          },
          gap: { xs: 3, md: 4 },
          alignItems: "start",
        }}
      >
        <Paper
          component="aside"
          variant="outlined"
          sx={{
            p: 2,
            position: { md: "sticky" },
            top: { md: tokens.layout.storefrontHeaderHeight + 16 },
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.5}
            sx={{ p: 1, pb: 2.5 }}
          >
            <Avatar
              sx={{
                width: 44,
                height: 44,
                bgcolor: "action.selected",
                color: "primary.main",
                fontWeight: 600,
              }}
            >
              {user?.name.trim().charAt(0).toLocaleUpperCase("vi") || (
                <PersonOutlineRounded />
              )}
            </Avatar>
            <Box sx={{ minWidth: 0, overflowWrap: "anywhere" }}>
              <Typography sx={{ fontWeight: 600 }}>{user?.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {user?.email}
              </Typography>
            </Box>
          </Stack>
          <Divider sx={{ mb: 2 }} />
          <Box
            component="nav"
            aria-label="Tài khoản khách hàng"
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(2, minmax(0, 1fr))",
                md: "1fr",
              },
              gap: 1,
            }}
          >
            {navigation.map(({ path, label, icon: Icon }) => (
              <Button
                key={path}
                component={NavLink}
                to={`/account/${path}`}
                color="secondary"
                startIcon={<Icon aria-hidden="true" />}
                sx={{
                  justifyContent: "flex-start",
                  minHeight: 48,
                  px: 2,
                  borderRadius: 1,
                  "&.active": {
                    bgcolor: "action.selected",
                    color: "primary.main",
                  },
                }}
              >
                {label}
              </Button>
            ))}
          </Box>
          <Divider sx={{ my: 2 }} />
          <Button
            fullWidth
            startIcon={<LogoutRounded />}
            color="secondary"
            disabled={logout.isPending}
            onClick={() => logout.mutate()}
            sx={{ justifyContent: "flex-start", px: 2 }}
          >
            {logout.isPending ? "Đang đăng xuất…" : "Đăng xuất cửa hàng"}
          </Button>
          {logout.isError && <ErrorState error={logout.error} />}
        </Paper>
        <Box sx={{ minWidth: 0 }}>
          <Outlet />
        </Box>
      </Box>
    </Stack>
  );
}
