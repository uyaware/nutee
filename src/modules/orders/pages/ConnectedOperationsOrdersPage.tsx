import { Button, Chip, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { services } from "@/app/services";
import { useSession } from "@/modules/auth/hooks/useSession";
import { useAdminFilters } from "@/modules/management/hooks/useAdminFilters";
import { paymentLabels } from "@/modules/orders/model/api";
import { PageHeading } from "@/shared/components/PageHeading";
import { ErrorState, LoadingState } from "@/shared/components/Feedback";
import { dateTime, money } from "@/shared/lib/format";

const statuses: Record<string, string> = { all: "Tất cả trạng thái", pending: "Chờ xác nhận", confirmed: "Đã xác nhận", packing: "Đóng gói", shipping: "Đang giao", delivered: "Đã giao", cancelled: "Đã hủy" };

export default function ConnectedOperationsOrdersPage({ compact = false }: { compact?: boolean }) {
    const session = useSession("backoffice");
    const { params, q, search, update, reset } = useAdminFilters();
    const status = Object.hasOwn(statuses, params.get("status") ?? "") ? params.get("status")! : "all";
    const payment = Object.hasOwn(paymentLabels, params.get("payment") ?? "") ? params.get("payment")! : "all";
    const sort = params.get("sort") === "oldest" ? "oldest" : "newest";
    const rawPage = Number(params.get("page"));
    const page = compact ? 0 : Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 0;
    const query = useQuery({
        queryKey: ["management", session.data?.id, "orders", { page, status, payment, sort, search }],
        queryFn: () => services.orders.managementList(page, status, payment, sort, search), enabled: !!session.data, retry: false,
    });
    return <Stack spacing={3}>
        <PageHeading title={compact ? "Đơn hàng gần đây" : "Quản lý đơn hàng"} description={compact ? "Các đơn hàng mới nhất." : "Tra cứu đơn hàng và theo dõi trạng thái xử lý."} />
        {!compact && <Stack direction={{ xs: "column", md: "row" }} gap={2}>
            <TextField label="Tìm đơn hàng" placeholder="Mã đơn, tên hoặc số điện thoại" value={q} onChange={(event) => update("q", event.target.value)} />
            <TextField select label="Trạng thái đơn" value={status} onChange={(event) => update("status", event.target.value)}>{Object.entries(statuses).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField>
            <TextField select label="Thanh toán" value={payment} onChange={(event) => update("payment", event.target.value)}><MenuItem value="all">Tất cả</MenuItem>{Object.entries(paymentLabels).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField>
            <TextField select label="Sắp xếp" value={sort} onChange={(event) => update("sort", event.target.value)}><MenuItem value="newest">Mới nhất</MenuItem><MenuItem value="oldest">Cũ nhất</MenuItem></TextField>
        </Stack>}
        {query.isPending ? <LoadingState /> : query.isError ? <ErrorState error={query.error} retry={() => void query.refetch()} /> : <Paper variant="outlined">
            <TableContainer><Table sx={{ minWidth: 820 }} aria-label="Bảng đơn hàng vận hành"><TableHead><TableRow>{["Mã đơn / thời gian", "Người nhận", "Trạng thái", "Thanh toán", "Tổng tiền", "Thao tác"].map((label) => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead>
                <TableBody>{query.data.content.map((order) => <TableRow key={order.id} hover>
                    <TableCell>{order.code}<br />{dateTime(order.createdAt)}</TableCell><TableCell>{order.recipient || "Chưa cập nhật"}<br />{order.phone || "—"}</TableCell>
                    <TableCell><Chip size="small" label={statuses[order.status] ?? order.status} /></TableCell>
                    <TableCell>{order.paymentMethod?.toUpperCase() ?? "—"}<br />{paymentLabels[order.paymentStatus] ?? order.paymentStatus}</TableCell><TableCell>{money(order.total)}</TableCell>
                    <TableCell><Button component={Link} to={`/management/orders/${order.id}`}>Xem chi tiết</Button></TableCell>
                </TableRow>)}{!query.data.content.length && <TableRow><TableCell colSpan={6} align="center">Không có đơn phù hợp. {!compact && <Button onClick={reset}>Xóa bộ lọc</Button>}</TableCell></TableRow>}</TableBody>
            </Table></TableContainer>
            {!compact && <TablePagination component="div" count={query.data.totalElements} page={page} rowsPerPage={query.data.size} rowsPerPageOptions={[query.data.size]} onPageChange={(_, value) => update("page", String(value))} />}
        </Paper>}
        {compact && <Button component={Link} to="/management/orders" sx={{ alignSelf: "flex-start" }}>Xem tất cả đơn hàng</Button>}
    </Stack>;
}
