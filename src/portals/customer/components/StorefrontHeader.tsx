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
import { Brand } from "../../../shared/components/Brand";
import { useSession } from "../../../shared/auth/useSession";
import { tokens } from "../../../shared/theme/tokens";
import { useCart } from "./useCart";
import { CategoryNavigation } from "./CategoryNavigation";

export function StorefrontHeader() {
  const location = useLocation();
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
        height: {
          xs: tokens.layout.storefrontMobileHeaderHeight,
          md: tokens.layout.storefrontHeaderHeight,
        },
      }}
    >
      <Container maxWidth="xl" sx={{ height: "100%" }}>
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
            <CategoryNavigation />
          </Stack>
          <Box
            component="form"
            key={search}
            role="search"
            aria-label="Tìm sản phẩm toàn cửa hàng"
            sx={{ gridArea: "search", minWidth: 0 }}
            onSubmit={(event) => {
              event.preventDefault();
              const q = String(
                new FormData(event.currentTarget).get("q") ?? "",
              ).trim();
              navigate(`/products${q ? `?${new URLSearchParams({ q })}` : ""}`);
            }}
          >
            <TextField
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
              variant="contained"
              startIcon={<PersonOutlineRounded />}
              sx={{
                px: { xs: 1.25, sm: 2 },
                whiteSpace: "nowrap",
                "& .MuiButton-startIcon": {
                  display: { xs: "none", sm: "inline-flex" },
                },
              }}
            >
              {session.data ? "Tài khoản" : "Đăng nhập"}
            </Button>
          </Stack>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
