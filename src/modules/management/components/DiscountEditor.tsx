import { useEffect, useState } from "react";
import {
    Alert,
    Avatar,
    Autocomplete,
    Box,
    Chip,
    IconButton,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { services } from "@/app/services";
import { useSession } from "@/modules/auth/hooks/useSession";
import {
    AdminPageHeader,
    AdminSection,
} from "@/modules/management/components/AdminUI";
import {
    discountLabels,
    discountSchema,
    discountStatusLabels,
    emptyDiscount,
    type DiscountDraft,
    type DiscountKind,
    type DiscountOption,
    type DiscountRule,
} from "@/modules/management/model/discounts";
import { ErrorState, LoadingState } from "@/shared/components/Feedback";
import { reportErrorToast } from "@/shared/lib/errorToast";
import { reportSuccessToast } from "@/shared/lib/successToast";
import { errorMessage } from "@/shared/lib/errors";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { money } from "@/shared/lib/format";
import { ProductImage } from "@/modules/catalog/components/ProductImage";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import SaveOutlined from "@mui/icons-material/SaveOutlined";
import CloseRounded from "@mui/icons-material/CloseRounded";

const localDateTime = (iso: string) =>
    new Date(new Date(iso).getTime() + 7 * 3600000).toISOString().slice(0, 16);

function ProductOption({ option, conflict = false }: { option: DiscountOption; conflict?: boolean }) {
    const price = option.minPrice == null ? "Chưa có giá" : option.maxPrice != null && option.maxPrice !== option.minPrice
        ? `${money(option.minPrice)} – ${money(option.maxPrice)}` : money(option.minPrice);
    return <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ width: 48, height: 48, flexShrink: 0, bgcolor: "background.default", borderRadius: 1, overflow: "hidden" }}>
            {option.imageUrl ? <ProductImage src={option.imageUrl} alt="" /> : null}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} sx={{ overflowWrap: "anywhere" }}>{option.name}</Typography>
            <Typography variant="caption" color="text.secondary">ID: {option.id} · {price}</Typography>
            {conflict && <Box><Chip size="small" color="warning" label={`Đã thuộc ${option.promotionCode ?? "promotion khác"}`} /></Box>}
        </Box>
    </Stack>;
}

function CustomerOption({ option }: { option: DiscountOption }) {
    return <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
        <Avatar src={option.imageUrl ?? undefined} alt="" sx={{ width: 48, height: 48, bgcolor: "primary.main", flexShrink: 0 }}>{option.name.slice(0, 1).toUpperCase()}</Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} sx={{ overflowWrap: "anywhere" }}>{option.name}</Typography>
            <Typography variant="caption" display="block" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>{option.email || "Chưa có email"}</Typography>
        </Box>
    </Stack>;
}
export function DiscountEditor({ kind }: { kind: DiscountKind }) {
    const { id } = useParams();
    const session = useSession("backoffice");
    const query = useQuery({
        queryKey: ["management", session.data?.id, kind, id],
        queryFn: () => services.discounts.get(kind, id!),
        enabled: !!id,
        retry: false,
    });
    if (id && query.isPending) return <LoadingState />;
    if (id && query.isError)
        return (
            <ErrorState
                error={query.error}
                retry={() => void query.refetch()}
            />
        );
    return (
        <Editor
            key={`${kind}:${id ?? "new"}`}
            kind={kind}
            initial={query.data}
        />
    );
}

function Editor({
    kind,
    initial,
}: {
    kind: DiscountKind;
    initial?: DiscountRule;
}) {
    const [draft, setDraft] = useState<DiscountDraft>(
        () => initial ?? emptyDiscount(kind),
    );
    const [start, setStart] = useState(() => localDateTime(draft.startsAt));
    const [end, setEnd] = useState(() => localDateTime(draft.endsAt));
    const [selected, setSelected] = useState<DiscountOption[]>(() =>
        kind === "promotions"
            ? (initial?.products ?? [])
            : (initial?.users ?? []),
    );
    const [search, setSearch] = useState("");
    const [debounced, setDebounced] = useState("");
    const setError = (message: string) => {
        if (message) reportErrorToast(message);
    };
    const [remove, setRemove] = useState(false);
    const [now, setNow] = useState(Date.now);
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(timer);
    }, []);
    const session = useSession("backoffice");
    const client = useQueryClient();
    const navigate = useNavigate();
    const label = discountLabels[kind];
    const back = `/management/${kind}`;
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(search), 300);
        return () => clearTimeout(timer);
    }, [search]);
    const options = useQuery({
        queryKey: ["management", session.data?.id, kind, "options", debounced],
        queryFn: () => services.discounts.options(kind, debounced),
        enabled: (kind === "promotions" && draft.scope === "product") || (kind === "vouchers" && draft.scope === "user"),
        retry: false,
    });
    const choices = [
        ...new Map(
            [...selected, ...(options.data ?? [])].map((option) => [
                option.id,
                option,
            ]),
        ).values(),
    ];
    const complete = async () => {
        await Promise.all([
            client.invalidateQueries({ queryKey: ["management"] }),
            client.invalidateQueries({ queryKey: ["catalog"] }),
            client.invalidateQueries({ queryKey: ["customer"] }),
        ]);
        navigate(back);
    };
    const save = useMutation({
        mutationFn: (input: DiscountDraft) =>
            services.discounts.save(kind, initial?.id, input),
        onSuccess: async () => {
            reportSuccessToast(`Đã lưu ${label.toLowerCase()}.`);
            await complete();
        },
    });
    const deletion = useMutation({
        mutationFn: () => services.discounts.remove(kind, initial!.id),
        onSuccess: complete,
    });
    const busy = save.isPending || deletion.isPending;
    const patch = (input: Partial<DiscountDraft>) => {
        setDraft((current) => ({ ...current, ...input }));
        setError("");
        save.reset();
    };
    const previewStatus = !draft.isActive
        ? "paused"
        : new Date(end + "+07:00").getTime() <= now
          ? "expired"
          : new Date(start + "+07:00").getTime() > now
            ? "scheduled"
            : "active";
    return (
        <Stack
            component="form"
            spacing={3}
            noValidate
            onSubmit={(event) => {
                event.preventDefault();
                if (busy) return;
                const startDate = new Date(start + "+07:00");
                const endDate = new Date(end + "+07:00");
                if (
                    !Number.isFinite(startDate.getTime()) ||
                    !Number.isFinite(endDate.getTime())
                ) {
                    setError("Nhập thời gian hợp lệ.");
                    return;
                }
                const parsed = discountSchema.safeParse({
                    ...draft,
                    productIds: kind === "promotions" && draft.scope === "all" ? [] : draft.productIds,
                    startsAt: startDate.toISOString(),
                    endsAt: endDate.toISOString(),
                });
                if (!parsed.success) {
                    setError(
                        parsed.error.issues
                            .map((issue) => issue.message)
                            .join(" "),
                    );
                    return;
                }
                save.mutate(parsed.data);
            }}
        >
            <AdminPageHeader
                title={
                    initial
                        ? `${label} ${initial.code}`
                        : `Tạo ${label.toLowerCase()}`
                }
                description={
                    kind === "promotions"
                        ? "Giảm giá sản phẩm tự động trong thời gian áp dụng."
                        : "Thiết lập mã giảm giá, hạn mức và khách hàng được sử dụng."
                }
                action={
                    <Button component={Link} to={back} startIcon={<ArrowBackRounded />}>
                        Về danh sách
                    </Button>
                }
            />
            {save.isError && <ErrorState error={save.error} />}
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: {
                        xs: "minmax(0, 1fr)",
                        lg: "minmax(0, 2fr) minmax(0, 1fr)",
                    },
                    gap: 3,
                    alignItems: "start",
                }}
            >
                <Stack spacing={3}>
                    <AdminSection title="Thông tin ưu đãi">
                        <Stack
                            component="fieldset"
                            spacing={2.5}
                            disabled={busy}
                            sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}
                        >
                            <TextField
                                label={`Mã ${label.toLowerCase()}`}
                                required
                                value={draft.code}
                                onChange={(event) =>
                                    patch({
                                        code: event.target.value.toUpperCase(),
                                    })
                                }
                                slotProps={{ htmlInput: { maxLength: 20 } }}
                                helperText="3–20 ký tự chữ, số, gạch ngang hoặc gạch dưới."
                            />
                            <Stack
                                direction={{ xs: "column", sm: "row" }}
                                gap={2}
                            >
                                <TextField
                                    select
                                    label="Loại giảm giá"
                                    value={draft.type}
                                    onChange={(event) =>
                                        patch({
                                            type: event.target
                                                .value as DiscountDraft["type"],
                                            value:
                                                event.target.value === "percent"
                                                    ? 5
                                                    : 100000,
                                        })
                                    }
                                >
                                    <MenuItem value="fixed">
                                        Số tiền cố định
                                    </MenuItem>
                                    <MenuItem value="percent">
                                        Phần trăm
                                    </MenuItem>
                                </TextField>
                                <TextField
                                    type="number"
                                    label={
                                        draft.type === "percent"
                                            ? "Mức giảm (%)"
                                            : "Mức giảm (VND)"
                                    }
                                    value={draft.value}
                                    onChange={(event) =>
                                        patch({
                                            value: Number(event.target.value),
                                        })
                                    }
                                    slotProps={{
                                        htmlInput: {
                                            min: 1,
                                            max:
                                                draft.type === "percent"
                                                    ? 100
                                                    : 1000000000,
                                            step: 1,
                                        },
                                    }}
                                    required
                                />
                            </Stack>
                            {kind === "vouchers" && (
                                <>
                                    <TextField
                                        type="number"
                                        label="Giá trị đơn tối thiểu (VND)"
                                        value={draft.minOrder}
                                        onChange={(event) =>
                                            patch({
                                                minOrder: Number(
                                                    event.target.value,
                                                ),
                                            })
                                        }
                                        slotProps={{
                                            htmlInput: { min: 0, step: 1 },
                                        }}
                                    />
                                    <TextField
                                        type="number"
                                        label="Giảm tối đa (VND)"
                                        value={draft.maxDiscount ?? ""}
                                        onChange={(event) =>
                                            patch({
                                                maxDiscount: event.target.value
                                                    ? Number(event.target.value)
                                                    : null,
                                            })
                                        }
                                        helperText="Bỏ trống nếu không giới hạn mức giảm."
                                        slotProps={{
                                            htmlInput: { min: 1, step: 1 },
                                        }}
                                    />
                                    <Stack
                                        direction={{ xs: "column", sm: "row" }}
                                        gap={2}
                                    >
                                        <TextField
                                            type="number"
                                            label="Tổng lượt sử dụng"
                                            value={draft.quantity}
                                            onChange={(event) =>
                                                patch({
                                                    quantity: Number(
                                                        event.target.value,
                                                    ),
                                                })
                                            }
                                            slotProps={{
                                                htmlInput: { min: 0, step: 1 },
                                            }}
                                        />
                                        <TextField
                                            type="number"
                                            label="Lượt tối đa mỗi khách"
                                            value={draft.maxUsesPerUser}
                                            onChange={(event) =>
                                                patch({
                                                    maxUsesPerUser: Number(
                                                        event.target.value,
                                                    ),
                                                })
                                            }
                                            slotProps={{
                                                htmlInput: { min: 1, step: 1 },
                                            }}
                                        />
                                    </Stack>
                                </>
                            )}
                            <Stack
                                direction={{ xs: "column", sm: "row" }}
                                gap={2}
                            >
                                <TextField
                                    label="Bắt đầu (giờ Việt Nam)"
                                    type="datetime-local"
                                    value={start}
                                    onChange={(event) =>
                                        setStart(event.target.value)
                                    }
                                    slotProps={{ inputLabel: { shrink: true } }}
                                    required
                                />
                                <TextField
                                    label="Kết thúc (giờ Việt Nam)"
                                    type="datetime-local"
                                    value={end}
                                    onChange={(event) =>
                                        setEnd(event.target.value)
                                    }
                                    slotProps={{ inputLabel: { shrink: true } }}
                                    required
                                />
                            </Stack>
                            <TextField
                                select
                                label="Kích hoạt"
                                value={String(draft.isActive)}
                                onChange={(event) =>
                                    patch({
                                        isActive: event.target.value === "true",
                                    })
                                }
                            >
                                <MenuItem value="true">Bật ưu đãi</MenuItem>
                                <MenuItem value="false">Tạm dừng</MenuItem>
                            </TextField>
                        </Stack>
                    </AdminSection>
                    <AdminSection title="Phạm vi áp dụng">
                        {kind === "promotions" && <TextField
                            select
                            label="Áp dụng cho"
                            value={draft.scope}
                            disabled={busy}
                            onChange={(event) => {
                                const scope = event.target.value as "all" | "product";
                                setSelected([]);
                                patch({ scope, productIds: [] });
                            }}
                        >
                            <MenuItem value="all">Tất cả sản phẩm hiện có</MenuItem>
                            <MenuItem value="product">Sản phẩm được chọn</MenuItem>
                        </TextField>}
                        {kind === "vouchers" && (
                            <TextField
                                select
                                label="Áp dụng cho"
                                value={draft.scope}
                                disabled={busy}
                                onChange={(event) =>
                                    patch({
                                        scope: event.target
                                            .value as DiscountDraft["scope"],
                                        userIds:
                                            event.target.value === "all"
                                                ? []
                                                : selected.map(
                                                      (option) => option.id,
                                                  ),
                                    })
                                }
                            >
                                <MenuItem value="all">Mọi khách hàng</MenuItem>
                                <MenuItem value="user">
                                    Khách hàng được chọn
                                </MenuItem>
                            </TextField>
                        )}
                        {kind === "promotions" && draft.scope === "all" && <Alert severity="info">Áp dụng cho sản phẩm hiện có khi lưu. Sản phẩm thêm sau không tự tham gia. Không thể lưu nếu sản phẩm đã thuộc promotion khác.</Alert>}
                        {kind === "vouchers" && draft.scope === "all" && <Alert severity="info">Áp dụng cho mọi khách hàng, bao gồm cả khách hàng đăng ký sau này, khi đáp ứng điều kiện và giới hạn của voucher.</Alert>}
                        {((kind === "promotions" && draft.scope === "product") || (kind === "vouchers" && draft.scope === "user")) && (
                            <>
                                {options.isError && (
                                    <ErrorState
                                        error={options.error}
                                        retry={() => void options.refetch()}
                                    />
                                )}
                                <Autocomplete
                                    multiple
                                    options={choices}
                                    value={selected}
                                    disabled={busy}
                                    loading={options.isFetching}
                                    filterOptions={(values) => values}
                                    getOptionLabel={(option) =>
                                        option.email
                                            ? `${option.name} · ${option.email}`
                                            : option.name
                                    }
                                    getOptionKey={(option) => option.id}
                                    getOptionDisabled={(option) => (kind === "promotions" && !!option.promotionId && option.promotionId !== initial?.id) || (selected.length >= 200 && !selected.some((item) => item.id === option.id))}
                                    isOptionEqualToValue={(left, right) =>
                                        left.id === right.id
                                    }
                                    onInputChange={(_, value, reason) => {
                                        if (
                                            reason === "input" ||
                                            reason === "clear"
                                        )
                                            setSearch(value.slice(0, 100));
                                    }}
                                    onChange={(_, values) => {
                                        setSelected(values);
                                        patch(
                                            kind === "promotions"
                                                ? {
                                                      productIds: values.map(
                                                          (option) =>
                                                              Number(option.id),
                                                      ),
                                                  }
                                                : {
                                                      userIds: values.map(
                                                          (option) => option.id,
                                                      ),
                                                  },
                                        );
                                    }}
                                    renderTags={() => null}
                                    renderOption={(props, option) => {
                                        const { key, ...optionProps } = props;
                                        return <Box component="li" key={key} {...optionProps}>
                                            {kind === "promotions" ? <ProductOption option={option} conflict={!!option.promotionId && option.promotionId !== initial?.id} /> : <CustomerOption option={option} />}
                                        </Box>;
                                    }}
                                    renderInput={(props) => (
                                        <TextField
                                            {...props}
                                            label={
                                                kind === "promotions"
                                                    ? "Chọn sản phẩm"
                                                    : "Chọn khách hàng"
                                            }
                                            helperText={kind === "promotions" ? "Tìm theo tên; chọn tối đa 200 sản phẩm." : "Tìm theo tên, tài khoản hoặc email; chọn tối đa 200 khách hàng."}
                                        />
                                    )}
                                    sx={{
                                        "& .MuiChip-root": { maxWidth: "100%" },
                                    }}
                                />
                                {selected.length > 0 && <Stack spacing={1} sx={{ maxHeight: 360, overflowY: "auto", minWidth: 0 }}>
                                    <Typography variant="body2" fontWeight={600}>Đã chọn {selected.length} {kind === "promotions" ? "sản phẩm" : "khách hàng"}</Typography>
                                    {selected.map((option) => <Stack key={option.id} direction="row" alignItems="center" spacing={1} sx={{ p: 1, border: "1px solid", borderColor: "divider", borderRadius: 1, minWidth: 0 }}>
                                        {kind === "promotions" ? <Box component={Link} to={`/management/products/${option.id}/edit`} target="_blank" rel="noopener noreferrer" aria-label={`Quản lý sản phẩm ${option.name} (mở tab mới)`} sx={{ flex: 1, minWidth: 0, color: "inherit", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}><ProductOption option={option} /></Box> : <CustomerOption option={option} />}
                                        <IconButton aria-label={`Bỏ chọn ${option.name}`} disabled={busy} onClick={() => {
                                            const remaining = selected.filter((item) => item.id !== option.id);
                                            setSelected(remaining);
                                            patch(kind === "promotions" ? { productIds: remaining.map((item) => Number(item.id)) } : { userIds: remaining.map((item) => item.id) });
                                        }}><DeleteOutlineRounded fontSize="small" /></IconButton>
                                    </Stack>)}
                                </Stack>}
                            </>
                        )}
                        <Typography variant="body2" color="text.secondary">
                            {kind === "promotions"
                                ? "Mỗi sản phẩm thuộc một promotion. Giá gốc được giữ nguyên."
                                : "Khách hàng có thể được cấp nhiều voucher; mỗi đơn chỉ dùng một mã. Xem trước giá không trừ lượt sử dụng."}
                        </Typography>
                    </AdminSection>
                </Stack>
                <AdminSection title="Xem trước ưu đãi">
                    <StatusBadge
                        kind="general"
                        status={previewStatus}
                        label={discountStatusLabels[previewStatus]}
                    />
                    <Typography
                        variant="h3"
                        component="h2"
                        sx={{ overflowWrap: "anywhere" }}
                    >
                        {draft.code || "MÃ ƯU ĐÃI"}
                    </Typography>
                    <Typography color="primary.main" fontSize={28}>
                        {draft.type === "percent"
                            ? `Giảm ${draft.value}%`
                            : `Giảm ${money(draft.value)}`}
                    </Typography>
                    {kind === "vouchers" && (
                        <Typography>
                            Cho đơn từ {money(draft.minOrder)}
                        </Typography>
                    )}
                </AdminSection>
            </Box>
            <Stack direction="row" justifyContent="space-between" gap={2}>
                <Box>
                    {initial && (
                        <Button
                            color="error"
                            startIcon={<DeleteOutlineRounded />}
                            disabled={busy}
                            onClick={() => {
                                deletion.reset();
                                setRemove(true);
                            }}
                        >
                            Xóa {label.toLowerCase()}
                        </Button>
                    )}
                </Box>
                <Stack direction="row" gap={2}>
                    <Button component={Link} to={back} startIcon={<CloseRounded />}>
                        Hủy
                    </Button>
                    <Button variant="contained" type="submit" disabled={busy} startIcon={<SaveOutlined />}>
                        {save.isPending ? "Đang lưu…" : "Lưu thay đổi"}
                    </Button>
                </Stack>
            </Stack>
            <Dialog
                open={remove}
                onClose={() => {
                    if (!busy) setRemove(false);
                }}
                aria-labelledby="discount-delete-title"
            >
                <DialogTitle id="discount-delete-title">
                    Xóa {label.toLowerCase()}?
                </DialogTitle>
                <DialogContent>
                    <Typography>{initial?.code}</Typography>
                    {deletion.isError && <Alert severity="error" sx={{ mt: 2 }}>{errorMessage(deletion.error)}</Alert>}
                </DialogContent>
                <DialogActions>
                    <Button disabled={busy} onClick={() => setRemove(false)} startIcon={<CloseRounded />}>
                        Hủy
                    </Button>
                    <Button
                        color="error"
                        startIcon={<DeleteOutlineRounded />}
                        disabled={busy}
                        onClick={() => deletion.mutate()}
                    >
                        Xác nhận xóa
                    </Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
}
