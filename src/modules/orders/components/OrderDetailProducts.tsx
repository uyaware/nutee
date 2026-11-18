import { Box, Divider, Stack, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import { ProductImage } from "@/modules/catalog/components/ProductImage";
import type { CustomerOrder } from "@/modules/orders/model/api";
import { money } from "@/shared/lib/format";

export function OrderDetailProducts({ items }: { items: CustomerOrder["items"] }) {
    return <Box>
        <Typography variant="h2" sx={{ mb: 2 }}>Sản phẩm đã mua</Typography>
        <Stack divider={<Divider />}>
            {items.map((item) => <Stack key={item.id} direction="row" spacing={1.5} alignItems="flex-start" sx={{ py: 2, flexWrap: "wrap", rowGap: 1 }}>
                <Box sx={{ width: 72, height: 72, flexShrink: 0, p: 1, bgcolor: "background.default", borderRadius: 1 }}>
                    <ProductImage src={item.imageUrl ?? ""} alt={`Minh họa ${item.name}`} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 100 }}>
                    <Typography component={Link} to={`/products/${item.productId}`} sx={{ fontWeight: 700, textDecoration: "none", overflowWrap: "anywhere" }}>{item.name}</Typography>
                    {item.configuration && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{item.configuration}</Typography>}
                    {item.sku && <Typography variant="body2" color="text.secondary">SKU: {item.sku}</Typography>}
                </Box>
                <Box sx={{ textAlign: "right", flexShrink: 0, ml: "auto" }}>
                    <Typography variant="body2" color="text.secondary">SL: {item.quantity}</Typography>
                    <Typography variant="body2" color="text.secondary">{money(item.price)} / sản phẩm</Typography>
                    <Typography fontWeight={700}>{money(item.price * item.quantity)}</Typography>
                </Box>
            </Stack>)}
        </Stack>
    </Box>;
}
