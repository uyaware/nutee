import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Button,
    Chip,
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
} from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import { Link } from "react-router-dom";
import { api } from "@/app/services";
import { useSession } from "@/modules/auth/hooks/useSession";
import {
    AdminConfirm,
    AdminPageHeader,
} from "@/modules/management/components/AdminUI";
import type {
    ProductPage,
    ProductSummary,
} from "@/modules/management/products/model/managementProduct";
import { ErrorState, LoadingState } from "@/shared/components/Feedback";

export default function ConnectedProductsPage() {
    const session = useSession("backoffice");
    const client = useQueryClient();
    const [q, setQ] = useState("");
    const [page, setPage] = useState(0);
    const [selected, setSelected] = useState<ProductSummary | null>(null);
    const query = useQuery({
        queryKey: ["management", session.data?.id, "products", q, page],
        queryFn: () =>
            api.request<ProductPage>(
                `/management/products?${new URLSearchParams({ q, page: String(page), size: "20" })}`,
            ),
        retry: false,
    });
    const remove = useMutation({
        mutationFn: (id: number) =>
            api.request<void>(`/management/products/${id}`, {
                method: "DELETE",
            }),
        onSuccess: async () => {
            setSelected(null);
            setPage(0);
            await Promise.all([
                client.invalidateQueries({ queryKey: ["management"] }),
                client.invalidateQueries({ queryKey: ["catalog"] }),
            ]);
        },
        onError: () => setSelected(null),
    });
    return (
        <Stack spacing={3}>
            <AdminPageHeader
                title="Sản phẩm"
                description="Quản lý sản phẩm và từng biến thể."
                action={
                    <Button
                        component={Link}
                        to="/management/products/new"
                        variant="contained"
                        startIcon={<AddRounded />}
                    >
                        Thêm sản phẩm
                    </Button>
                }
            />
            <TextField
                label="Tìm sản phẩm"
                value={q}
                onChange={(event) => {
                    setQ(event.target.value);
                    setPage(0);
                }}
            />
            {remove.isError && <ErrorState error={remove.error} />}
            {query.isPending ? (
                <LoadingState />
            ) : query.isError ? (
                <ErrorState error={query.error} />
            ) : (
                <Paper variant="outlined">
                    <TableContainer>
                        <Table aria-label="Danh sách sản phẩm">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Sản phẩm</TableCell>
                                    <TableCell>Hiển thị</TableCell>
                                    <TableCell>Thao tác</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {query.data.content.map((product) => (
                                    <TableRow key={product.id}>
                                        <TableCell>{product.name}</TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                label={
                                                    product.published
                                                        ? "Công khai"
                                                        : "Đã ẩn"
                                                }
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                component={Link}
                                                to={`/management/products/${product.id}/edit`}
                                            >
                                                Sửa
                                            </Button>
                                            <Button
                                                color="error"
                                                onClick={() => {
                                                    remove.reset();
                                                    setSelected(product);
                                                }}
                                            >
                                                Xóa
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <TablePagination
                        component="div"
                        count={query.data.totalElements}
                        page={page}
                        rowsPerPage={20}
                        rowsPerPageOptions={[20]}
                        onPageChange={(_, value) => setPage(value)}
                    />
                </Paper>
            )}
            <AdminConfirm
                open={!!selected}
                title="Xóa sản phẩm?"
                description={selected?.name ?? ""}
                label="Xóa"
                danger
                onClose={() => setSelected(null)}
                onConfirm={() => {
                    if (selected) remove.mutate(selected.id);
                }}
            />
        </Stack>
    );
}
