import { useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Collapse,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import DashboardOutlined from "@mui/icons-material/DashboardOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import PeopleOutlineRounded from "@mui/icons-material/PeopleOutlineRounded";
import MenuRounded from "@mui/icons-material/MenuRounded";
import MenuOpenRounded from "@mui/icons-material/MenuOpenRounded";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import SupportAgentRounded from "@mui/icons-material/SupportAgentRounded";
import CategoryOutlined from "@mui/icons-material/CategoryOutlined";
import SellOutlined from "@mui/icons-material/SellOutlined";
import LocalOfferOutlined from "@mui/icons-material/LocalOfferOutlined";
import { alpha, useTheme } from "@mui/material/styles";
import { Link, NavLink, Outlet } from "react-router-dom";
import { tokens } from "../../../shared/theme/tokens";
import { ErrorState } from "../../../shared/components/Feedback";
import { useLogout, useSession } from "../../../shared/auth/useSession";
import { hasPermission, roleLabels } from "../../../shared/auth/permissions";
import { AdminPrototypeProvider } from "../components/AdminPrototypeProvider";

export function ManagementLayout() {
  const session = useSession("backoffice");
  const logout = useLogout("backoffice");
  const theme = useTheme();
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const user = session.data!;
  // Enough room for the logo and its control to remain on the same row.
  const width = collapsed ? 112 : 264;
  const duration = reduceMotion
    ? 0
    : collapsed
      ? theme.transitions.duration.leavingScreen
      : theme.transitions.duration.enteringScreen;
  const transition = theme.transitions.create(["width", "padding"], {
    duration,
    easing: theme.transitions.easing.sharp,
  });
  const links = [
    { to: "/management", label: "Tổng quan", icon: DashboardOutlined },
    { to: "/management/orders", label: "Đơn hàng", icon: ReceiptLongOutlined },
    {
      to: "/management/after-sales",
      label: "Yêu cầu",
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
            to: "/management/brands",
            label: "Thương hiệu",
            icon: SellOutlined,
          },
          {
            to: "/management/categories",
            label: "Danh mục",
            icon: CategoryOutlined,
          },
          {
            to: "/management/promotions",
            label: "Khuyến mãi",
            icon: LocalOfferOutlined,
          },
          {
            to: "/management/users",
            label: "Tài khoản",
            icon: PeopleOutlineRounded,
          },
        ]
      : []),
  ];

  const sidebar = (compact: boolean, mobile = false) => (
    <Stack sx={{ minHeight: "100%", width: "100%" }}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.5}
        sx={{ height: 88, px: 1, flexShrink: 0 }}
      >
        <Stack
          component={Link}
          to="/management"
          aria-label="NUTEE — Tổng quan"
          direction="row"
          alignItems="center"
          sx={{
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textDecoration: "none",
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <Box
              component="img"
              src="/logo_nutee.png"
              alt=""
              sx={{
                width: 60,
                height: 60,
                objectFit: "contain",
                flexShrink: 0,
                display: "block",
              }}
            />
          </Box>
          <Collapse
            orientation="horizontal"
            in={!compact}
            timeout={duration}
            aria-hidden={compact}
          >
            <Box sx={{ width: 112, pl: 1 }}>
              <Typography
                fontWeight={800}
                fontSize={21}
                color="primary.main"
                sx={{ lineHeight: 1.2, letterSpacing: "-.04em" }}
              >
                NUTEE
              </Typography>
              <Typography variant="caption" color="text.secondary">
                WORKSPACE
              </Typography>
            </Box>
          </Collapse>
        </Stack>
        <Tooltip
          title={
            mobile
              ? "Đóng menu"
              : compact
                ? "Mở rộng sidebar"
                : "Thu gọn sidebar"
          }
        >
          <IconButton
            aria-label={
              mobile
                ? "Đóng menu vận hành"
                : compact
                  ? "Mở rộng sidebar"
                  : "Thu gọn sidebar"
            }
            aria-expanded={!compact}
            onClick={() =>
              mobile ? setOpen(false) : setCollapsed((value) => !value)
            }
            sx={{
              color: "primary.main",
              borderRadius: 0,
              flexShrink: 0,
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            {mobile ? (
              <CloseRounded />
            ) : compact ? (
              <MenuRounded />
            ) : (
              <MenuOpenRounded />
            )}
          </IconButton>
        </Tooltip>
      </Stack>
      <Typography
        variant="overline"
        color="text.secondary"
        aria-hidden={compact}
        sx={{
          height: 40,
          px: 2,
          display: "flex",
          alignItems: "center",
          opacity: compact ? 0 : 1,
          whiteSpace: "nowrap",
          overflow: "hidden",
          transition: theme.transitions.create("opacity", { duration }),
        }}
      >
        VẬN HÀNH
      </Typography>
      <List
        component="nav"
        aria-label="Điều hướng vận hành"
        sx={{
          width: "100%",
          flex: 1,
          p: 0,
        }}
      >
        {links.map(({ to, label, icon: Icon }) => (
          <Tooltip key={to} title={compact ? label : ""} placement="right">
            <ListItemButton
              component={NavLink}
              to={to}
              aria-label={label}
              end={to === "/management"}
              onClick={() => setOpen(false)}
              sx={{
                width: "100%",
                borderRadius: 0,
                minHeight: 56,
                m: 0,
                px: compact ? 4.25 : 2,
                borderBottom: "1px solid",
                borderColor: "divider",
                "&:last-child": { borderBottom: 0 },
                color: "text.primary",
                overflow: "hidden",
                transition: `${transition}, ${theme.transitions.create(["background-color", "color"], { duration: reduceMotion ? 0 : theme.transitions.duration.shortest })}`,
                "& .MuiListItemIcon-root": { color: "primary.main" },
                "&:hover, &.active": {
                  bgcolor: tokens.color.blueTint,
                  color: "primary.main",
                  "& .MuiListItemIcon-root": { color: "primary.main" },
                },
                "&.active .MuiListItemText-primary": { fontWeight: 700 },
                "&.Mui-focusVisible": {
                  boxShadow: `inset 0 0 0 3px ${tokens.color.cyan}`,
                },
              }}
            >
              <ListItemIcon
                sx={{ minWidth: 44, flexShrink: 0, justifyContent: "center" }}
              >
                <Icon />
              </ListItemIcon>
              <Collapse
                orientation="horizontal"
                in={!compact}
                timeout={duration}
                aria-hidden={compact}
              >
                <ListItemText
                  primary={label}
                  sx={{ m: 0, width: 170, whiteSpace: "nowrap" }}
                  slotProps={{ primary: { fontSize: 14, fontWeight: 500 } }}
                />
              </Collapse>
            </ListItemButton>
          </Tooltip>
        ))}
      </List>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ px: 1.5, py: 2, mt: 2, minHeight: 80 }}
      >
        <Tooltip
          title={compact ? `${user.name} · ${roleLabels[user.role]}` : ""}
          placement="right"
        >
          <Avatar
            alt={user.name}
            sx={{
              bgcolor: "primary.main",
              width: 36,
              height: 36,
              flexShrink: 0,
            }}
          >
            {user.name.slice(0, 1)}
          </Avatar>
        </Tooltip>
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            display: compact ? "none" : "block",
          }}
        >
          <Typography variant="body2" fontWeight={600} noWrap>
            {user.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {roleLabels[user.role]}
          </Typography>
        </Box>
        <Tooltip title="Đăng xuất">
          <span>
            <IconButton
              aria-label="Đăng xuất vận hành"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              sx={{
                color: "primary.main",
                borderRadius: 0,
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              <LogoutRounded fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    </Stack>
  );

  return (
    <AdminPrototypeProvider key={user.id}>
      <Box
        sx={{
          display: "flex",
          minHeight: "100dvh",
          bgcolor: "background.default",
          backgroundImage: `radial-gradient(ellipse at top right, ${alpha(tokens.color.cyan, 0.035)}, transparent 55%)`,
        }}
      >
        <Drawer
          variant="permanent"
          open={!collapsed}
          sx={{
            display: { xs: "none", md: "block" },
            width,
            flexShrink: 0,
            transition,
            "& .MuiDrawer-paper": {
              width,
              transition,
              boxSizing: "border-box",
              overflowX: "hidden",
              bgcolor: "background.paper",
              color: "text.primary",
              backgroundImage: "none",
              borderRight: "1px solid",
              borderColor: "divider",
            },
          }}
        >
          {sidebar(collapsed)}
        </Drawer>
        <Drawer
          open={open}
          onClose={() => setOpen(false)}
          transitionDuration={reduceMotion ? 0 : undefined}
          sx={{
            "& .MuiDrawer-paper": {
              width: 288,
              maxWidth: "100vw",
              bgcolor: "background.paper",
              color: "text.primary",
              backgroundImage: "none",
            },
          }}
        >
          {sidebar(false, true)}
        </Drawer>
        <Box
          component="main"
          id="main-content"
          tabIndex={-1}
          sx={{
            flex: 1,
            minWidth: 0,
            p: { xs: 2.5, md: 4 },
            maxWidth: 1600,
            mx: "auto",
          }}
        >
          <Button
            startIcon={<MenuRounded />}
            onClick={() => setOpen(true)}
            aria-label="Mở menu vận hành"
            aria-expanded={open}
            sx={{
              display: { xs: "inline-flex", md: "none" },
              mb: 2,
              bgcolor: "common.white",
              borderRadius: 0,
            }}
          >
            Menu
          </Button>
          {logout.isError && <ErrorState error={logout.error} />}
          <Outlet />
        </Box>
      </Box>
    </AdminPrototypeProvider>
  );
}
