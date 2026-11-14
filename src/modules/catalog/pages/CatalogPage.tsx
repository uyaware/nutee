import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Drawer,
  MenuItem,
  Pagination,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import FilterListRounded from "@mui/icons-material/FilterListRounded";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { services } from "@/app/services";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/shared/components/Feedback";
import {
  parseCatalogFilters,
  serializeCatalogFilters,
} from "@/modules/catalog/model/filters";
import { money } from "@/shared/lib/format";
import type { CatalogFilters as Filters } from "@/modules/catalog/model/types";
import { CatalogFilters } from "@/modules/catalog/components/CatalogFilters";
import { ProductCard } from "@/modules/catalog/components/ProductCard";
import { tokens } from "@/shared/theme/tokens";

const sorts = {
  "best-selling": "Bán nhiều nhất",
  "price-asc": "Giá tăng dần",
  "price-desc": "Giá giảm dần",
  name: "Tên A–Z",
  newest: "Cập nhật mới nhất",
};
export default function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const filters = parseCatalogFilters(params);
  const query = useQuery({
    queryKey: ["catalog", "list", filters],
    queryFn: () => services.catalog.list(filters),
    placeholderData: keepPreviousData,
  });
  const update = (changes: Partial<Filters>) =>
    setParams(
      serializeCatalogFilters({
        ...filters,
        ...changes,
        page: changes.page ?? 1,
      }),
    );
  const canonical = serializeCatalogFilters({
    ...filters,
    page: query.data?.page ?? filters.page,
  }).toString();
  useEffect(() => {
    if (
      query.data &&
      !query.isPlaceholderData &&
      params.toString() !== canonical
    )
      setParams(canonical, { replace: true });
  }, [canonical, params, setParams, query.data, query.isPlaceholderData]);
  const chips: { key: string; label: string; remove: () => void }[] = [];
  if (filters.q)
    chips.push({
      key: "q",
      label: `Tìm: ${filters.q}`,
      remove: () => update({ q: "" }),
    });
  if (filters.category)
    chips.push({
      key: "category",
      label:
        query.data?.facets.categories.find((c) => c.id === filters.category)
          ?.name ?? filters.category,
      remove: () => update({ category: "" }),
    });
  filters.brands.forEach((id) =>
    chips.push({
      key: `brand-${id}`,
      label: query.data?.facets.brands.find((b) => b.id === id)?.name ?? id,
      remove: () => update({ brands: filters.brands.filter((b) => b !== id) }),
    }),
  );
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined)
    chips.push({
      key: "price",
      label: `${money(filters.minPrice ?? 0)} – ${filters.maxPrice === undefined ? "Không giới hạn" : money(filters.maxPrice)}`,
      remove: () => update({ minPrice: undefined, maxPrice: undefined }),
    });
  if (filters.inStock)
    chips.push({
      key: "stock",
      label: "Còn hàng",
      remove: () => update({ inStock: false }),
    });
  if (filters.discounted)
    chips.push({
      key: "discounted",
      label: "Đang giảm giá",
      remove: () => update({ discounted: false }),
    });
  Object.entries(filters.specifications).forEach(([key, values]) =>
    values.forEach((value) =>
      chips.push({
        key: `spec-${key}-${value}`,
        label: `${query.data?.facets.specifications.find((s) => s.key === key)?.label ?? key}: ${value}`,
        remove: () =>
          update({
            specifications: {
              ...filters.specifications,
              [key]: values.filter((v) => v !== value),
            },
          }),
      }),
    ),
  );
  const filterPanel = query.data && (
    <CatalogFilters
      filters={filters}
      facets={query.data.facets}
      onChange={update}
    />
  );
  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="overline" color="primary">
          KHÁM PHÁ NUTEE
        </Typography>
        <Typography variant="h1">Sản phẩm</Typography>
      </Box>
      <Stack direction="row" useFlexGap flexWrap="wrap" spacing={1}>
        {chips.map((chip) => (
          <Chip
            key={chip.key}
            label={chip.label}
            onDelete={chip.remove}
            sx={{
              maxWidth: "100%",
              height: "auto",
              minHeight: 44,
              "& .MuiChip-label": {
                whiteSpace: "normal",
                py: 0.5,
                overflowWrap: "anywhere",
              },
              "& .MuiChip-deleteIcon": { flexShrink: 0 },
            }}
          />
        ))}
        {!!chips.length && (
          <Button
            onClick={() =>
              setParams(
                serializeCatalogFilters({
                  ...parseCatalogFilters(new URLSearchParams()),
                  sort: filters.sort,
                  pageSize: filters.pageSize,
                }),
              )
            }
          >
            Xóa bộ lọc
          </Button>
        )}
      </Stack>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            md: `${tokens.layout.filterTabletWidth}px minmax(0, 1fr)`,
            lg: `${tokens.layout.filterWidth}px minmax(0, 1fr)`,
          },
          gap: 2,
          alignItems: "start",
        }}
      >
        <Paper
          component="aside"
          variant="outlined"
          aria-label="Bộ lọc sản phẩm"
          sx={{
            p: 2,
            display: { xs: "none", md: "block" },
            position: "sticky",
            top: tokens.layout.storefrontHeaderHeight + 16,
            maxHeight: `calc(100dvh - ${tokens.layout.storefrontHeaderHeight + 32}px)`,
            overflowY: "auto",
            overscrollBehavior: "contain",
            scrollbarWidth: "thin",
            scrollPaddingBlock: 16,
          }}
        >
          {filterPanel ?? <LoadingState />}
        </Paper>
        <Stack spacing={2} sx={{ minWidth: 0 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ sm: "center" }}
          >
            <Typography role="status" aria-label="Số sản phẩm" sx={{ flex: 1 }}>
              {query.data
                ? `${query.data.total} sản phẩm`
                : "Đang tìm sản phẩm…"}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<FilterListRounded />}
              onClick={() => setOpen(true)}
              disabled={!query.data}
              sx={{ display: { md: "none" } }}
            >
              Bộ lọc
            </Button>
            <TextField
              select
              label="Sắp xếp"
              value={filters.sort}
              onChange={(e) =>
                update({ sort: e.target.value as Filters["sort"] })
              }
              sx={{ width: { xs: "100%", sm: 220 } }}
            >
              {Object.entries(sorts).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          {query.isPending || query.isPlaceholderData ? (
            <LoadingState />
          ) : query.isError ? (
            <ErrorState
              error={query.error}
              retry={() => void query.refetch()}
            />
          ) : !query.data.items.length ? (
            <EmptyState
              title="Không tìm thấy sản phẩm"
              description="Thử từ khóa khác hoặc xóa bớt bộ lọc để tìm thêm sản phẩm."
            />
          ) : (
            <>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, minmax(0, 1fr))",
                    lg: "repeat(4, minmax(0, 1fr))",
                  },
                  gap: 2,
                }}
              >
                {query.data.items.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    returnTo={`/products${canonical ? `?${canonical}` : ""}`}
                  />
                ))}
              </Box>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                alignItems="center"
                justifyContent="space-between"
              >
                <Pagination
                  count={Math.ceil(query.data.total / filters.pageSize)}
                  page={query.data.page}
                  onChange={(_, page) => {
                    update({ page });
                    document
                      .getElementById("main-content")
                      ?.focus({ preventScroll: true });
                    window.scrollTo(0, 0);
                  }}
                  size="small"
                  sx={{
                    "& .MuiPaginationItem-root": { minWidth: 44, height: 44 },
                  }}
                  getItemAriaLabel={(type, page) =>
                    type === "page"
                      ? `Trang ${page}`
                      : type === "next"
                        ? "Trang tiếp"
                        : type === "previous"
                          ? "Trang trước"
                          : type === "first"
                            ? "Trang đầu"
                            : "Trang cuối"
                  }
                />
                <TextField
                  select
                  label="Số sản phẩm mỗi trang"
                  value={filters.pageSize}
                  onChange={(e) => update({ pageSize: Number(e.target.value) })}
                  sx={{ width: 200 }}
                >
                  {[12, 24, 48].map((size) => (
                    <MenuItem key={size} value={size}>
                      {size} sản phẩm
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            </>
          )}
        </Stack>
      </Box>
      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <Stack
          sx={{
            width: {
              xs: "min(360px, 100dvw)",
              sm: tokens.layout.filterDrawerWidth,
            },
            height: "100%",
          }}
        >
          <Box
            sx={{
              p: 2,
              borderBottom: "1px solid",
              borderColor: "divider",
              flexShrink: 0,
            }}
          >
            <Button
              fullWidth
              onClick={() => setOpen(false)}
              variant="contained"
            >
              Xem kết quả
            </Button>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1, textAlign: "center" }}
            >
              {query.data?.total ?? 0} sản phẩm phù hợp
            </Typography>
          </Box>
          <Box
            sx={{
              p: 2,
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              overscrollBehavior: "contain",
            }}
          >
            {filterPanel}
          </Box>
        </Stack>
      </Drawer>
    </Stack>
  );
}
