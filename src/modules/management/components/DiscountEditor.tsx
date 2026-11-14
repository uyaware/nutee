import { useEffect, useState } from "react";
import {
    Autocomplete,
    Box,
    Button,
    Chip,
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
import { money } from "@/shared/lib/format";

const localDateTime = (iso: string) =>
    new Date(new Date(iso).getTime() + 7 * 3600000).toISOString().slice(0, 16);
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
        enabled: kind === "promotions" || draft.scope === "user",
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
        onSuccess: complete,
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
                    <Button component={Link} to={back}>
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
                        {(kind === "promotions" || draft.scope === "user") && (
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
                                    renderInput={(props) => (
                                        <TextField
                                            {...props}
                                            label={
                                                kind === "promotions"
                                                    ? "Chọn sản phẩm"
                                                    : "Chọn khách hàng"
                                            }
                                            helperText="Tìm theo tên hoặc email; chọn tối đa 200 đối tượng."
                                        />
                                    )}
                                    sx={{
                                        "& .MuiChip-root": { maxWidth: "100%" },
                                    }}
                                />
                            </>
                        )}
                        <Typography variant="body2" color="text.secondary">
                            {kind === "promotions"
                                ? "Mỗi sản phẩm thuộc một promotion. Giá gốc được giữ nguyên."
                                : "Voucher giảm trên tiền hàng sau promotion. Xem trước giá không trừ lượt sử dụng."}
                        </Typography>
                    </AdminSection>
                </Stack>
                <AdminSection title="Xem trước ưu đãi">
                    <Chip
                        label={discountStatusLabels[previewStatus]}
                        color={
                            previewStatus === "active" ? "success" : "default"
                        }
                        sx={{ alignSelf: "flex-start" }}
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
                    <Button component={Link} to={back}>
                        Hủy
                    </Button>
                    <Button variant="contained" type="submit" disabled={busy}>
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
                    {deletion.isError && <ErrorState error={deletion.error} />}
                </DialogContent>
                <DialogActions>
                    <Button disabled={busy} onClick={() => setRemove(false)}>
                        Hủy
                    </Button>
                    <Button
                        color="error"
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
