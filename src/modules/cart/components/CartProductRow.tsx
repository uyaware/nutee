import {
  Box,
  Checkbox,
  Chip,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import RemoveRounded from "@mui/icons-material/RemoveRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import { Link } from "react-router-dom";
import { ProductImage } from "@/modules/catalog/components/ProductImage";
import { money } from "@/shared/lib/format";
import { MAX_CART_QUANTITY, type CartItem } from "@/modules/cart/model/types";
import { tokens } from "@/shared/theme/tokens";

const issueLabels = {
  hidden: "Đã ngừng bán",
  "out-of-stock": "Tạm hết hàng",
  "insufficient-stock": "Cần giảm số lượng",
};

export function CartProductRow({
  item,
  selected,
  pending,
  onSelect,
  onQuantity,
  onRemove,
}: {
  item: CartItem;
  selected: boolean;
  pending: boolean;
  onSelect: (selected: boolean) => void;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  return (
    <Box
      component="article"
      sx={{
        p: { xs: 1, sm: 2 },
        display: "grid",
        alignItems: "center",
        gridTemplateColumns: {
          xs: "44px minmax(0, 1fr) 44px",
          lg: "44px minmax(0, 1fr) 260px 44px",
        },
        gap: { xs: 1, sm: 2 },
        bgcolor: "background.paper",
        border: "1px solid",
        borderRadius: 1,
        borderColor: selected ? "primary.main" : "transparent",
        transition: "border-color 150ms ease",
      }}
    >
      <Checkbox
        checked={selected}
        disabled={item.status !== "available"}
        onChange={(_, checked) => onSelect(checked)}
        slotProps={{ input: { "aria-label": `Chọn ${item.name}` } }}
        sx={{ width: 44, height: 44, gridColumn: 1, gridRow: 1 }}
      />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "64px minmax(0, 1fr)",
            sm: "80px minmax(0, 1fr)",
          },
          alignItems: "center",
          gap: 1.5,
          minWidth: 0,
          gridColumn: 2,
          gridRow: 1,
        }}
      >
        <Box
          sx={{
            width: { xs: 64, sm: 80 },
            height: { xs: 64, sm: 80 },
            p: 1,
            bgcolor: "background.default",
            borderRadius: 1,
          }}
        >
          <ProductImage src={item.imageUrl} alt={`Minh họa ${item.name}`} />
        </Box>
        <Stack spacing={0.5} sx={{ minWidth: 0 }}>
          <Typography
            variant="h4"
            component="h2"
            sx={{ overflowWrap: "anywhere", lineHeight: 1.5 }}
          >
            {item.status === "hidden" ? (
              item.name
            ) : (
              <Link
                to={`/products/${item.productId}`}
                style={{ textDecoration: "none" }}
              >
                {item.name}
              </Link>
            )}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {money(item.price)}
          </Typography>
          {item.status !== "available" && (
            <Chip
              label={issueLabels[item.status]}
              color="warning"
              size="small"
              variant="outlined"
              sx={{ alignSelf: "flex-start" }}
            />
          )}
          {item.status === "insufficient-stock" && (
            <Typography variant="body2" color="warning.main">
              Chỉ còn {item.stock} sản phẩm.
            </Typography>
          )}
        </Stack>
      </Box>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        gap={1.5}
        useFlexGap
        flexWrap="wrap"
        sx={{
          gridColumn: { xs: "2 / -1", lg: 3 },
          gridRow: { xs: 2, lg: 1 },
          minWidth: 0,
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          sx={{
            height: tokens.layout.controlHeight,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            bgcolor: "background.paper",
            "& .MuiIconButton-root": { borderRadius: 1 },
          }}
        >
          <IconButton
            aria-label={`Giảm số lượng ${item.name}`}
            disabled={
              pending ||
              item.quantity <= 1 ||
              item.stock < 1 ||
              item.status === "hidden"
            }
            onClick={() => onQuantity(Math.min(item.quantity - 1, item.stock))}
          >
            <RemoveRounded fontSize="small" />
          </IconButton>
          <Typography
            aria-label={`Số lượng ${item.name}`}
            sx={{
              minWidth: 24,
              textAlign: "center",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {item.quantity}
          </Typography>
          <IconButton
            aria-label={`Tăng số lượng ${item.name}`}
            disabled={
              pending ||
              item.quantity >= Math.min(item.stock, MAX_CART_QUANTITY) ||
              item.status === "hidden"
            }
            onClick={() => onQuantity(item.quantity + 1)}
          >
            <AddRounded fontSize="small" />
          </IconButton>
        </Stack>
        <Box sx={{ textAlign: "right" }}>
          <Typography variant="body2" color="text.secondary">
            Thành tiền
          </Typography>
          <Typography
            fontWeight={700}
            sx={{ fontVariantNumeric: "tabular-nums" }}
          >
            {money(item.lineTotal)}
          </Typography>
        </Box>
      </Stack>
      <IconButton
        aria-label={`Xóa ${item.name} khỏi giỏ`}
        disabled={pending}
        onClick={onRemove}
        sx={{
          gridColumn: { xs: 3, lg: 4 },
          gridRow: 1,
          alignSelf: "center",
          justifySelf: "center",
          color: "text.secondary",
          "&:hover": { color: "error.main", bgcolor: "action.hover" },
        }}
      >
        <DeleteOutlineRounded />
      </IconButton>
    </Box>
  );
}
