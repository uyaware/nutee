import { useState } from "react";
import {
    Alert,
    Box,
    Button,
    Chip,
    Divider,
    FormControl,
    FormControlLabel,
    FormLabel,
    Paper,
    Radio,
    RadioGroup,
    Stack,
    Step,
    StepLabel,
    Stepper,
    TextField,
    Typography,
} from "@mui/material";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import LocalShippingOutlined from "@mui/icons-material/LocalShippingOutlined";
import PaymentsOutlined from "@mui/icons-material/PaymentsOutlined";
import QrCodeRounded from "@mui/icons-material/QrCodeRounded";
import { Link, useSearchParams } from "react-router-dom";
import {
    checkoutAddresses,
    checkoutItems,
    checkoutQuote,
} from "@/modules/checkout/fixtures/checkout";
import {
    CheckoutSummary,
    type CheckoutProduct,
} from "@/modules/checkout/components/CheckoutSummary";
import { useCart } from "@/modules/cart/hooks/useCart";
import { ErrorState, LoadingState } from "@/shared/components/Feedback";
import { tokens } from "@/shared/theme/tokens";

export default function CheckoutPage() {
    const [params] = useSearchParams();
    const cart = useCart();
    const [step, setStep] = useState(0);
    const [addressId, setAddressId] = useState("home");
    const [address, setAddress] = useState(
        checkoutAddresses[0] ?? {
            id: "draft",
            label: "",
            recipient: "",
            phone: "",
            line: "",
        },
    );
    const [method, setMethod] = useState("cod");
    const [note, setNote] = useState("");
    const [promotionOpen, setPromotionOpen] = useState(false);
    const fromCart = params.has("items");
    if (fromCart && cart.isPending) return <LoadingState />;
    if (fromCart && cart.isError)
        return (
            <ErrorState error={cart.error} retry={() => void cart.refetch()} />
        );
    const selectedIds = new Set((params.get("items") ?? "").split(","));
    const items: CheckoutProduct[] = fromCart
        ? (cart.data?.items ?? []).flatMap((item) =>
              selectedIds.has(item.variantId) &&
              item.status === "available" &&
              item.price !== null
                  ? [{ ...item, id: item.variantId, price: item.price }]
                  : [],
          )
        : checkoutItems;
    const subtotal = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
    );
    const discount = fromCart
        ? subtotal >= 1000000
            ? checkoutQuote.discount
            : 0
        : checkoutQuote.discount;
    const shipping = items.length ? checkoutQuote.shipping : 0;
    const quote = {
        subtotal,
        discount,
        shipping,
        total: subtotal - discount + shipping,
    };
    if (!items.length)
        return (
            <Stack spacing={2}>
                <Alert severity="info">
                    Chưa có sản phẩm được chọn để thanh toán. Quay lại giỏ hàng
                    và chọn sản phẩm bạn muốn mua.
                </Alert>
                <Button
                    component={Link}
                    to="/cart"
                    variant="contained"
                    sx={{ alignSelf: "flex-start" }}
                >
                    Quay lại giỏ hàng
                </Button>
            </Stack>
        );
    return (
        <Stack spacing={3} sx={{ maxWidth: 1200, mx: "auto" }}>
            <Button
                component={Link}
                to="/cart"
                startIcon={<ArrowBackRounded />}
                sx={{ alignSelf: "flex-start" }}
            >
                Quay lại giỏ hàng
            </Button>
            <Box>
                <Typography variant="h1">Thanh toán</Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                    Chỉ vài bước nữa, công nghệ mới sẽ đến với bạn.
                </Typography>
            </Box>
            {fromCart && (
                <Alert severity="info">
                    Đặt hàng trực tuyến hiện chưa khả dụng. Giỏ hàng của bạn vẫn
                    được giữ nguyên.
                </Alert>
            )}
            <Stepper activeStep={step} alternativeLabel sx={{ py: 1 }}>
                {["Giao hàng & thanh toán", "Xác nhận đơn hàng"].map(
                    (label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ),
                )}
            </Stepper>
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: {
                        xs: "minmax(0, 1fr)",
                        md: "minmax(0, 1fr) 360px",
                    },
                    gap: 3,
                    alignItems: "start",
                }}
            >
                <Stack spacing={3}>
                    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
                        <Stack
                            component="form"
                            spacing={3}
                            onSubmit={(event) => {
                                event.preventDefault();
                                if (step === 0) setStep(1);
                            }}
                        >
                            {step === 0 && (
                                <>
                                    <Stack
                                        direction="row"
                                        spacing={1}
                                        alignItems="center"
                                    >
                                        <LocalShippingOutlined color="primary" />
                                        <Typography variant="h2">
                                            Thông tin giao hàng
                                        </Typography>
                                    </Stack>
                                    <FormControl>
                                        <FormLabel id="delivery-address-label">
                                            Địa chỉ nhận hàng
                                        </FormLabel>
                                        <RadioGroup
                                            aria-labelledby="delivery-address-label"
                                            value={addressId}
                                            onChange={(event) => {
                                                const selected =
                                                    checkoutAddresses.find(
                                                        (item) =>
                                                            item.id ===
                                                            event.target.value,
                                                    );
                                                setAddressId(
                                                    event.target.value,
                                                );
                                                if (selected)
                                                    setAddress(selected);
                                            }}
                                        >
                                            {checkoutAddresses.map((item) => (
                                                <Paper
                                                    key={item.id}
                                                    variant="outlined"
                                                    sx={{
                                                        mt: 1.5,
                                                        p: 1.5,
                                                        borderColor:
                                                            addressId ===
                                                            item.id
                                                                ? "primary.main"
                                                                : "divider",
                                                    }}
                                                >
                                                    <FormControlLabel
                                                        value={item.id}
                                                        control={<Radio />}
                                                        sx={{
                                                            m: 0,
                                                            alignItems:
                                                                "flex-start",
                                                            width: "100%",
                                                        }}
                                                        label={
                                                            <Box sx={{ pt: 1 }}>
                                                                <Stack
                                                                    direction="row"
                                                                    gap={1}
                                                                    alignItems="center"
                                                                >
                                                                    <Typography
                                                                        fontWeight={
                                                                            600
                                                                        }
                                                                    >
                                                                        {
                                                                            item.label
                                                                        }
                                                                    </Typography>
                                                                    {item.id ===
                                                                        "home" && (
                                                                        <Chip
                                                                            size="small"
                                                                            label="Mặc định"
                                                                            variant="outlined"
                                                                            color="primary"
                                                                        />
                                                                    )}
                                                                </Stack>
                                                                <Typography variant="body2">
                                                                    {
                                                                        item.recipient
                                                                    }{" "}
                                                                    ·{" "}
                                                                    {item.phone}
                                                                </Typography>
                                                                <Typography
                                                                    variant="body2"
                                                                    color="text.secondary"
                                                                >
                                                                    {item.line}
                                                                </Typography>
                                                            </Box>
                                                        }
                                                    />
                                                </Paper>
                                            ))}
                                        </RadioGroup>
                                    </FormControl>
                                    <Divider />
                                    <Box
                                        sx={{
                                            display: "grid",
                                            gridTemplateColumns: {
                                                xs: "1fr",
                                                sm: "1fr 1fr",
                                            },
                                            gap: 2,
                                        }}
                                    >
                                        <TextField
                                            label="Họ tên người nhận"
                                            value={address.recipient}
                                            onChange={(event) =>
                                                setAddress({
                                                    ...address,
                                                    recipient:
                                                        event.target.value,
                                                })
                                            }
                                            autoComplete="shipping name"
                                        />
                                        <TextField
                                            label="Số điện thoại"
                                            value={address.phone}
                                            onChange={(event) =>
                                                setAddress({
                                                    ...address,
                                                    phone: event.target.value,
                                                })
                                            }
                                            autoComplete="shipping tel"
                                            type="tel"
                                        />
                                    </Box>
                                    <TextField
                                        label="Địa chỉ giao hàng"
                                        value={address.line}
                                        onChange={(event) =>
                                            setAddress({
                                                ...address,
                                                line: event.target.value,
                                            })
                                        }
                                        autoComplete="shipping street-address"
                                        multiline
                                        minRows={3}
                                        maxRows={6}
                                        slotProps={{
                                            inputLabel: { shrink: true },
                                        }}
                                    />
                                    <TextField
                                        label="Ghi chú giao hàng (không bắt buộc)"
                                        value={note}
                                        onChange={(event) =>
                                            setNote(event.target.value)
                                        }
                                        multiline
                                        minRows={2}
                                        placeholder="Ví dụ: Gọi trước khi giao hàng"
                                        slotProps={{
                                            inputLabel: { shrink: true },
                                        }}
                                    />
                                    <Alert
                                        severity="info"
                                        icon={<LocalShippingOutlined />}
                                    >
                                        Phí và thời gian giao hàng chưa được xác
                                        nhận.
                                    </Alert>
                                </>
                            )}
                            {step === 0 && (
                                <>
                                    <Divider />
                                    <Typography variant="h2">
                                        Phương thức thanh toán
                                    </Typography>
                                    <FormControl>
                                        <FormLabel id="payment-method-label">
                                            Chọn cách thanh toán
                                        </FormLabel>
                                        <RadioGroup
                                            aria-labelledby="payment-method-label"
                                            value={method}
                                            onChange={(event) =>
                                                setMethod(event.target.value)
                                            }
                                        >
                                            {[
                                                {
                                                    value: "cod",
                                                    title: "Thanh toán khi nhận hàng",
                                                    description:
                                                        "Thanh toán cho nhân viên giao hàng khi nhận sản phẩm.",
                                                    icon: PaymentsOutlined,
                                                },
                                                {
                                                    value: "qr",
                                                    title: "Chuyển khoản bằng mã QR",
                                                    description:
                                                        "Quét mã QR bằng ứng dụng ngân hàng để thanh toán.",
                                                    icon: QrCodeRounded,
                                                },
                                            ].map(
                                                ({
                                                    value,
                                                    title,
                                                    description,
                                                    icon: Icon,
                                                }) => (
                                                    <Paper
                                                        key={value}
                                                        variant="outlined"
                                                        sx={{
                                                            mt: 2,
                                                            p: 2,
                                                            borderColor:
                                                                method === value
                                                                    ? "primary.main"
                                                                    : "divider",
                                                        }}
                                                    >
                                                        <FormControlLabel
                                                            value={value}
                                                            control={<Radio />}
                                                            sx={{
                                                                m: 0,
                                                                alignItems:
                                                                    "flex-start",
                                                                width: "100%",
                                                            }}
                                                            label={
                                                                <Stack
                                                                    spacing={1}
                                                                    sx={{
                                                                        pt: 1,
                                                                    }}
                                                                >
                                                                    <Stack
                                                                        direction="row"
                                                                        spacing={
                                                                            1
                                                                        }
                                                                        alignItems="center"
                                                                    >
                                                                        <Icon color="primary" />
                                                                        <Typography
                                                                            fontWeight={
                                                                                600
                                                                            }
                                                                        >
                                                                            {
                                                                                title
                                                                            }
                                                                        </Typography>
                                                                    </Stack>
                                                                    <Typography
                                                                        color="text.secondary"
                                                                        variant="body2"
                                                                    >
                                                                        {
                                                                            description
                                                                        }
                                                                    </Typography>
                                                                </Stack>
                                                            }
                                                        />
                                                    </Paper>
                                                ),
                                            )}
                                        </RadioGroup>
                                    </FormControl>
                                    <Paper
                                        variant="outlined"
                                        sx={{
                                            p: 2,
                                            bgcolor: "background.default",
                                        }}
                                    >
                                        <Stack spacing={1.5}>
                                            <Typography fontWeight={600}>
                                                Ưu đãi dành cho đơn hàng
                                            </Typography>
                                            <Stack
                                                direction="row"
                                                spacing={1}
                                                alignItems="center"
                                            >
                                                <Chip
                                                    label="NUTEE100"
                                                    color="primary"
                                                    variant="outlined"
                                                />
                                                <Typography variant="body2">
                                                    {discount
                                                        ? "Đã áp dụng · Giảm 100.000 ₫"
                                                        : "Áp dụng cho đơn từ 1.000.000 ₫"}
                                                </Typography>
                                            </Stack>
                                            <Button
                                                onClick={() =>
                                                    setPromotionOpen(
                                                        !promotionOpen,
                                                    )
                                                }
                                                aria-expanded={promotionOpen}
                                                sx={{ alignSelf: "flex-start" }}
                                            >
                                                Xem điều kiện ưu đãi
                                            </Button>
                                            {promotionOpen && (
                                                <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                >
                                                    Giảm 100.000 ₫ cho đơn từ
                                                    1.000.000 ₫. Tổng tiền bên
                                                    cạnh đã bao gồm ưu đãi.
                                                </Typography>
                                            )}
                                        </Stack>
                                    </Paper>
                                </>
                            )}
                            {step === 1 && (
                                <>
                                    <Typography variant="h2">
                                        Kiểm tra đơn hàng
                                    </Typography>
                                    <Stack spacing={1}>
                                        <Typography variant="h3" component="h3">
                                            Người nhận
                                        </Typography>
                                        <Typography>
                                            {address.recipient} ·{" "}
                                            {address.phone}
                                        </Typography>
                                        <Typography color="text.secondary">
                                            {address.line}
                                        </Typography>
                                        {note && (
                                            <Typography variant="body2">
                                                Ghi chú: {note}
                                            </Typography>
                                        )}
                                        <Button
                                            onClick={() => setStep(0)}
                                            sx={{ alignSelf: "flex-start" }}
                                        >
                                            Sửa thông tin giao hàng
                                        </Button>
                                    </Stack>
                                    <Divider />
                                    <Stack spacing={1}>
                                        <Typography variant="h3" component="h3">
                                            Thanh toán
                                        </Typography>
                                        <Typography>
                                            {method === "cod"
                                                ? "Thanh toán khi nhận hàng (COD)"
                                                : "Chuyển khoản bằng mã QR"}
                                        </Typography>
                                        <Button
                                            onClick={() => setStep(0)}
                                            sx={{ alignSelf: "flex-start" }}
                                        >
                                            Đổi phương thức thanh toán
                                        </Button>
                                    </Stack>
                                </>
                            )}
                            <Stack
                                direction={{ xs: "column-reverse", sm: "row" }}
                                gap={1.5}
                                justifyContent="space-between"
                            >
                                {step > 0 && (
                                    <Button
                                        variant="outlined"
                                        onClick={() => setStep(step - 1)}
                                    >
                                        Quay lại
                                    </Button>
                                )}
                                <Button
                                    type="submit"
                                    disabled={step > 0}
                                    variant="contained"
                                    size="large"
                                    sx={{ ml: { sm: "auto" } }}
                                >
                                    {step === 0
                                        ? "Kiểm tra đơn hàng"
                                        : "Đặt hàng"}
                                </Button>
                            </Stack>
                        </Stack>
                    </Paper>
                </Stack>
                <Box
                    sx={{
                        position: { md: "sticky" },
                        top: tokens.layout.storefrontHeaderHeight + 16,
                    }}
                >
                    <CheckoutSummary items={items} quote={quote} />
                </Box>
            </Box>
        </Stack>
    );
}
