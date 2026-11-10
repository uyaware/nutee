import { useId, useState } from "react";
import {
  Box,
  Button,
  Divider,
  ListItemIcon,
  ListSubheader,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import CategoryOutlined from "@mui/icons-material/CategoryOutlined";
import DevicesOutlined from "@mui/icons-material/DevicesOutlined";
import LaptopMacRounded from "@mui/icons-material/LaptopMacRounded";
import SmartphoneRounded from "@mui/icons-material/SmartphoneRounded";
import KeyboardRounded from "@mui/icons-material/KeyboardRounded";
import AppsRounded from "@mui/icons-material/AppsRounded";
import SellOutlined from "@mui/icons-material/SellOutlined";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { services } from "@/app/services";
import { ErrorState } from "@/shared/components/Feedback";

const categoryIcons: Record<string, typeof CategoryOutlined> = {
  electronics: DevicesOutlined,
  laptop: LaptopMacRounded,
  smartphone: SmartphoneRounded,
  keyboard: KeyboardRounded,
};

export function CategoryNavigation({ dark = false }: { dark?: boolean }) {
  const id = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const location = useLocation();
  const filters =
    location.pathname === "/products"
      ? new URLSearchParams(location.search)
      : new URLSearchParams();
  const selectedCategory = filters.get("category");
  const selectedBrands = filters.getAll("brand");
  const categories = useQuery({
    queryKey: ["catalog", "categories"],
    queryFn: services.catalog.categories,
  });
  const brands = useQuery({
    queryKey: ["catalog", "brands"],
    queryFn: services.catalog.brands,
  });
  return (
    <>
      <Button
        id={`${id}-trigger`}
        startIcon={<CategoryOutlined />}
        aria-haspopup="menu"
        aria-controls={anchor ? `${id}-menu` : undefined}
        aria-expanded={!!anchor}
        variant={anchor ? "contained" : "outlined"}
        onClick={(event) => setAnchor(event.currentTarget)}
        sx={{ px: { xs: 1.25, sm: 2 }, whiteSpace: "nowrap" }}
      >
        Danh mục
      </Button>
      <Menu
        id={`${id}-menu`}
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          list: { "aria-labelledby": `${id}-trigger` },
          paper: {
            sx: {
              mt: 1,
              minWidth: 260,
              maxWidth: "calc(100vw - 32px)",
              ...(dark && {
                bgcolor: "#141a25",
                color: "#f2f4f8",
                border: "1px solid #38465c",
                "& .MuiListSubheader-root": { bgcolor: "#141a25", color: "#b8c5d8" },
                "& .MuiListItemIcon-root": { color: "#a8c3ff" },
                "& .MuiDivider-root": { borderColor: "#38465c" },
                "& .MuiMenuItem-root.Mui-disabled": { color: "#b8c5d8", opacity: 1 },
              }),
            },
          },
        }}
      >
        <MenuItem
          component={Link}
          to="/products"
          selected={
            location.pathname === "/products" &&
            !selectedCategory &&
            !selectedBrands.length
          }
          onClick={() => setAnchor(null)}
          sx={{ minHeight: { xs: 48, sm: 48 } }}
        >
          <ListItemIcon sx={{ minWidth: 32, color: "primary.main" }}>
            <AppsRounded fontSize="small" />
          </ListItemIcon>
          Tất cả sản phẩm
        </MenuItem>
        <Divider />
        <ListSubheader disableSticky role="presentation">
          Danh mục sản phẩm
        </ListSubheader>
        {categories.isPending && (
          <MenuItem disabled>Đang tải danh mục…</MenuItem>
        )}
        {categories.isError && (
          <Box sx={{ p: 2 }}>
            <ErrorState
              error={categories.error}
              retry={() => void categories.refetch()}
            />
          </Box>
        )}
        {categories.data?.map((category) => {
          const Icon = categoryIcons[category.id] ?? CategoryOutlined;
          return (
            <MenuItem
              key={category.id}
              component={Link}
              to={`/products?${new URLSearchParams({ category: category.id })}`}
              selected={selectedCategory === category.id}
              onClick={() => setAnchor(null)}
              sx={{
                minHeight: { xs: 48, sm: 48 },
                pl: category.parentId ? 4 : 2,
                whiteSpace: "normal",
              }}
            >
              <ListItemIcon sx={{ minWidth: 32, color: "primary.main" }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              <Typography
                component="span"
                variant="body2"
                fontWeight={category.parentId ? 400 : 600}
              >
                {category.name}
              </Typography>
            </MenuItem>
          );
        })}
        <Divider />
        <ListSubheader disableSticky role="presentation">
          Thương hiệu
        </ListSubheader>
        {brands.isPending && (
          <MenuItem disabled>Đang tải thương hiệu…</MenuItem>
        )}
        {brands.isError && (
          <Box sx={{ p: 2 }}>
            <ErrorState
              error={brands.error}
              retry={() => void brands.refetch()}
            />
          </Box>
        )}
        {brands.isSuccess && !brands.data.length && (
          <MenuItem disabled>Chưa có thương hiệu</MenuItem>
        )}
        {brands.data?.map((brand) => (
          <MenuItem
            key={brand.id}
            component={Link}
            to={`/products?${new URLSearchParams({ brand: brand.id })}`}
            selected={selectedBrands.includes(brand.id)}
            onClick={() => setAnchor(null)}
            sx={{ minHeight: 48, whiteSpace: "normal" }}
          >
            <ListItemIcon sx={{ minWidth: 32, color: "primary.main" }}>
              <SellOutlined fontSize="small" />
            </ListItemIcon>
            <Typography component="span" variant="body2">
              {brand.name}
            </Typography>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
