import { useState } from "react";
import {
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    Paper,
    Stack,
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
import AddRounded from "@mui/icons-material/AddRounded";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { services } from "@/app/services";
import { useSession } from "@/modules/auth/hooks/useSession";
import { useAdminFilters } from "@/modules/management/hooks/useAdminFilters";
import { AdminPageHeader } from "@/modules/management/components/AdminUI";
import {
    discountLabels,
    discountStatusLabels,
    type DiscountKind,
    type DiscountRule,
} from "@/modules/management/model/discounts";
import { ErrorState, LoadingState } from "@/shared/components/Feedback";
import { money, dateTime } from "@/shared/lib/format";

export function DiscountList({ kind }: { kind: DiscountKind }) {
    const session = useSession("backoffice");
    const client = useQueryClient();
    const { params, q, search, update } = useAdminFilters();
    const rawPage = Number(params.get("page"));
    const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 0;
    const status = Object.hasOwn(
        discountStatusLabels,
        params.get("status") ?? "",
    )
        ? params.get("status")!
        : "all";
    const [selected, setSelected] = useState<DiscountRule | null>(null);
    const rules = useQuery({
        queryKey: ["management", session.data?.id, kind, search, status, page],
        queryFn: () => services.discounts.list(kind, search, status, page),
        retry: false,
    });
    const toggle = useMutation({
        mutationFn: () =>
            services.discounts.active(kind, selected!.id, !selected!.isActive),
        onSuccess: async () => {
            setSelected(null);
            await Promise.all([
                client.invalidateQueries({ queryKey: ["management"] }),
                client.invalidateQueries({ queryKey: ["catalog"] }),
                client.invalidateQueries({ queryKey: ["customer"] }),
            ]);
        },
    });
    const label = discountLabels[kind];
    return (
        <Stack spacing={3}>
            <AdminPageHeader
                title={label}
                description={
                    kind === "promotions"
                        ? "Giảm giá tự động cho các sản phẩm được chọn."
                        : "Mã giảm giá đơn hàng, hạn mức và khách hàng được cấp mã."
                }
                action={
                    <Button
                        component={Link}
                        to={`/management/${kind}/new`}
                        variant="contained"
                        startIcon={<AddRounded />}
                    >
                        Tạo {label.toLowerCase()}
                    </Button>
                }
            />
            <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
                <TextField
                    label={`Tìm mã ${label.toLowerCase()}`}
                    type="search"
                    value={q}
                    onChange={(event) => update("q", event.target.value)}
                    slotProps={{ htmlInput: { maxLength: 100 } }}
                />
                <TextField
                    select
                    label="Trạng thái"
                    value={status}
                    onChange={(event) => update("status", event.target.value)}
                >
                    <MenuItem value="all">Tất cả trạng thái</MenuItem>
                    {Object.entries(discountStatusLabels).map(
                        ([value, text]) => (
                            <MenuItem key={value} value={value}>
                                {text}
                            </MenuItem>
                        ),
                    )}
                </TextField>
            </Stack>
            {rules.isPending ? (
                <LoadingState />
            ) : rules.isError ? (
                <ErrorState
                    error={rules.error}
                    retry={() => void rules.refetch()}
                />
            ) : (
                <Paper variant="outlined" sx={{ minWidth: 0 }}>
                    <TableContainer
                        role="region"
                        aria-label={`Danh sách ${label.toLowerCase()}`}
                        tabIndex={0}
                    >
                        <Table sx={{ minWidth: 760 }}>
                            <TableHead>
                                <TableRow>
                                    {[
                                        "Mã ưu đãi",
                                        "Mức giảm",
                                        "Thời gian áp dụng",
                                        "Phạm vi",
                                        "Trạng thái",
                                        "Thao tác",
                                    ].map((text) => (
                                        <TableCell key={text}>{text}</TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {!rules.data.content.length && (
                                    <TableRow>
                                        <TableCell colSpan={6}>
                                            Chưa có {label.toLowerCase()} phù
                                            hợp.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {rules.data.content.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell component="th" scope="row">
                                            <Typography fontWeight={700}>
                                                {item.code}
                                            </Typography>
                                            {kind === "vouchers" && (
                                                <Typography variant="caption">
                                                    Đơn từ{" "}
                                                    {money(item.minOrder)}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {item.type === "percent"
                                                ? `${item.value}%`
                                                : money(item.value)}
                                            {kind === "vouchers" &&
                                                item.maxDiscount !== null && (
                                                    <Typography
                                                        variant="caption"
                                                        display="block"
                                                    >
                                                        Tối đa{" "}
                                                        {money(
                                                            item.maxDiscount,
                                                        )}
                                                    </Typography>
                                                )}
                                        </TableCell>
                                        <TableCell>
                                            {dateTime(item.startsAt)}
                                            <Typography variant="body2">
                                                đến {dateTime(item.endsAt)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {kind === "promotions"
                                                ? `${item.productIds.length} sản phẩm`
                                                : item.scope === "all"
                                                  ? "Mọi khách hàng"
                                                  : `${item.userIds.length} khách hàng`}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                variant="outlined"
                                                color={
                                                    item.status === "active"
                                                        ? "success"
                                                        : "default"
                                                }
                                                label={
                                                    discountStatusLabels[
                                                        item.status
                                                    ] ?? item.status
                                                }
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Stack direction="row">
                                                <Button
                                                    component={Link}
                                                    to={`/management/${kind}/${item.id}`}
                                                >
                                                    Chỉnh sửa
                                                </Button>
                                                <Button
                                                    disabled={toggle.isPending}
                                                    onClick={() => {
                                                        toggle.reset();
                                                        setSelected(item);
                                                    }}
                                                >
                                                    {item.isActive
                                                        ? "Tạm dừng"
                                                        : "Bật lại"}
                                                </Button>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <TablePagination
                        component="div"
                        count={rules.data.totalElements}
                        page={page}
                        rowsPerPage={20}
                        rowsPerPageOptions={[20]}
                        onPageChange={(_, value) =>
                            update("page", String(value))
                        }
                        labelDisplayedRows={({ from, to, count }) =>
                            `${from}–${to} / ${count}`
                        }
                    />
                </Paper>
            )}
            <Dialog
                open={!!selected}
                onClose={() => {
                    if (!toggle.isPending) setSelected(null);
                }}
                aria-labelledby="discount-toggle-title"
            >
                <DialogTitle id="discount-toggle-title">
                    {selected?.isActive
                        ? "Tạm dừng ưu đãi?"
                        : "Bật lại ưu đãi?"}
                </DialogTitle>
                <DialogContent>
                    <Typography>{selected?.code}</Typography>
                    {toggle.isError && <ErrorState error={toggle.error} />}
                </DialogContent>
                <DialogActions>
                    <Button
                        disabled={toggle.isPending}
                        onClick={() => setSelected(null)}
                    >
                        Hủy
                    </Button>
                    <Button
                        disabled={toggle.isPending}
                        onClick={() => toggle.mutate()}
                    >
                        Xác nhận
                    </Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
}
