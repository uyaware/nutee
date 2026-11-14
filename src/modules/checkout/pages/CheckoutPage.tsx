import { useEffect, useRef, useState } from "react";
import { trackEvent } from "@/shared/analytics/posthog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    createOrderSchema,
    type CreateOrder,
    type CustomerOrder,
} from "@/modules/orders/model/api";
import { errorMessage, ServiceError } from "@/shared/lib/errors";
import { money } from "@/shared/lib/format";
import { services } from "@/app/services";
import { VoucherPicker } from "@/modules/checkout/components/VoucherPicker";
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
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { checkoutItems } from "@/modules/checkout/fixtures/checkout";
import {
    CheckoutSummary,
    type CheckoutProduct,
} from "@/modules/checkout/components/CheckoutSummary";
import { useCart } from "@/modules/cart/hooks/useCart";
import { useProfile } from "@/modules/account/hooks/useProfile";
import { ErrorState, LoadingState } from "@/shared/components/Feedback";
import { tokens } from "@/shared/theme/tokens";
import { PaymentPanel } from "@/modules/checkout/pages/PaymentPage";

export default function CheckoutPage() {
    const trackedCheckout = useRef(false);
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [params, setParams] = useSearchParams();
    const [submitted, setSubmitted] = useState<CreateOrder | null>(null);
    const [validation, setValidation] = useState("");
    const [createdOrder, setCreatedOrder] = useState<CustomerOrder | null>(null);
    const profile = useProfile();
    const config = useQuery({
        queryKey: ["checkout-config"],
        queryFn: services.orders.config,
        retry: false,
    });
    const placeOrder = useMutation({
        mutationFn: services.orders.create,
        onError: (error) => {
            if (
                error instanceof ServiceError &&
                ["VALIDATION", "CONFLICT", "NOT_FOUND"].includes(error.code)
            ) {
                setSubmitted(null);
                setStep(0);
                void queryClient.invalidateQueries({ queryKey: ["customer"] });
                void config.refetch();
            }
        },
        onSuccess: (order) => {
            if (order.paymentMethod === "qr" && order.paymentStatus !== "paid") {
                if (order.payment) {
                    queryClient.setQueryData(
                        ["customer", profile.data?.user.id, "payments", order.id],
                        order.payment,
                    );
                }
                setCreatedOrder(order);
                setParams({ order: String(order.id) }, { replace: true });
            } else {
                navigate(`/orders/${order.id}/success`, { replace: true });
            }
            void queryClient.invalidateQueries({ queryKey: ["customer"] });
        },
    });
    const cart = useCart();
    const [step, setStep] = useState(0);
    const [selection, setSelection] = useState<{
        ownerId: string;
        id: string;
    } | null>(null);
    const savedAddresses = profile.data?.addresses ?? [];
    const selectedAddress =
        savedAddresses.find(
            (item) =>
                selection?.ownerId === profile.data?.user.id &&
                item.id === selection?.id,
        ) ??
        savedAddresses.find((item) => item.isDefault) ??
        savedAddresses[0];
    const addressId = selectedAddress?.id ?? "";
    const address = {
        recipient: profile.data?.user.name ?? "",
        phone: profile.data?.user.phone ?? "",
        line: selectedAddress?.line ?? "",
    };
    const [method, setMethod] = useState("cod");
    const [note, setNote] = useState("");
    const [voucherCode, setVoucherCode] = useState("");
    const fromCart = params.has("items");
    const variantIds = (params.get("items") ?? "")
        .split(",")
        .filter(Boolean)
        .map(Number);
    const quoteQuery = useQuery({
        queryKey: [
            "customer",
            profile.data?.user.id,
            "checkout-quote",
            variantIds,
            voucherCode,
            cart.dataUpdatedAt,
        ],
        queryFn: () => services.checkout.quote(variantIds, voucherCode),
        enabled:
            fromCart &&
            !submitted &&
            !!profile.data &&
            !!variantIds.length &&
            !cart.isPending &&
            !cart.isError,
        retry: false,
        refetchInterval: 30000,
    });
    const orderRequest = () =>
        createOrderSchema.safeParse({
            idempotencyKey: submitted?.idempotencyKey ?? crypto.randomUUID(),
            variantIds,
            voucherCode,
            expectedTotal:
                (quoteQuery.data?.total ?? 0) + (config.data?.shippingFee ?? 0),
            addressId: Number(addressId),
            note,
            paymentMethod: method,
        });
    const paymentOrderId = createdOrder?.id ?? Number(params.get("order"));
    useEffect(() => {
        if (trackedCheckout.current || submitted || paymentOrderId > 0 || !fromCart ||
            !profile.isSuccess || !profile.data || !config.isSuccess || !cart.isSuccess || cart.isError ||
            !quoteQuery.isSuccess || quoteQuery.isFetching || !quoteQuery.data.items.length ||
            quoteQuery.data.items.some((item) => item.status !== "available" || item.price === null)) return;
        trackedCheckout.current = true;
        trackEvent("checkout_started", {
            quantity: quoteQuery.data.items.reduce((total, item) => total + item.quantity, 0),
            total_amount: quoteQuery.data.total + config.data.shippingFee,
            currency: "VND",
        });
    }, [submitted, paymentOrderId, fromCart, profile.isSuccess, profile.data, config.isSuccess, config.data,
        cart.isSuccess, cart.isError, quoteQuery.isSuccess, quoteQuery.isFetching, quoteQuery.data]);
    if (Number.isSafeInteger(paymentOrderId) && paymentOrderId > 0) {
        return <PaymentPanel id={paymentOrderId} initialError={createdOrder?.paymentError} />;
    }
    if (profile.isPending) return <LoadingState />;
    if (profile.isError)
        return (
            <ErrorState
                error={profile.error}
                retry={() => void profile.refetch()}
            />
        );
    if (fromCart && cart.isPending && !submitted) return <LoadingState />;
    if (fromCart && cart.isError && !submitted)
        return (
            <ErrorState error={cart.error} retry={() => void cart.refetch()} />
        );
    const selectedIds = new Set((params.get("items") ?? "").split(","));
    const items: CheckoutProduct[] = fromCart
        ? (quoteQuery.data?.items ?? cart.data?.items ?? []).flatMap((item) =>
              selectedIds.has(item.variantId) &&
              item.status === "available" &&
              item.price !== null
                  ? [{ ...item, id: item.variantId, price: item.price }]
                  : [],
          )
        : checkoutItems;
    if (!items.length && !submitted)
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
            {config.isError && (
                <ErrorState
                    error={config.error}
                    retry={() => void config.refetch()}
                />
            )}
            {validation && <Alert severity="warning">{validation}</Alert>}
            {placeOrder.isError && (
                <Alert severity="error">
                    {errorMessage(placeOrder.error)}{" "}
                    {submitted
                        ? "Nội dung yêu cầu được giữ để bạn có thể thử lại an toàn."
                        : "Kiểm tra thông tin và xác nhận lại đơn hàng."}{" "}
                    <Link to="/account/orders">Xem lịch sử đơn hàng</Link>
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
                                if (submitted) {
                                    placeOrder.mutate(submitted);
                                    return;
                                }
                                const parsed = orderRequest();
                                if (!parsed.success) {
                                    setValidation(
                                        parsed.error.issues[0]?.message ??
                                            "Kiểm tra thông tin giao hàng.",
                                    );
                                    return;
                                }
                                setValidation("");
                                if (step === 0) setStep(1);
                                else {
                                    setSubmitted(parsed.data);
                                    placeOrder.mutate(parsed.data);
                                }
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
                                                setSelection({
                                                    ownerId:
                                                        profile.data.user.id,
                                                    id: event.target.value,
                                                });
                                            }}
                                        >
                                            {savedAddresses.map((item) => (
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
                                                                            item.recipient
                                                                        }
                                                                    </Typography>
                                                                    {item.isDefault && (
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
                                    <Button
                                        component={Link}
                                        to="/account/addresses"
                                        sx={{ alignSelf: "flex-start" }}
                                    >
                                        {savedAddresses.length
                                            ? "Quản lý sổ địa chỉ"
                                            : "Thêm địa chỉ vào sổ địa chỉ"}
                                    </Button>
                                    <Divider />
                                    <Typography>
                                        {address.recipient} · {address.phone}
                                    </Typography>
                                    <Typography color="text.secondary">
                                        {address.line}
                                    </Typography>
                                    {!profile.data.user.profileCompleted && (
                                        <Alert severity="warning">
                                            Cập nhật họ tên và số điện thoại
                                            trong{" "}
                                            <Link to="/account/profile">
                                                hồ sơ
                                            </Link>{" "}
                                            trước khi đặt hàng.
                                        </Alert>
                                    )}
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
                                        Phí giao hàng:{" "}
                                        {config.data
                                            ? money(config.data.shippingFee)
                                            : "Đang tải…"}
                                        . Thời gian giao sẽ được xác nhận khi xử
                                        lý đơn.
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
                                                            disabled={
                                                                value ===
                                                                    "qr" &&
                                                                !config.data
                                                                    ?.payosEnabled
                                                            }
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
                                    {!config.data?.payosEnabled && (
                                        <Alert severity="info">
                                            Thanh toán payOS hiện chưa khả dụng.
                                            Bạn có thể chọn COD.
                                        </Alert>
                                    )}
                                    <Paper
                                        variant="outlined"
                                        sx={{
                                            p: 2,
                                            bgcolor: "background.default",
                                        }}
                                    >
                                        <VoucherPicker
                                            ownerId={profile.data.user.id}
                                            selected={voucherCode}
                                            pending={quoteQuery.isFetching}
                                            onApply={(code) => {
                                                if (code === voucherCode)
                                                    void quoteQuery.refetch();
                                                else {
                                                    setStep(0);
                                                    setVoucherCode(code);
                                                }
                                            }}
                                        />
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
                                            disabled={!!submitted}
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
                                            disabled={!!submitted}
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
                                        disabled={!!submitted}
                                    >
                                        Quay lại
                                    </Button>
                                )}
                                <Button
                                    type="submit"
                                    disabled={
                                        placeOrder.isPending ||
                                        (!submitted &&
                                            (!config.isSuccess ||
                                                !selectedAddress ||
                                                !profile.data.user
                                                    .profileCompleted ||
                                                !quoteQuery.isSuccess ||
                                                quoteQuery.isFetching))
                                    }
                                    variant="contained"
                                    size="large"
                                    sx={{ ml: { sm: "auto" } }}
                                >
                                    {step === 0
                                        ? "Kiểm tra đơn hàng"
                                        : placeOrder.isPending
                                          ? "Đang đặt hàng…"
                                          : submitted
                                            ? "Thử lại đặt hàng"
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
                    {quoteQuery.isPending || quoteQuery.isFetching ? (
                        <LoadingState />
                    ) : quoteQuery.isError ? (
                        <ErrorState
                            error={quoteQuery.error}
                            retry={() => void quoteQuery.refetch()}
                        />
                    ) : (
                        <CheckoutSummary
                            items={items}
                            quote={{
                                ...quoteQuery.data,
                                shipping: config.data?.shippingFee ?? 0,
                                shippingConfirmed: !!config.data,
                                total:
                                    quoteQuery.data.total +
                                    (config.data?.shippingFee ?? 0),
                            }}
                        />
                    )}
                </Box>
            </Box>
        </Stack>
    );
}
