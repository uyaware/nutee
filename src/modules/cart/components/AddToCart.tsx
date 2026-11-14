import { useState } from "react";
import { trackEvent } from "@/shared/analytics/posthog";
import {
    Alert,
    Button,
    IconButton,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import RemoveRounded from "@mui/icons-material/RemoveRounded";
import ShoppingCartOutlined from "@mui/icons-material/ShoppingCartOutlined";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { services } from "@/app/services";
import { ErrorState } from "@/shared/components/Feedback";
import { MAX_CART_QUANTITY } from "@/modules/cart/model/types";
import { useSession } from "@/modules/auth/hooks/useSession";
import { ServiceError } from "@/shared/lib/errors";

export function AddToCart({
    productId,
    variantId,
    stock,
}: {
    productId: string;
    variantId: string | undefined;
    stock: number;
}) {
    const [quantity, setQuantity] = useState("1");
    const client = useQueryClient();
    const session = useSession("customer");
    const location = useLocation();
    const navigate = useNavigate();
    const add = useMutation({
        mutationFn: (requestedQuantity: number) => {
            if (!variantId)
                throw new ServiceError(
                    "VALIDATION",
                    "Hãy chọn một phiên bản sản phẩm.",
                );
            return services.cart.add(variantId, requestedQuantity);
        },
        onSuccess: (cart, requestedQuantity) => {
            client.setQueryData(["customer", cart.ownerId, "cart"], cart);
            trackEvent("add_to_cart", { product_id: productId, variant_id: variantId ?? null, quantity: requestedQuantity, page: "product_detail" });
        },
        onSettled: () =>
            client.invalidateQueries({
                queryKey: ["customer", session.data?.id, "cart"],
            }),
    });
    const valid =
        Number.isInteger(Number(quantity)) &&
        Number(quantity) >= 1 &&
        Number(quantity) <= Math.min(stock, MAX_CART_QUANTITY);
    return (
        <Stack spacing={2}>
            <Typography
                component="label"
                htmlFor="product-quantity"
                variant="body2"
                fontWeight={600}
            >
                Số lượng
            </Typography>
            <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                alignItems={{ xs: "stretch", sm: "flex-start" }}
            >
                <Stack
                    direction="row"
                    alignItems="center"
                    sx={{ flexShrink: 0, alignSelf: "flex-start" }}
                >
                    <IconButton
                        aria-label="Giảm số lượng"
                        sx={(theme) => ({
                            color: theme.palette.text.primary,
                            bgcolor: theme.palette.action.hover,
                            "&:hover": {
                                bgcolor: theme.palette.action.selected,
                            },
                            "&.Mui-disabled": {
                                color: theme.palette.mode === "dark" ? "#8291a7" : "#9aa5b5",
                                bgcolor: theme.palette.mode === "dark" ? "#202e42" : "#edf1f6",
                            },
                        })}
                        disabled={
                            !valid || Number(quantity) <= 1 || add.isPending
                        }
                        onClick={() => {
                            setQuantity(String(Number(quantity) - 1));
                            add.reset();
                        }}
                    >
                        <RemoveRounded fontSize="small" />
                    </IconButton>
                    <TextField
                        id="product-quantity"
                        type="number"
                        value={quantity}
                        disabled={!stock || add.isPending}
                        onChange={(e) => {
                            setQuantity(e.target.value);
                            add.reset();
                        }}
                        error={!!stock && !valid}
                        slotProps={{
                            htmlInput: {
                                min: 1,
                                max: Math.min(stock, MAX_CART_QUANTITY),
                                step: 1,
                                "aria-describedby":
                                    stock && !valid
                                        ? "product-quantity-error"
                                        : undefined,
                            },
                        }}
                        sx={{
                            width: 64,
                            "& input": {
                                textAlign: "center",
                                px: 0.5,
                                MozAppearance: "textfield",
                            },
                            "& input.Mui-disabled": { WebkitTextFillColor: (theme) => theme.palette.mode === "dark" ? "#8291a7" : "#9aa5b5" },
                            "& input::-webkit-inner-spin-button, & input::-webkit-outer-spin-button":
                                { WebkitAppearance: "none", margin: 0 },
                        }}
                    />
                    <IconButton
                        aria-label="Tăng số lượng"
                        sx={(theme) => ({
                            color: theme.palette.text.primary,
                            bgcolor: theme.palette.action.hover,
                            "&:hover": {
                                bgcolor: theme.palette.action.selected,
                            },
                            "&.Mui-disabled": {
                                color: theme.palette.mode === "dark" ? "#8291a7" : "#9aa5b5",
                                bgcolor: theme.palette.mode === "dark" ? "#202e42" : "#edf1f6",
                            },
                        })}
                        disabled={
                            !valid ||
                            Number(quantity) >=
                                Math.min(stock, MAX_CART_QUANTITY) ||
                            add.isPending
                        }
                        onClick={() => {
                            setQuantity(String(Number(quantity) + 1));
                            add.reset();
                        }}
                    >
                        <AddRounded fontSize="small" />
                    </IconButton>
                </Stack>
                <Button
                    variant="contained"
                    startIcon={<ShoppingCartOutlined />}
                    disabled={
                        !variantId ||
                        !stock ||
                        !valid ||
                        add.isPending ||
                        session.isPending ||
                        session.isError
                    }
                    onClick={() => {
                        if (!session.data) {
                            const params = new URLSearchParams(location.search);
                            if (variantId) params.set("variant", variantId);
                            navigate(
                                `/login?returnTo=${encodeURIComponent(`${location.pathname}?${params}`)}`,
                            );
                            return;
                        }
                        add.mutate(Number(quantity));
                    }}
                    sx={(theme) => ({ flex: 1, minHeight: 44,
                        "&.Mui-disabled": theme.palette.mode === "dark" ? { color: "#8291a7", bgcolor: "#202e42" } : {} })}
                >
                    {add.isPending ? "Đang thêm…" : "Thêm vào giỏ"}
                </Button>
            </Stack>
            {!!stock && !valid && (
                <Typography
                    id="product-quantity-error"
                    variant="caption"
                    color="error.main"
                >
                    Chọn từ 1 đến {Math.min(stock, MAX_CART_QUANTITY)} sản phẩm.
                </Typography>
            )}
            {add.isError && <ErrorState error={add.error} />}
            {session.isError && (
                <ErrorState
                    error={session.error}
                    retry={() => void session.refetch()}
                />
            )}
            {add.isSuccess && (
                <Alert
                    severity="success"
                    role="status"
                    sx={{
                        alignItems: "center",
                        "& .MuiAlert-message": { width: "100%", py: 0 },
                    }}
                >
                    <Stack
                        direction="row"
                        alignItems="center"
                        gap={1}
                        useFlexGap
                        flexWrap="wrap"
                        justifyContent="space-between"
                    >
                        <span>Đã thêm vào giỏ.</span>
                        <Button component={Link} to="/cart">
                            Xem giỏ hàng
                        </Button>
                    </Stack>
                </Alert>
            )}
        </Stack>
    );
}
