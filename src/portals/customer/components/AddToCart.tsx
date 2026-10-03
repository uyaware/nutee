import { useState } from "react";
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
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { services } from "../../../services";
import { ErrorState } from "../../../shared/components/Feedback";
import { MAX_CART_QUANTITY } from "../../../shared/types/cart";

export function AddToCart({
  productId,
  stock,
}: {
  productId: string;
  stock: number;
}) {
  const [quantity, setQuantity] = useState("1");
  const client = useQueryClient();
  const add = useMutation({
    mutationFn: () => services.cart.add(productId, Number(quantity)),
    onSuccess: () => client.invalidateQueries({ queryKey: ["customer"] }),
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
            disabled={!valid || Number(quantity) <= 1 || add.isPending}
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
                  stock && !valid ? "product-quantity-error" : undefined,
              },
            }}
            sx={{
              width: 64,
              "& input": {
                textAlign: "center",
                px: 0.5,
                MozAppearance: "textfield",
              },
              "& input::-webkit-inner-spin-button, & input::-webkit-outer-spin-button":
                { WebkitAppearance: "none", margin: 0 },
            }}
          />
          <IconButton
            aria-label="Tăng số lượng"
            disabled={
              !valid ||
              Number(quantity) >= Math.min(stock, MAX_CART_QUANTITY) ||
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
          disabled={!stock || !valid || add.isPending}
          onClick={() => add.mutate()}
          sx={{ flex: 1, minHeight: 44 }}
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
