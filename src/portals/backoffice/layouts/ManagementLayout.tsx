import { useState } from "react";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import DashboardOutlined from "@mui/icons-material/DashboardOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import PeopleOutlineRounded from "@mui/icons-material/PeopleOutlineRounded";
import MenuRounded from "@mui/icons-material/MenuRounded";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import ArrowOutwardRounded from "@mui/icons-material/ArrowOutwardRounded";
import SupportAgentRounded from "@mui/icons-material/SupportAgentRounded";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Brand } from "../../../shared/components/Brand";
import { ErrorState } from "../../../shared/components/Feedback";
import { useLogout, useSession } from "../../../shared/auth/useSession";
import { hasPermission, roleLabels } from "../../../shared/auth/permissions";

export function ManagementLayout() {
  const session = useSession("backoffice");
  const logout = useLogout("backoffice");
  const [open, setOpen] = useState(false);
  const user = session.data!;
  const links = [
    { to: "/management", label: "Tổng quan", icon: DashboardOutlined },
    {
      to: "/management/orders",
      label: "Đơn hàng",
      icon: ReceiptLongOutlined,
    },
    {
      to: "/management/after-sales",
      label: "Hậu mãi",
      icon: SupportAgentRounded,
    },
    ...(hasPermission(user.role, "products:write")
      ? [
          {
            to: "/management/products",
            label: "Sản phẩm",
            icon: Inventory2Outlined,
          },
          {
            to: "/management/users",
            label: "Tài khoản",
            icon: PeopleOutlineRounded,
          },
        ]
      : []),
  ];
  const sidebar = (
    <Stack sx={{ height: "100%", p: 2.5 }}>
      <Box sx={{ py: 1, mb: 4 }}>
        <Brand management />
      </Box>
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ px: 1.5, mb: 1 }}
      >
        VẬN HÀNH
      </Typography>
      <List sx={{ flex: 1 }}>
        {links.map(({ to, label, icon: Icon }) => (
          <ListItemButton
            key={to}
            component={NavLink}
            to={to}
            end={to === "/management"}
            onClick={() => setOpen(false)}
            sx={{
              borderRadius: 2,
              mb: 0.75,
              minHeight: 48,
              "&.active": {
                bgcolor: "action.selected",
                color: "primary.main",
                "& .MuiListItemIcon-root": { color: "primary.main" },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <Icon />
            </ListItemIcon>
            <ListItemText
              primary={label}
              slotProps={{ primary: { fontSize: 14, fontWeight: 500 } }}
            />
          </ListItemButton>
        ))}
      </List>
      <Button
        component={Link}
        to="/"
        endIcon={<ArrowOutwardRounded />}
        sx={{ mb: 2 }}
      >
        Xem cửa hàng
      </Button>
      <Divider />
      <Stack direction="row" sx={{ mt: 2 }} spacing={1.5} alignItems="center">
        <Avatar sx={{ bgcolor: "primary.main", width: 36, height: 36 }}>
          {user.name.slice(0, 1)}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="body2"
            fontWeight={600}
            sx={{ overflowWrap: "anywhere" }}
          >
            {user.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {roleLabels[user.role]}
          </Typography>
        </Box>
        <IconButton
          aria-label="Đăng xuất vận hành"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          <LogoutRounded fontSize="small" />
        </IconButton>
      </Stack>
    </Stack>
  );
  return (
    <Box sx={{ display: "flex", minHeight: "100dvh" }}>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          width: 264,
          flexShrink: 0,
          "& .MuiDrawer-paper": { width: 264, boxSizing: "border-box" },
        }}
      >
        {sidebar}
      </Drawer>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        sx={{ "& .MuiDrawer-paper": { width: 288 } }}
      >
        {sidebar}
      </Drawer>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <AppBar
          color="inherit"
          position="sticky"
          elevation={0}
          sx={{ borderBottom: "1px solid", borderColor: "divider" }}
        >
          <Toolbar
            sx={{
              justifyContent: "space-between",
              minHeight: "76px !important",
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <IconButton
                aria-label="Mở menu vận hành"
                onClick={() => setOpen(true)}
                sx={{ display: { md: "none" } }}
              >
                <MenuRounded />
              </IconButton>
              <Typography fontWeight={600}>NUTEE Workspace</Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Cổng vận hành
            </Typography>
          </Toolbar>
        </AppBar>
        <Box
          component="main"
          id="main-content"
          tabIndex={-1}
          sx={{ p: { xs: 2.5, md: 4 }, maxWidth: 1600, mx: "auto" }}
        >
          {logout.isError && <ErrorState error={logout.error} />}
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
