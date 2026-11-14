import {
    Button,
    MenuItem,
    Paper,
    Stack,
    Tab,
    Tabs,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import { Link, useSearchParams } from "react-router-dom";
import {
    afterSaleLabels,
    afterSaleTypes,
} from "@/modules/after-sales/model/types";
import type { Portal } from "@/shared/types/database";
import { dateTime } from "@/shared/lib/format";

import { useQuery } from "@tanstack/react-query";
import { services } from "@/app/services";
import { useSession } from "@/modules/auth/hooks/useSession";
import { ErrorState, LoadingState } from "@/shared/components/Feedback";
import { AfterSaleBadge } from "@/modules/after-sales/components/AfterSaleBadge";

export default function AfterSalesPage({ portal }: { portal: Portal }) {
    const customer = portal === "customer";
    const base = customer ? "/account/after-sales" : "/management/after-sales";
    const [params, setParams] = useSearchParams();
    const requested = params.get("status") ?? "all";
    const status = Object.hasOwn(afterSaleLabels, requested)
        ? requested
        : "all";
    const q = params.get("q") ?? "";
    const requestedType = params.get("type") ?? "all";
    const type = Object.hasOwn(afterSaleTypes, requestedType)
        ? requestedType
        : "all";
    const size = 5;
    const page = Math.max(0, Math.floor(Number(params.get("page")) || 0));
    const session = useSession(portal);
    const query = useQuery({
        queryKey: [
            portal,
            session.data?.id,
            "after-sales",
            { page, status, type, q },
        ],
        queryFn: () => services.afterSales.list(portal, page, status, type, q),
        enabled: !!session.data,
        retry: false,
    });
    const rows = query.data?.content ?? [];
    const update = (key: string, value: string) => {
        const next = new URLSearchParams(params);
        if (value && (key === "q" || value !== "all")) next.set(key, value);
        else next.delete(key);
        if (key !== "page") next.delete("page");
        setParams(next, { replace: true, preventScrollReset: true });
    };
    return (
        <Stack spacing={3}>
            <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                gap={2}
            >
                <Stack spacing={1}>
                    <Typography variant="h1">
                        {customer ? "Bảo hành & đổi trả" : "Quản lý yêu cầu"}
                    </Typography>
                    <Typography color="text.secondary">
                        {customer
                            ? "Gửi yêu cầu từ sản phẩm đã nhận và theo dõi tiến trình xử lý."
                            : "Tiếp nhận, kiểm tra và ghi kết quả xử lý các yêu cầu của khách hàng."}
                    </Typography>
                </Stack>
                {customer && (
                    <Button
                        component={Link}
                        to={`${base}/new`}
                        variant="contained"
                        sx={{ alignSelf: "flex-start" }}
                    >
                        Tạo yêu cầu
                    </Button>
                )}
            </Stack>
            <Paper variant="outlined" sx={{ minWidth: 0 }}>
                <Tabs
                    value={status}
                    onChange={(_, value: string) => update("status", value)}
                    variant="scrollable"
                    scrollButtons="auto"
                    aria-label="Trạng thái yêu cầu"
                >
                    <Tab value="all" label="Tất cả" />
                    {Object.entries(afterSaleLabels).map(([value, label]) => (
                        <Tab key={value} value={value} label={label} />
                    ))}
                </Tabs>
            </Paper>
            <Stack
                direction={{ xs: "column", sm: "row" }}
                gap={2}
                sx={{ minWidth: 0 }}
            >
                <TextField
                    type="search"
                    label="Tìm kiếm yêu cầu"
                    placeholder="Mã yêu cầu, đơn hoặc tên sản phẩm"
                    value={q}
                    onChange={(event) => update("q", event.target.value)}
                    sx={{ flex: "1 1 0", minWidth: 0 }}
                />
                <TextField
                    select
                    label="Loại yêu cầu"
                    value={type}
                    onChange={(event) => update("type", event.target.value)}
                    sx={{ width: { xs: "100%", sm: 220 }, flexShrink: 0 }}
                >
                    <MenuItem value="all">Tất cả yêu cầu</MenuItem>
                    {Object.entries(afterSaleTypes).map(([value, label]) => (
                        <MenuItem key={value} value={value}>
                            {label}
                        </MenuItem>
                    ))}
                </TextField>
            </Stack>
            {query.isPending && <LoadingState />}
            {query.isError && (
                <ErrorState
                    error={query.error}
                    retry={() => void query.refetch()}
                />
            )}
            <Paper variant="outlined" sx={{ minWidth: 0 }}>
                <TableContainer>
                    <Table
                        sx={{ minWidth: 740 }}
                        aria-label="Danh sách yêu cầu"
                    >
                        <TableHead>
                            <TableRow>
                                {[
                                    "Yêu cầu",
                                    "Sản phẩm / đơn hàng",
                                    "Loại",
                                    "Trạng thái",
                                    "Thao tác",
                                ].map((label) => (
                                    <TableCell key={label}>{label}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((request) => {
                                const item = request.item;
                                return (
                                    <TableRow key={request.id} hover>
                                        <TableCell component="th" scope="row">
                                            {String(request.id)}
                                            <br />
                                            {dateTime(request.createdAt)}
                                        </TableCell>
                                        <TableCell>
                                            {item?.name}
                                            <br />
                                            {request.orderCode}
                                            {!customer &&
                                                ` · ${request.customer.name}`}
                                        </TableCell>
                                        <TableCell>
                                            {afterSaleTypes[request.type] ??
                                                request.type}
                                        </TableCell>
                                        <TableCell>
                                            <AfterSaleBadge
                                                status={request.status}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                component={Link}
                                                to={`${base}/${request.id}`}
                                                state={{
                                                    backTo: `${base}?${params}`,
                                                }}
                                            >
                                                {customer
                                                    ? "Xem chi tiết"
                                                    : "Xem / xử lý"}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {!query.isPending &&
                                !query.isError &&
                                !rows.length && (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center">
                                            Chưa có yêu cầu phù hợp.{" "}
                                            <Button
                                                onClick={() => setParams({})}
                                            >
                                                Xem tất cả
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    component="div"
                    count={query.data?.totalElements ?? 0}
                    page={page}
                    rowsPerPage={size}
                    rowsPerPageOptions={[size]}
                    onPageChange={(_, value) => update("page", String(value))}
                    labelDisplayedRows={({ from, to, count }) =>
                        `${from}–${to} / ${count} yêu cầu`
                    }
                    getItemAriaLabel={(type) =>
                        type === "next" ? "Trang tiếp theo" : "Trang trước"
                    }
                />
            </Paper>
            {customer && (
                <Button
                    component={Link}
                    to="/account/orders?status=delivered"
                    sx={{ alignSelf: "flex-start" }}
                >
                    Xem các đơn đã giao
                </Button>
            )}
        </Stack>
    );
}
