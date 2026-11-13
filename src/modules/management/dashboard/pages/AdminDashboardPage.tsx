import { useAdminFilters } from "@/modules/management/hooks/useAdminFilters";
import {
    Box,
    Button,
    Chip,
    MenuItem,
    Paper,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { Link } from "react-router-dom";
import { useDashboard } from "@/modules/management/dashboard/hooks/useDashboard";
import { ErrorState, LoadingState } from "@/shared/components/Feedback";
import { money } from "@/shared/lib/format";
import { useSession } from "@/modules/auth/hooks/useSession";
import { StatusBadge } from "@/shared/components/StatusBadge";
import {
    AdminPageHeader,
    AdminSection,
} from "@/modules/management/components/AdminUI";
import { tokens } from "@/shared/theme/tokens";
import { alpha } from "@mui/material/styles";

export default function AdminDashboardPage() {
    const session = useSession("backoffice");
    const { params, update } = useAdminFilters();
    const days = params.get("period") === "7" ? 7 : 30;
    const query = useDashboard(days);
    if (query.isPending) return <LoadingState />;
    if (query.isError)
        return (
            <ErrorState
                error={query.error}
                retry={() => void query.refetch()}
            />
        );
    const data = query.data;
    const paidRevenue = data.paidValue;
    const metrics = [
        {
            label: "Giá trị đơn đã thanh toán",
            value: money(paidRevenue),
            note: "Không gồm đơn đã hủy",
        },
        {
            label: "Đơn hàng trong kỳ",
            value: data.orderCount,
            note: `Theo ngày tạo đơn · ${days} ngày`,
        },
        {
            label: "Chờ xác nhận trong kỳ",
            value: data.pendingCount,
            note: "Cần tiếp nhận và xác nhận",
        },
        {
            label: "Yêu cầu cần xử lý",
            value: data.afterSaleCount,
            note: "Tất cả yêu cầu chờ / đang kiểm tra",
        },
    ];
    const bucketDays = days === 7 ? 1 : 5;
    const buckets = data.buckets;
    const maximum = Math.max(1, ...buckets.map((b) => b.value));
    const statuses = [
        "pending",
        "confirmed",
        "packing",
        "shipping",
        "delivered",
        "cancelled",
    ] as const;
    const lowStock = data.lowStock;
    const recent = data.recentOrders;
    return (
        <Stack spacing={3}>
            <AdminPageHeader
                title={`Chào ${session.data?.name}.`}
                description="Tổng quan kinh doanh và các công việc cần chú ý."
                action={
                    <TextField
                        select
                        label="Khoảng thời gian"
                        value={String(days)}
                        onChange={(e) => update("period", e.target.value)}
                        sx={{ minWidth: 210 }}
                    >
                        <MenuItem value="7">7 ngày gần nhất</MenuItem>
                        <MenuItem value="30">30 ngày gần nhất</MenuItem>
                    </TextField>
                }
            />
            <Typography variant="body2" color="text.secondary">
                Số liệu đến ngày{" "}
                {new Date(data.asOf).toLocaleDateString("vi-VN", {
                    timeZone: data.timezone,
                })}
                . Chỉ số đơn hàng theo ngày tạo đơn; yêu cầu và danh mục hiển
                thị tất cả dữ liệu.
            </Typography>
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
                {metrics.map((m, i) => (
                    <Paper
                        key={m.label}
                        variant="outlined"
                        sx={{
                            p: { xs: 2, xl: 3 },
                            minWidth: 0,
                            display: "flex",
                            flexDirection: "column",
                            ...(i === 0
                                ? {
                                      backgroundImage: `linear-gradient(135deg, ${tokens.color.blue}, ${tokens.color.deepBlue})`,
                                      color: "common.white",
                                      borderColor: "primary.main",
                                      boxShadow: `0 12px 28px ${alpha(tokens.color.blue, 0.18)}`,
                                  }
                                : {}),
                        }}
                    >
                        <Typography
                            variant="body2"
                            sx={{ minHeight: "3.2em" }}
                            color={
                                i === 0
                                    ? alpha(tokens.color.surface, 0.85)
                                    : "text.secondary"
                            }
                        >
                            {m.label}
                        </Typography>
                        <Typography
                            component="p"
                            sx={{
                                fontSize: "clamp(1.25rem, 2vw, 2rem)",
                                fontWeight: 700,
                                color:
                                    i === 0 ? "common.white" : "text.primary",
                                my: 1.5,
                                fontVariantNumeric: "tabular-nums",
                                overflowWrap: "anywhere",
                            }}
                        >
                            {m.value}
                        </Typography>
                        <Typography
                            variant="caption"
                            sx={{ mt: "auto" }}
                            color={
                                i === 0
                                    ? alpha(tokens.color.surface, 0.85)
                                    : "text.secondary"
                            }
                        >
                            {m.note}
                        </Typography>
                    </Paper>
                ))}
            </Box>
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: {
                        xs: "1fr",
                        xl: "minmax(0, 2fr) minmax(0, 1fr)",
                    },
                    gap: 3,
                }}
            >
                <AdminSection
                    title="Giá trị đơn đã thanh toán theo ngày"
                    description="Gộp theo ngày tạo đơn, loại trừ đơn hủy. Số tiền hiển thị bằng VND."
                >
                    <Stack
                        component="figure"
                        sx={{ m: 0 }}
                        spacing={2}
                        aria-label={`Tổng giá trị ${money(paidRevenue)} trong ${days} ngày`}
                    >
                        {buckets.map((b) => (
                            <Box
                                key={b.label}
                                sx={{
                                    display: "grid",
                                    gridTemplateColumns: {
                                        xs: "1fr",
                                        sm: "110px minmax(0, 1fr) 120px",
                                    },
                                    gap: 1,
                                    alignItems: "center",
                                }}
                            >
                                <Typography variant="body2">
                                    {b.label}
                                </Typography>
                                <Box
                                    aria-hidden="true"
                                    sx={{
                                        height: 20,
                                        bgcolor: "action.hover",
                                        borderRadius: 1,
                                        overflow: "hidden",
                                    }}
                                >
                                    <Box
                                        sx={{
                                            height: "100%",
                                            width: `${(b.value / maximum) * 100}%`,
                                            bgcolor: "primary.main",
                                            borderRadius: 1,
                                        }}
                                    />
                                </Box>
                                <Typography
                                    variant="body2"
                                    fontWeight={600}
                                    sx={{
                                        textAlign: { sm: "right" },
                                        fontVariantNumeric: "tabular-nums",
                                    }}
                                >
                                    {money(b.value)}
                                </Typography>
                            </Box>
                        ))}
                        <Typography
                            component="figcaption"
                            variant="caption"
                            color="text.secondary"
                        >
                            Mỗi hàng tổng hợp{" "}
                            {bucketDays === 1 ? "một ngày" : "5 ngày"}.
                        </Typography>
                    </Stack>
                    <Button
                        component={Link}
                        to="/management/orders?payment=paid"
                        sx={{ alignSelf: "flex-start" }}
                    >
                        Xem đơn đã thanh toán
                    </Button>
                </AdminSection>
                <AdminSection title="Trạng thái đơn trong kỳ">
                    {statuses.map((status) => (
                        <Stack
                            key={status}
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            gap={2}
                        >
                            <StatusBadge status={status} />
                            <Button
                                component={Link}
                                to={`/management/orders?status=${status}`}
                                aria-label={`Xem đơn ${status}`}
                                sx={{ fontVariantNumeric: "tabular-nums" }}
                            >
                                {data.statuses[status] ?? 0} đơn
                            </Button>
                        </Stack>
                    ))}
                    <Button
                        component={Link}
                        to="/management/after-sales?status=pending"
                        variant="outlined"
                    >
                        Tiếp nhận yêu cầu
                    </Button>
                </AdminSection>
            </Box>
            <AdminSection title="Quản lý nhanh">
                <Stack direction="row" gap={1} flexWrap="wrap">
                    <Chip
                        variant="outlined"
                        label={`${data.publishedProducts} sản phẩm công khai`}
                    />
                    <Chip
                        variant="outlined"
                        label={`${data.activePromotions} mã đang áp dụng`}
                    />
                    <Chip
                        variant="outlined"
                        label={`${data.activeUsers} tài khoản hoạt động`}
                    />
                </Stack>
                <Stack direction="row" gap={1.5} flexWrap="wrap">
                    {[
                        { to: "products/new", label: "Thêm sản phẩm" },
                        { to: "brands", label: "Thương hiệu" },
                        { to: "categories", label: "Danh mục" },
                        { to: "promotions", label: "Khuyến mãi" },
                        { to: "users", label: "Tài khoản" },
                    ].map((link) => (
                        <Button
                            key={link.to}
                            component={Link}
                            to={`/management/${link.to}`}
                            variant="outlined"
                        >
                            {link.label}
                        </Button>
                    ))}
                </Stack>
            </AdminSection>
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: {
                        xs: "1fr",
                        xl: "minmax(0, 2fr) minmax(0, 1fr)",
                    },
                    gap: 3,
                    alignItems: "start",
                }}
            >
                <AdminSection title="Đơn gần đây trong kỳ">
                    {recent.length ? (
                        recent.map((order) => (
                            <Stack
                                key={order.id}
                                direction={{ xs: "column", sm: "row" }}
                                justifyContent="space-between"
                                gap={1}
                                alignItems={{ sm: "center" }}
                            >
                                <Box>
                                    <Typography fontWeight={600}>
                                        {order.recipient}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                    >
                                        {order.code} · {money(order.total)}
                                    </Typography>
                                </Box>
                                <StatusBadge status={order.status} />
                                <Button
                                    component={Link}
                                    to={`/management/orders/${order.id}`}
                                >
                                    Xem đơn
                                </Button>
                            </Stack>
                        ))
                    ) : (
                        <Typography color="text.secondary">
                            Chưa có đơn trong khoảng thời gian này.
                        </Typography>
                    )}
                    <Button
                        component={Link}
                        to="/management/orders"
                        sx={{ alignSelf: "flex-start" }}
                    >
                        Tất cả đơn hàng
                    </Button>
                </AdminSection>
                <AdminSection
                    title="Sản phẩm tồn thấp"
                    description="Sản phẩm công khai còn tối đa 10 chiếc."
                >
                    {lowStock.length ? (
                        lowStock.slice(0, 5).map((p) => (
                            <Stack
                                key={p.id}
                                direction="row"
                                alignItems="center"
                                justifyContent="space-between"
                                gap={1}
                            >
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography fontWeight={600}>
                                        {p.name}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        color={
                                            p.stock
                                                ? "text.secondary"
                                                : "warning.main"
                                        }
                                    >
                                        {p.stock
                                            ? `Còn ${p.stock} chiếc`
                                            : "Hết hàng"}
                                    </Typography>
                                </Box>
                                <Button
                                    component={Link}
                                    to={`/management/products/${p.id}/edit`}
                                >
                                    Sửa
                                </Button>
                            </Stack>
                        ))
                    ) : (
                        <Typography color="text.secondary">
                            Chưa có sản phẩm tồn thấp.
                        </Typography>
                    )}
                </AdminSection>
            </Box>
        </Stack>
    );
}
