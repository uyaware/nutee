import { useId } from "react";
import type { ReactNode } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import { orderedCategories } from "@/modules/catalog/model/categoryTree";
import type {
  CatalogFacets,
  CatalogFilters as Filters,
} from "@/modules/catalog/model/types";

const pricePresets = [
  {
    id: "all",
    label: "Tất cả mức giá",
    minPrice: undefined,
    maxPrice: undefined,
  },
  {
    id: "under-5",
    label: "Dưới 5 triệu",
    minPrice: undefined,
    maxPrice: 4999999,
  },
  {
    id: "5-15",
    label: "5 – dưới 15 triệu",
    minPrice: 5000000,
    maxPrice: 14999999,
  },
  {
    id: "15-25",
    label: "15 – dưới 25 triệu",
    minPrice: 15000000,
    maxPrice: 24999999,
  },
  {
    id: "over-25",
    label: "Từ 25 triệu",
    minPrice: 25000000,
    maxPrice: undefined,
  },
];

function FilterGroup({
  title,
  selectedCount = 0,
  defaultExpanded = false,
  children,
}: {
  title: string;
  selectedCount?: number;
  defaultExpanded?: boolean;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <Accordion
      disableGutters
      defaultExpanded={defaultExpanded || selectedCount > 0}
      sx={{
        bgcolor: "transparent",
        "&:before": { display: "none" },
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <AccordionSummary
        id={`${id}-heading`}
        aria-controls={`${id}-content`}
        expandIcon={<ExpandMoreRounded fontSize="small" />}
        sx={{
          p: 0,
          minHeight: 44,
          "& .MuiAccordionSummary-content": {
            my: 1,
            alignItems: "center",
            flexWrap: "wrap",
            gap: 1,
          },
        }}
      >
        <Typography component="span" variant="body2" fontWeight={600}>
          {title}
        </Typography>
        {selectedCount > 0 && (
          <Chip
            size="small"
            label={`${selectedCount} đã chọn`}
            sx={{ height: 22, fontSize: ".75rem" }}
          />
        )}
      </AccordionSummary>
      <AccordionDetails id={`${id}-content`} sx={{ p: 0, pb: 1.5 }}>
        <Box role="group" aria-label={title}>
          {children}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}

export function CatalogFilters({
  filters,
  facets,
  onChange,
}: {
  filters: Filters;
  facets: CatalogFacets;
  onChange: (changes: Partial<Filters>) => void;
}) {
  const toggle = (values: string[], value: string) =>
    values.includes(value)
      ? values.filter((v) => v !== value)
      : [...values, value];
  const preset =
    pricePresets.find(
      (p) => p.minPrice === filters.minPrice && p.maxPrice === filters.maxPrice,
    )?.id ?? "custom";
  const checkboxStyle = {
    m: 0,
    width: "100%",
    minHeight: 44,
    alignItems: "center",
    "& .MuiCheckbox-root": { p: 0.75, flexShrink: 0 },
    "& .MuiFormControlLabel-label": {
      typography: "body2",
      flex: 1,
      minWidth: 0,
      overflowWrap: "anywhere",
    },
  };
  return (
    <Stack spacing={1.5}>
      <Typography variant="h4" component="h2">
        Bộ lọc sản phẩm
      </Typography>
      <TextField
        select
        label="Danh mục"
        value={filters.category}
        onChange={(e) =>
          onChange({ category: e.target.value, brands: [], specifications: {} })
        }
      >
        <MenuItem value="">Tất cả danh mục</MenuItem>
        {orderedCategories(facets.categories).map(({ category: c, depth }) => (
          <MenuItem key={c.id} value={c.id}>
            {depth > 0 ? `${"— ".repeat(depth)}` : ""}
            {c.name}
          </MenuItem>
        ))}
        {filters.category &&
          !facets.categories.some((c) => c.id === filters.category) && (
            <MenuItem value={filters.category}>
              Danh mục không còn tồn tại
            </MenuItem>
          )}
      </TextField>
      <FilterGroup
        title="Thương hiệu"
        selectedCount={filters.brands.length}
        defaultExpanded
      >
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", columnGap: 1, rowGap: 0.5 }}>
          {facets.brands.map((b) => (
            <FormControlLabel
              key={b.id}
              sx={checkboxStyle}
              control={
                <Checkbox
                  checked={filters.brands.includes(b.id)}
                  onChange={() =>
                    onChange({ brands: toggle(filters.brands, b.id) })
                  }
                />
              }
              label={b.name}
            />
          ))}
        </Box>
        {!facets.brands.length && (
          <Typography variant="body2" color="text.secondary">
            Không có thương hiệu trong danh mục này.
          </Typography>
        )}
      </FilterGroup>
      <FilterGroup
        title="Khoảng giá"
        selectedCount={
          filters.minPrice !== undefined || filters.maxPrice !== undefined
            ? 1
            : 0
        }
        defaultExpanded
      >
        <Box
          component="form"
          key={`${filters.minPrice}-${filters.maxPrice}`}
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const number = (key: string) =>
              data.get(key) ? Number(data.get(key)) : undefined;
            onChange({
              minPrice: number("minPrice"),
              maxPrice: number("maxPrice"),
            });
          }}
        >
          <Stack spacing={1.5}>
            <TextField
              select
              label="Khoảng giá nhanh"
              value={preset}
              onChange={(e) => {
                const selected = pricePresets.find(
                  (p) => p.id === e.target.value,
                );
                if (selected)
                  onChange({
                    minPrice: selected.minPrice,
                    maxPrice: selected.maxPrice,
                  });
              }}
            >
              {pricePresets.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.label}
                </MenuItem>
              ))}
              {preset === "custom" && (
                <MenuItem value="custom">Khoảng tùy chọn</MenuItem>
              )}
            </TextField>
            <Stack spacing={1.5}>
              <TextField
                type="number"
                name="minPrice"
                label="Giá từ"
                defaultValue={filters.minPrice ?? ""}
                slotProps={{
                  htmlInput: { min: 0, max: Number.MAX_SAFE_INTEGER, step: 1 },
                }}
              />
              <TextField
                type="number"
                name="maxPrice"
                label="Giá đến"
                defaultValue={filters.maxPrice ?? ""}
                slotProps={{
                  htmlInput: { min: 0, max: Number.MAX_SAFE_INTEGER, step: 1 },
                }}
              />
            </Stack>
            <Button type="submit" variant="outlined" fullWidth>
              Áp dụng khoảng giá
            </Button>
          </Stack>
        </Box>
      </FilterGroup>
      <FormControlLabel
        sx={checkboxStyle}
        control={
          <Checkbox
            checked={filters.inStock}
            onChange={(e) => onChange({ inStock: e.target.checked })}
          />
        }
        label="Chỉ sản phẩm còn hàng"
      />
      <FormControlLabel
        sx={checkboxStyle}
        control={<Checkbox checked={filters.discounted} onChange={(e) => onChange({ discounted: e.target.checked })} />}
        label="Đang giảm giá"
      />
      {facets.specifications.map((s) => (
        <FilterGroup
          key={s.key}
          title={s.label}
          selectedCount={filters.specifications[s.key]?.length ?? 0}
        >
          <Stack>
            {s.values.map((value) => (
              <FormControlLabel
                key={value}
                sx={checkboxStyle}
                control={
                  <Checkbox
                    checked={
                      filters.specifications[s.key]?.includes(value) ?? false
                    }
                    onChange={() =>
                      onChange({
                        specifications: {
                          ...filters.specifications,
                          [s.key]: toggle(
                            filters.specifications[s.key] ?? [],
                            value,
                          ),
                        },
                      })
                    }
                  />
                }
                label={value}
              />
            ))}
          </Stack>
        </FilterGroup>
      ))}
      <Button
        onClick={() =>
          onChange({
            category: "",
            brands: [],
            minPrice: undefined,
            maxPrice: undefined,
            inStock: false,
            discounted: false,
            specifications: {},
          })
        }
      >
        Đặt lại bộ lọc
      </Button>
    </Stack>
  );
}
