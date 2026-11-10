import {
  AppBar,
  Badge,
  Box,
  Button,
  Container,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Toolbar,
} from "@mui/material";
import PersonOutlineRounded from "@mui/icons-material/PersonOutlineRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import ShoppingCartOutlined from "@mui/icons-material/ShoppingCartOutlined";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Brand } from "@/shared/components/Brand";
import { useSession } from "@/modules/auth/hooks/useSession";
import { tokens } from "@/shared/theme/tokens";
import { useCart } from "@/modules/cart/hooks/useCart";
import { CategoryNavigation } from "@/modules/catalog/components/CategoryNavigation";
import { ThemeToggle } from "@/shared/components/ThemeToggle";
import { useCustomerMode } from "@/shared/theme/customerMode";

export function StorefrontHeader() {
  const location = useLocation();
  const { mode } = useCustomerMode();
  const dark = mode === "dark";
  const navigate = useNavigate();
  const session = useSession("customer");
  const cart = useCart();
  const search =
    location.pathname === "/products"
      ? (new URLSearchParams(location.search).get("q") ?? "")
      : "";
  return (
    <AppBar
      position="sticky"
      color="inherit"
      elevation={0}
      sx={{
        borderBottom: "1px solid",
        borderColor: "divider",
        ...(dark && {
          backgroundColor: "#090c13",
          color: "#f2f4f8",
          borderColor: "#293244",
          "& .MuiIconButton-root": { color: "#dce5f5" },
          "& .MuiButton-outlined": { color: "#dce5f5", borderColor: "#687a94" },
          "& .MuiOutlinedInput-root": { backgroundColor: "#141a25", color: "#f2f4f8" },
          "& .MuiOutlinedInput-notchedOutline": { borderColor: "#687a94" },
          "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#b9ccff" },
          "& .MuiInputLabel-root": { color: "#c0cadb" },
          "& .MuiInputLabel-root.Mui-focused": { color: "#b9ccff" },
        }),
        height: {
          xs: tokens.layout.storefrontMobileHeaderHeight,
          md: tokens.layout.storefrontHeaderHeight,
        },
      }}
    >
      <Container maxWidth="lg" sx={{ height: "100%" }}>
        <Toolbar
          disableGutters
          sx={{
            display: "grid",
            height: "100%",
            minHeight: "0 !important",
            gridTemplateAreas: {
              xs: '"left right" "search search"',
              md: '"left search right"',
            },
            gridTemplateColumns: {
              xs: "minmax(0, 1fr) auto",
              md: "auto minmax(0, 1fr) auto",
            },
            gridTemplateRows: { xs: "44px 44px", md: "1fr" },
            alignItems: "center",
            alignContent: "center",
            columnGap: { xs: 1, md: 3 },
            rowGap: 1,
            py: 1.5,
          }}
        >
          <Stack
            direction="row"
            spacing={{ xs: 1, sm: 2 }}
            alignItems="center"
            sx={{ gridArea: "left" }}
          >
            <Brand compact />
            <CategoryNavigation dark={dark} />
          </Stack>
          <Box
            component="form"
            key={search}
            role="search"
            aria-label="Tìm sản phẩm toàn cửa hàng"
            sx={{
              gridArea: "search",
              minWidth: 0,
              width: "100%",
              maxWidth: 500,
              justifySelf: "center",
            }}
            onSubmit={(event) => {
              event.preventDefault();
              const q = String(
                new FormData(event.currentTarget).get("q") ?? "",
              ).trim();
              navigate(`/products${q ? `?${new URLSearchParams({ q })}` : ""}`);
            }}
          >
            <TextField
              type="search"
              name="q"
              label="Tìm sản phẩm"
              defaultValue={search}
              size="small"
              fullWidth
              slotProps={{
                htmlInput: { maxLength: 160 },
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        type="submit"
                        aria-label="Tìm sản phẩm"
                        color="primary"
                      >
                        <SearchRounded />
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ "& .MuiOutlinedInput-root": { pr: 0.5 } }}
            />
          </Box>
          <Stack
            direction="row"
            alignItems="center"
            spacing={{ xs: 0.5, sm: 1 }}
            sx={{ gridArea: "right", justifySelf: "end" }}
          >
            <ThemeToggle />
            <IconButton
              component={Link}
              to="/cart"
              aria-label={`Giỏ hàng${cart.data ? `, ${cart.data.quantity} sản phẩm` : ""}`}
            >
              <Badge badgeContent={cart.data?.quantity ?? 0} color="primary">
                <ShoppingCartOutlined />
              </Badge>
            </IconButton>
            <Button
              component={Link}
              to={session.data ? "/account/profile" : "/login"}
              variant="outlined"
              aria-label={session.data ? "Tài khoản" : "Đăng nhập"}
              startIcon={<PersonOutlineRounded />}
              sx={{
                px: { xs: 1, sm: 2 },
                minWidth: { xs: 44, sm: 0 },
                whiteSpace: "nowrap",
                "& .MuiButton-startIcon": {
                  margin: { xs: 0, sm: undefined },
                },
              }}
            >
              <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>{session.data ? "Tài khoản" : "Đăng nhập"}</Box>
            </Button>
          </Stack>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
