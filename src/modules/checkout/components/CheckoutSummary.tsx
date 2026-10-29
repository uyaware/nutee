import { Box, Divider, Paper, Stack, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import { money } from "@/shared/lib/format";
import type { Order } from "@/shared/types/database";
import {
  checkoutItems,
  checkoutQuote,
} from "@/modules/checkout/fixtures/checkout";
import type { OrderItem } from "@/modules/orders/model/types";
import { ProductImage } from "@/modules/catalog/components/ProductImage";

export type CheckoutProduct = Pick<
  OrderItem,
  | "id"
  | "productId"
  | "name"
  | "imageUrl"
  | "configuration"
  | "quantity"
  | "price"
>;

export function OrderProducts({ items }: { items: CheckoutProduct[] }) {
  return (
    <Stack spacing={2}>
      {items.map((item) => (
        <Stack key={item.id} direction="row" spacing={2} alignItems="center">
          <Box
            sx={{
              width: 72,
              height: 72,
              p: 1,
              flexShrink: 0,
              bgcolor: "background.default",
              borderRadius: 1,
            }}
          >
            <ProductImage src={item.imageUrl} alt={`Minh họa ${item.name}`} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              component={Link}
              to={`/products/${item.productId}`}
              sx={{
                fontWeight: 600,
                textDecoration: "none",
                overflowWrap: "anywhere",
              }}
            >
              {item.name}
            </Typography>
            {item.configuration && (
              <Typography variant="body2" color="text.secondary">
                {item.configuration}
              </Typography>
            )}
            <Typography variant="body2">Số lượng: {item.quantity}</Typography>
            <Typography fontWeight={600}>
              {money(item.price * item.quantity)}
            </Typography>
          </Box>
        </Stack>
      ))}
    </Stack>
  );
}

export function OrderTotals({
  quote = checkoutQuote,
}: {
  quote?: Pick<Order, "subtotal" | "discount" | "shipping" | "total">;
}) {
  return (
    <Stack spacing={1.5} sx={{ fontVariantNumeric: "tabular-nums" }}>
      {[
        ["Tạm tính", money(quote.subtotal)],
        ["Ưu đãi NUTEE100", `−${money(quote.discount)}`],
        ["Phí giao hàng", quote.shipping ? money(quote.shipping) : "Miễn phí"],
      ].map(([label, value]) => (
        <Stack
          key={label}
          direction="row"
          justifyContent="space-between"
          gap={2}
        >
          <Typography color="text.secondary">
            {label === "Ưu đãi NUTEE100" && !quote.discount ? "Ưu đãi" : label}
          </Typography>
          <Typography>{value}</Typography>
        </Stack>
      ))}
      <Divider />
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        gap={2}
      >
        <Typography fontWeight={600}>Tổng thanh toán</Typography>
        <Typography variant="h3" component="p" color="primary.main">
          {money(quote.total)}
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary">
        Đã bao gồm VAT.
      </Typography>
    </Stack>
  );
}

export function CheckoutSummary({
  items = checkoutItems,
  quote = checkoutQuote,
}: {
  items?: CheckoutProduct[];
  quote?: Pick<Order, "subtotal" | "discount" | "shipping" | "total">;
}) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
      <Stack spacing={3}>
        <Typography variant="h3" component="h2">
          Đơn hàng của bạn
        </Typography>
        <OrderProducts items={items} />
        <Divider />
        <OrderTotals quote={quote} />
      </Stack>
    </Paper>
  );
}
