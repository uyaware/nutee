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
import GridViewRounded from "@mui/icons-material/GridViewRounded";
import AppsRounded from "@mui/icons-material/AppsRounded";
import SellOutlined from "@mui/icons-material/SellOutlined";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { services } from "@/app/services";
import { ErrorState } from "@/shared/components/Feedback";
import { orderedCategories } from "@/modules/catalog/model/categoryTree";
import { categoryIcon } from "@/modules/catalog/model/categoryIcons";

export function CategoryNavigation({ dark = false }: { dark?: boolean }) {
  const id = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
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
  const ordered = orderedCategories(categories.data ?? []);
  const roots = ordered.filter(({ depth }) => depth === 0);
  const activeIndex = ordered.findIndex(({ category }) => category.id === activeCategory);
  const children = activeIndex < 0 ? [] : ordered.slice(activeIndex + 1)
    .slice(0, (() => {
      const next = ordered.slice(activeIndex + 1).findIndex(({ depth }) => depth === 0);
      return next < 0 ? undefined : next;
    })());
  const close = () => { setAnchor(null); setActiveCategory(null); };
  return (
    <>
      <Button
        id={`${id}-trigger`}
        startIcon={<GridViewRounded />}
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
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          list: { "aria-labelledby": `${id}-trigger` },
          paper: {
            sx: {
              mt: 1,
              width: children.length ? "min(560px, calc(100vw - 32px))" : 280,
              maxWidth: "calc(100vw - 32px)",
              "& .category-main": { width: children.length ? "50%" : "100%" },
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
          className="category-main"
          to="/products"
          selected={
            location.pathname === "/products" &&
            !selectedCategory &&
            !selectedBrands.length
          }
          onClick={close}
          onMouseEnter={() => setActiveCategory(null)}
          sx={{ minHeight: { xs: 48, sm: 48 } }}
        >
          <ListItemIcon sx={{ minWidth: 32, color: "primary.main" }}>
            <AppsRounded fontSize="small" />
          </ListItemIcon>
          Tất cả sản phẩm
        </MenuItem>
        <Divider className="category-main" />
        <ListSubheader className="category-main" disableSticky role="presentation">
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
        {roots.map(({ category }) => {
          const Icon = categoryIcon(category.name);
          const hasChildren = (categories.data ?? []).some((child) => child.parentId === category.id);
          return (
            <MenuItem
              key={category.id}
              className="category-main"
              component={Link}
              to={`/products?${new URLSearchParams({ category: category.id })}`}
              selected={selectedCategory === category.id}
              onClick={close}
              onMouseEnter={() => setActiveCategory(hasChildren ? category.id : null)}
              onFocus={() => setActiveCategory(hasChildren ? category.id : null)}
              sx={{
                minHeight: { xs: 48, sm: 48 },
                pl: 2,
                whiteSpace: "normal",
              }}
            >
              <ListItemIcon sx={{ minWidth: 32, color: "primary.main" }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              <Typography
                component="span"
                variant="body2"
                fontWeight={600}
                sx={{ flex: 1 }}
              >
                {category.name}
              </Typography>
              {hasChildren && <ChevronRightRounded fontSize="small" />}
            </MenuItem>
          );
        })}
        {children.length > 0 && (
          <Box sx={{ position: "absolute", left: "50%", right: 0, top: 0, bottom: 0,
            bgcolor: "#fff", color: "#172033", borderLeft: "1px solid #e2e8f0", overflowY: "auto", py: 1 }}>
            <Typography sx={{ px: 2, py: 1.5, fontWeight: 700, fontSize: 14 }}>
              {ordered[activeIndex]?.category.name}
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1, px: 1.5 }}>
            {children.map(({ category }) => {
              const Icon = categoryIcon(category.name, ordered[activeIndex]?.category.name);
              return (
              <MenuItem key={category.id} component={Link}
                to={`/products?${new URLSearchParams({ category: category.id })}`}
                selected={selectedCategory === category.id} onClick={close}
                sx={{ aspectRatio: "1", minWidth: 0, p: 1, display: "flex", flexDirection: "column", gap: 0.75,
                  alignItems: "center", justifyContent: "center", textAlign: "center", whiteSpace: "normal",
                  borderRadius: 2, border: "1px solid #dce4f0", bgcolor: "#f8faff", color: "#25354f",
                  "&:hover, &.Mui-selected": { bgcolor: "#e8f0ff", color: "#174aa8" } }}>
                <Icon fontSize="small" sx={{ color: "#3462aa" }} />
                <Typography variant="caption" sx={{ fontWeight: 600, overflowWrap: "anywhere" }}>{category.name}</Typography>
              </MenuItem>
            ); })}
            </Box>
          </Box>
        )}
        <Divider className="category-main" />
        <ListSubheader className="category-main" disableSticky role="presentation">
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
            className="category-main"
            component={Link}
            to={`/products?${new URLSearchParams({ brand: brand.id })}`}
            selected={selectedBrands.includes(brand.id)}
            onClick={close}
            onMouseEnter={() => setActiveCategory(null)}
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
