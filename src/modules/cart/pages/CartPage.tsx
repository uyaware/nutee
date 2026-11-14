import { useState } from "react";
import { trackEvent } from "@/shared/analytics/posthog";
import {
    Box,
    Button,
    Checkbox,
    Divider,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControlLabel,
    Paper,
    Stack,
    Typography,
} from "@mui/material";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { services } from "@/app/services";
import { useCart } from "@/modules/cart/hooks/useCart";
import { CartProductRow } from "@/modules/cart/components/CartProductRow";
import {
    EmptyState,
    ErrorState,
    LoadingState,
} from "@/shared/components/Feedback";
import { money } from "@/shared/lib/format";
import { tokens } from "@/shared/theme/tokens";
import type { CartChange } from "@/modules/cart/model/types";

export default function CartPage() {
    const cart = useCart();
    const client = useQueryClient();
    const [clearOpen, setClearOpen] = useState(false);
    const [selection, setSelection] = useState<{
        ownerId: string | null | undefined;
        excluded: Set<string>;
    }>({ ownerId: undefined, excluded: new Set() });
    const change = useMutation({
        onMutate: () => ({ previousItems: cart.data?.items ?? [] }),
        mutationFn: (action: CartChange) => {
            switch (action.type) {
                case "clear":
                    return services.cart.clear();
                case "remove":
                    return services.cart.remove(action.variantId);
                case "quantity":
                    return services.cart.setQuantity(
                        action.variantId,
                        action.quantity,
                    );
            }
        },
        onSuccess: (updated, action, context) => {
            for (const item of context?.previousItems ?? []) {
                if (action.type !== "clear" && item.variantId !== action.variantId) continue;
                const properties = { product_id: item.productId, variant_id: item.variantId, page: "cart" };
                if (action.type === "quantity") {
                    const next = updated.items.find((entry) => entry.variantId === item.variantId);
                    if (next && next.quantity !== item.quantity) trackEvent("cart_quantity_changed", {
                        ...properties, old_quantity: item.quantity, new_quantity: next.quantity,
                    });
                } else if (!updated.items.some((entry) => entry.variantId === item.variantId)) {
                    trackEvent("remove_from_cart", { ...properties, quantity: item.quantity });
                }
            }
            client.setQueryData(["customer", updated.ownerId, "cart"], updated);
            setSelection((current) => ({
                ownerId: updated.ownerId,
                excluded: new Set(
                    current.ownerId === updated.ownerId
                        ? [...current.excluded].filter((id) =>
                              updated.items.some(
                                  (item) => item.variantId === id,
                              ),
                          )
                        : [],
                ),
            }));
        },
        onSettled: () =>
            client.invalidateQueries({
                queryKey: ["customer", cart.data?.ownerId, "cart"],
            }),
    });
    if (cart.isPending) return <LoadingState />;
    if (cart.isError)
        return (
            <Stack spacing={2}>
                <ErrorState
                    error={cart.error}
                    retry={() => void cart.refetch()}
                />
            </Stack>
        );
    const data = cart.data;
    if (!data) return <LoadingState />;
    const excluded =
        selection.ownerId === data.ownerId
            ? selection.excluded
            : new Set<string>();
    const eligible = data.items.filter((item) => item.status === "available");
    const selected = eligible.filter((item) => !excluded.has(item.variantId));
    const quantity = selected.reduce((total, item) => total + item.quantity, 0);
    const subtotal = selected.reduce(
        (total, item) => total + (item.lineTotal ?? 0),
        0,
    );
    const allSelected =
        eligible.length > 0 && selected.length === eligible.length;
    const selectItem = (id: string, checked: boolean) => {
        const next = new Set(excluded);
        if (checked) next.delete(id);
        else next.add(id);
        setSelection({ ownerId: data.ownerId, excluded: next });
    };
    const checkoutPath = `/checkout?${new URLSearchParams({ items: selected.map((item) => item.variantId).join(",") })}`;
    return (
        <Stack spacing={3} sx={{ maxWidth: 1280, mx: "auto" }}>
            <Box>
                <Typography variant="h1">Giỏ hàng của bạn</Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                    Chọn những sản phẩm bạn muốn mua. Tạm tính chỉ bao gồm sản
                    phẩm đã chọn.
                </Typography>
            </Box>
            {change.isError && (
                <ErrorState
                    error={change.error}
                    retry={() => {
                        change.reset();
                        void cart.refetch();
                    }}
                />
            )}
            {!data.items.length ? (
                <Stack spacing={2} alignItems="flex-start">
                    <EmptyState
                        title="Giỏ hàng đang trống"
                        description={
                            cart.isGuest
                                ? "Đăng nhập để xem và lưu giỏ hàng của bạn."
                                : "Khám phá sản phẩm và thêm món bạn muốn mua."
                        }
                    />
                    <Button component={Link} to="/products" variant="contained">
                        Khám phá sản phẩm
                    </Button>
                    {cart.isGuest && (
                        <Button
                            component={Link}
                            to="/login?returnTo=%2Fcart"
                            variant="outlined"
                        >
                            Đăng nhập
                        </Button>
                    )}
                </Stack>
            ) : (
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: {
                            xs: "minmax(0, 1fr)",
                            md: "minmax(0, 1fr) 320px",
                        },
                        gap: 3,
                        alignItems: "start",
                    }}
                >
                    <Paper
                        variant="outlined"
                        sx={{ minWidth: 0, overflow: "hidden" }}
                    >
                        <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            gap={1}
                            useFlexGap
                            flexWrap="wrap"
                            sx={{ px: { xs: 1.5, sm: 2.5 }, py: 1.5 }}
                        >
                            <FormControlLabel
                                sx={{ m: 0 }}
                                control={
                                    <Checkbox
                                        checked={allSelected}
                                        indeterminate={
                                            selected.length > 0 && !allSelected
                                        }
                                        disabled={!eligible.length}
                                        onChange={(_, checked) =>
                                            setSelection({
                                                ownerId: data.ownerId,
                                                excluded: new Set(
                                                    checked
                                                        ? []
                                                        : eligible.map(
                                                              (item) =>
                                                                  item.variantId,
                                                          ),
                                                ),
                                            })
                                        }
                                        sx={{ width: 44, height: 44 }}
                                    />
                                }
                                label={
                                    <Typography fontWeight={600}>
                                        Chọn tất cả ({data.items.length})
                                    </Typography>
                                }
                            />
                            <Typography variant="body2" color="text.secondary">
                                Đã chọn {selected.length}/{data.items.length}{" "}
                                mặt hàng
                            </Typography>
                            <Button
                                color="error"
                                disabled={change.isPending}
                                onClick={() => setClearOpen(true)}
                            >
                                Xóa giỏ hàng
                            </Button>
                        </Stack>
                        <Divider />
                        {data.items.map((item, index) => (
                            <Box key={item.variantId}>
                                {index > 0 && <Divider />}
                                <CartProductRow
                                    item={item}
                                    selected={
                                        item.status === "available" &&
                                        !excluded.has(item.variantId)
                                    }
                                    pending={change.isPending}
                                    onSelect={(checked) =>
                                        selectItem(item.variantId, checked)
                                    }
                                    onQuantity={(next) =>
                                        change.mutate({
                                            type: "quantity",
                                            variantId: item.variantId,
                                            quantity: next,
                                        })
                                    }
                                    onRemove={() =>
                                        change.mutate({
                                            type: "remove",
                                            variantId: item.variantId,
                                        })
                                    }
                                />
                            </Box>
                        ))}
                    </Paper>
                    <Paper
                        variant="outlined"
                        sx={{
                            p: 3,
                            position: { md: "sticky" },
                            top: tokens.layout.storefrontHeaderHeight + 16,
                        }}
                    >
                        <Stack spacing={2.5}>
                            <Typography variant="h3" component="h2">
                                Thông tin đơn hàng
                            </Typography>
                            <Stack
                                direction="row"
                                justifyContent="space-between"
                                gap={1}
                            >
                                <Typography color="text.secondary">
                                    Sản phẩm đã chọn
                                </Typography>
                                <Typography fontWeight={600}>
                                    {quantity} sản phẩm
                                </Typography>
                            </Stack>
                            <Divider />
                            <Box
                                role="status"
                                aria-live="polite"
                                aria-atomic="true"
                            >
                                <Typography color="text.secondary">
                                    Tạm tính ({selected.length} mặt hàng)
                                </Typography>
                                <Typography
                                    variant="h2"
                                    component="p"
                                    color="primary.main"
                                    sx={{
                                        mt: 1,
                                        fontVariantNumeric: "tabular-nums",
                                    }}
                                >
                                    {money(subtotal)}
                                </Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                                Chưa gồm phí giao hàng và ưu đãi.
                            </Typography>
                            {!selected.length && (
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                >
                                    Chọn ít nhất một sản phẩm để tiếp tục thanh
                                    toán.
                                </Typography>
                            )}
                            <Button
                                component={Link}
                                to={
                                    data.ownerId
                                        ? checkoutPath
                                        : `/login?returnTo=${encodeURIComponent(checkoutPath)}`
                                }
                                variant="contained"
                                endIcon={<ArrowForwardRounded />}
                                disabled={!selected.length}
                            >
                                Thanh toán ({quantity})
                            </Button>
                            {!data.ownerId && (
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                >
                                    Đăng nhập để tiếp tục với các sản phẩm đã
                                    chọn.
                                </Typography>
                            )}
                            <Button
                                component={Link}
                                to="/products"
                                variant="outlined"
                            >
                                Tiếp tục mua sắm
                            </Button>
                        </Stack>
                    </Paper>
                </Box>
            )}
            <Dialog
                open={clearOpen}
                onClose={() => setClearOpen(false)}
                aria-labelledby="clear-cart-title"
            >
                <DialogTitle id="clear-cart-title">
                    Xóa toàn bộ giỏ hàng?
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Các sản phẩm sẽ được gỡ khỏi giỏ hàng của bạn.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setClearOpen(false)}>Giữ lại</Button>
                    <Button
                        color="error"
                        onClick={() => {
                            setClearOpen(false);
                            change.mutate({ type: "clear" });
                        }}
                    >
                        Xóa toàn bộ
                    </Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
}
