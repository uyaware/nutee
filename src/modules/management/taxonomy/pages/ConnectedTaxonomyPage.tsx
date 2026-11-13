import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    Stack,
    TableCell,
    TextField,
    Typography,
} from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import { api } from "@/app/services";
import { useSession } from "@/modules/auth/hooks/useSession";
import {
    AdminConfirm,
    AdminPageHeader,
    AdminTable,
} from "@/modules/management/components/AdminUI";
import { ErrorState, LoadingState } from "@/shared/components/Feedback";

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
                value={search}
                onChange={(event) => setSearch(event.target.value)}
            />
            <AdminTable
                label={`Danh sách ${label}`}
                rows={rows}
                columns={[
                    "Tên",
                    ...(kind === "categories" ? ["Danh mục cha"] : []),
                    "Sản phẩm",
                    "Thao tác",
                ]}
                renderRow={(row) => (
                    <>
                        <TableCell>{row.name}</TableCell>
                        {kind === "categories" && (
                            <TableCell>
                                {row.parentId
                                    ? (allCategories.data?.find(
                                          (item) => item.id === row.parentId,
                                      )?.name ?? "…")
                                    : "Danh mục gốc"}
                            </TableCell>
                        )}
                        <TableCell>{row.productCount}</TableCell>
                        <TableCell>
                            <Button
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
                                    <TextField
                                        select
                                        label="Danh mục cha"
                                        value={draft.parentId}
                                        onChange={(event) =>
                                            setDraft({
                                                ...draft,
                                                parentId: event.target.value,
                                            })
                                        }
                                    >
                                        <MenuItem value="">
                                            Danh mục gốc
                                        </MenuItem>
                                        {(allCategories.data ?? [])
                                            .filter(
                                                (item) => item.id !== draft.id,
                                            )
                                            .map((item) => (
                                                <MenuItem
                                                    key={item.id}
                                                    value={String(item.id)}
                                                >
                                                    {item.name}
                                                </MenuItem>
                                            ))}
                                    </TextField>
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
