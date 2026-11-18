import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Alert,
    Autocomplete,
    Button,
    Box,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    TableCell,
    TextField,
    Typography,
} from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import CategoryOutlined from "@mui/icons-material/CategoryOutlined";
import SellOutlined from "@mui/icons-material/SellOutlined";
import EditOutlined from "@mui/icons-material/EditOutlined";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import { api } from "@/app/services";
import { useSession } from "@/modules/auth/hooks/useSession";
import {
    AdminConfirm,
    AdminPageHeader,
    AdminTable,
} from "@/modules/management/components/AdminUI";
import { ErrorState, LoadingState } from "@/shared/components/Feedback";
import { reportSuccessToast } from "@/shared/lib/successToast";

type Item = {
    id: number;
    name: string;
    parentId: number | null;
    productCount: number;
    childCount: number;
};
type Draft = { id?: number; name: string; parentId: string };

export default function ConnectedTaxonomyPage({
    kind,
}: {
    kind: "brands" | "categories";
}) {
    return <TaxonomyEditor key={kind} kind={kind} />;
}

function TaxonomyEditor({ kind }: { kind: "brands" | "categories" }) {
    const session = useSession("backoffice");
    const client = useQueryClient();
    const [draft, setDraft] = useState<Draft | null>(null);
    const [selected, setSelected] = useState<Item | null>(null);
    const [search, setSearch] = useState("");
    const label = kind === "brands" ? "thương hiệu" : "danh mục";
    const query = useQuery({
        queryKey: ["management", session.data?.id, "taxonomy", kind, search],
        queryFn: () =>
            api.request<Item[]>(
                `/management/taxonomy/${kind}?${new URLSearchParams({ q: search })}`,
            ),
        retry: false,
    });
    const allCategories = useQuery({
        queryKey: [
            "management",
            session.data?.id,
            "taxonomy",
            "categories",
            "",
        ],
        queryFn: () => api.request<Item[]>("/management/taxonomy/categories"),
        enabled: kind === "categories",
        retry: false,
    });
    const refresh = async () => {
        await Promise.all([
            client.invalidateQueries({ queryKey: ["management"] }),
            client.invalidateQueries({ queryKey: ["catalog"] }),
        ]);
    };
    const save = useMutation({
        mutationFn: (value: Draft) =>
            api.request<void>(
                `/management/taxonomy/${kind}${value.id ? `/${value.id}` : ""}`,
                {
                    method: value.id ? "PUT" : "POST",
                    body: {
                        name: value.name.trim(),
                        parentId: value.parentId
                            ? Number(value.parentId)
                            : null,
                    },
                },
            ),
        onSuccess: async () => {
            reportSuccessToast(`Đã lưu ${label}.`);
            setDraft(null);
            await refresh();
        },
    });
    const remove = useMutation({
        mutationFn: (id: number) =>
            api.request<void>(`/management/taxonomy/${kind}/${id}`, {
                method: "DELETE",
            }),
        onSuccess: async () => {
            setSelected(null);
            await refresh();
        },
    });
    if (query.isPending) return <LoadingState />;
    if (query.isError) return <ErrorState error={query.error} />;
    const rows = query.data.map((item) => ({ ...item, id: String(item.id) }));
    return (
        <Stack spacing={3}>
            <AdminPageHeader
                title={kind === "brands" ? "Thương hiệu" : "Danh mục"}
                description={`Quản lý ${label} trong cửa hàng.`}
                action={
                    <Button
                        variant="contained"
                        startIcon={<AddRounded />}
                        onClick={() => {
                            save.reset();
                            setDraft({ name: "", parentId: "" });
                        }}
                    >
                        Thêm {label}
                    </Button>
                }
            />
            <TextField
                label={`Tìm ${label}`}
                type="search"
                sx={{ maxWidth: 420 }}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
            />
            <AdminTable
                label={`Danh sách ${label}`}
                pageSize={20}
                compact
                rows={rows}
                columns={[
                    "Tên",
                    ...(kind === "categories" ? ["Danh mục cha"] : []),
                    "Sản phẩm",
                    "Thao tác",
                ]}
                renderRow={(row) => (
                    <>
                        <TableCell>
                            <Stack direction="row" spacing={1.25} alignItems="center">
                                <Box sx={{ width: 34, height: 34, borderRadius: 1.5, bgcolor: "action.selected", color: "primary.main", display: "grid", placeItems: "center", flexShrink: 0 }}>
                                    {kind === "categories" ? <CategoryOutlined fontSize="small" /> : <SellOutlined fontSize="small" />}
                                </Box>
                                <Typography variant="body2" fontWeight={600}>{row.name}</Typography>
                            </Stack>
                        </TableCell>
                        {kind === "categories" && (
                            <TableCell>
                                <Chip size="small" variant={row.parentId ? "outlined" : "filled"} label={row.parentId
                                    ? (allCategories.data?.find(
                                          (item) => item.id === row.parentId,
                                      )?.name ?? "…")
                                    : "Danh mục gốc"} />
                            </TableCell>
                        )}
                        <TableCell><Typography variant="body2" color="text.secondary">{row.productCount.toLocaleString("vi-VN")}</Typography></TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                            <Button
                                size="small"
                                startIcon={<EditOutlined />}
                                onClick={() => {
                                    save.reset();
                                    setDraft({
                                        id: Number(row.id),
                                        name: row.name,
                                        parentId:
                                            row.parentId?.toString() ?? "",
                                    });
                                }}
                            >
                                Sửa
                            </Button>
                            <Button
                                color="error"
                                size="small"
                                startIcon={<DeleteOutlineRounded />}
                                onClick={() => {
                                    remove.reset();
                                    setSelected(
                                        query.data.find(
                                            (item) =>
                                                item.id === Number(row.id),
                                        ) ?? null,
                                    );
                                }}
                            >
                                Xóa
                            </Button>
                        </TableCell>
                    </>
                )}
            />
            <Dialog
                open={!!draft}
                onClose={() => setDraft(null)}
                fullWidth
                maxWidth="sm"
            >
                {draft && (
                    <Stack
                        component="form"
                        onSubmit={(event) => {
                            event.preventDefault();
                            save.mutate(draft);
                        }}
                    >
                        <DialogTitle>
                            {draft.id ? "Chỉnh sửa" : "Thêm"} {label}
                        </DialogTitle>
                        <DialogContent>
                            <Stack spacing={2} sx={{ pt: 1 }}>
                                {save.isError && (
                                    <ErrorState error={save.error} />
                                )}
                                <TextField
                                    required
                                    autoFocus
                                    label="Tên"
                                    value={draft.name}
                                    onChange={(event) =>
                                        setDraft({
                                            ...draft,
                                            name: event.target.value,
                                        })
                                    }
                                    slotProps={{ htmlInput: { maxLength: 80 } }}
                                />
                                {kind === "categories" && (
                                    <Autocomplete
                                        options={(allCategories.data ?? []).filter((item) => item.id !== draft.id)}
                                        value={allCategories.data?.find((item) => String(item.id) === draft.parentId) ?? null}
                                        getOptionLabel={(item) => item.name}
                                        getOptionKey={(item) => item.id}
                                        isOptionEqualToValue={(option, value) => option.id === value.id}
                                        onChange={(_, item) => setDraft({ ...draft, parentId: item ? String(item.id) : "" })}
                                        loading={allCategories.isPending}
                                        disabled={allCategories.isPending || allCategories.isError}
                                        loadingText="Đang tải danh mục…"
                                        noOptionsText="Không tìm thấy danh mục"
                                        clearText="Chọn danh mục gốc"
                                        openText="Mở danh sách"
                                        closeText="Đóng danh sách"
                                        renderInput={(params) => <TextField {...params} label="Danh mục cha" placeholder="Tìm và chọn danh mục" helperText={allCategories.isError ? "Không tải được danh mục. Vui lòng thử lại." : "Để trống nếu là danh mục gốc."} error={allCategories.isError} />}
                                    />
                                )}
                            </Stack>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setDraft(null)}>Hủy</Button>
                            <Button
                                type="submit"
                                variant="contained"
                                disabled={save.isPending || !draft.name.trim()}
                            >
                                Lưu
                            </Button>
                        </DialogActions>
                    </Stack>
                )}
            </Dialog>
            {remove.isError && <ErrorState error={remove.error} />}
            {selected &&
                (selected.productCount || selected.childCount ? (
                    <Alert severity="warning" onClose={() => setSelected(null)}>
                        <Typography>
                            {selected.name} đang được sử dụng; hãy bỏ liên kết
                            sản phẩm và danh mục con trước khi xóa.
                        </Typography>
                    </Alert>
                ) : (
                    <AdminConfirm
                        open
                        title={`Xóa ${label}?`}
                        description={selected.name}
                        label="Xóa"
                        danger
                        onClose={() => setSelected(null)}
                        onConfirm={() => remove.mutate(selected.id)}
                    />
                ))}
        </Stack>
    );
}
