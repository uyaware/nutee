import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Button,
    Box,
    Chip,
    InputAdornment,
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
    Tooltip,
    Typography,
} from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import EditOutlined from "@mui/icons-material/EditOutlined";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlined from "@mui/icons-material/VisibilityOffOutlined";
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import StarRounded from "@mui/icons-material/StarRounded";
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
import { reportSuccessToast } from "@/shared/lib/successToast";

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
    const publication = useMutation({
        mutationFn: (product: ProductSummary) =>
            api.request(`/management/products/${product.id}/publication`, {
                method: "PATCH",
                body: { published: !product.published },
            }),
        onSuccess: async (_, product) => {
            reportSuccessToast(product.published ? "Đã ngừng công khai sản phẩm." : "Đã công khai sản phẩm.");
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
                type="search"
                placeholder="Nhập tên sản phẩm"
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRounded color="action" /></InputAdornment> } }}
                sx={{ maxWidth: 420 }}
                value={q}
                onChange={(event) => {
                    setQ(event.target.value);
                    setPage(0);
                }}
            />
            {publication.isError && <ErrorState error={publication.error} />}
            {query.isPending ? (
                <LoadingState />
            ) : query.isError ? (
                <ErrorState error={query.error} />
            ) : (
                <Paper variant="outlined" sx={{ overflow: "hidden", borderRadius: 2 }}>
                    <TableContainer tabIndex={0} role="region" aria-label="Danh sách sản phẩm">
                        <Table aria-label="Danh sách sản phẩm" sx={{ minWidth: 1050, "& .MuiTableCell-root": { py: 1.5 } }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Sản phẩm</TableCell>
                                    <TableCell>Danh mục</TableCell>
                                    <TableCell>Thương hiệu</TableCell>
                                    <TableCell>Hiển thị</TableCell>
                                    <TableCell>Đánh giá</TableCell>
                                    <TableCell>Đã bán</TableCell>
                                    <TableCell>Thao tác</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {query.data.content.map((product) => (
                                    <TableRow key={product.id} hover>
                                        <TableCell>
                                            <Stack direction="row" spacing={1.5} alignItems="center">
                                                {product.imageUrl ? <Box component="img" src={product.imageUrl} alt="" sx={{ width: 56, height: 56, objectFit: "contain", borderRadius: 1 }} /> : <Box sx={{ width: 56, height: 56, bgcolor: "action.hover", borderRadius: 1 }} />}
                                                <Button component={Link} to={`/management/products/${product.id}/edit`} sx={{ textAlign: "left", justifyContent: "flex-start", fontWeight: 700 }}>{product.name}</Button>
                                            </Stack>
                                        </TableCell>
                                        <TableCell>{product.categories.length ? <Stack direction="row" flexWrap="wrap" gap={0.5}>{product.categories.slice(0, 2).map((category, index) => <Chip key={`${category}-${index}`} size="small" label={category} sx={{ bgcolor: "action.selected", color: "primary.dark", fontWeight: 600 }} />)}{product.categories.length > 2 && <Tooltip title={product.categories.slice(2).join(", ")}><Chip size="small" label={`+${product.categories.length - 2}`} tabIndex={0} aria-label={`Các danh mục khác: ${product.categories.slice(2).join(", ")}`} /></Tooltip>}</Stack> : "—"}</TableCell>
                                        <TableCell>{product.brand || "—"}</TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                color={product.published ? "success" : "default"}
                                                variant={product.published ? "outlined" : "filled"}
                                                label={
                                                    product.published
                                                        ? "Công khai"
                                                        : "Đã ẩn"
                                                }
                                            />
                                        </TableCell>
                                        <TableCell><Stack direction="row" alignItems="center" spacing={0.5}><StarRounded sx={{ color: "warning.main", fontSize: 18 }} /><span>{product.avgRating == null || product.avgRating <= 0 ? "_" : Number(product.avgRating.toFixed(1))}</span></Stack></TableCell>
                                        <TableCell>{(product.soldCount ?? 0).toLocaleString("vi-VN")}</TableCell>
                                        <TableCell>
                                            <Button
                                                component={Link}
                                                to={`/management/products/${product.id}/edit`}
                                                startIcon={<EditOutlined />}
                                            >
                                                Sửa
                                            </Button>
                                            <Button
                                                disabled={publication.isPending}
                                                startIcon={product.published ? <VisibilityOffOutlined /> : <VisibilityOutlined />}
                                                onClick={() => {
                                                    publication.reset();
                                                    setSelected(product);
                                                }}
                                            >
                                                {product.published ? "Ngừng công khai" : "Công khai"}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {query.data.content.length === 0 && <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6 }}><Inventory2Outlined color="disabled" sx={{ fontSize: 36, mb: 1 }} /><Typography color="text.secondary">Không tìm thấy sản phẩm phù hợp.</Typography></TableCell></TableRow>}
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
                title={selected?.published ? "Ngừng công khai sản phẩm?" : "Công khai sản phẩm?"}
                description={selected?.name ?? ""}
                label={selected?.published ? "Ngừng công khai" : "Công khai"}
                onClose={() => setSelected(null)}
                onConfirm={() => {
                    if (selected) publication.mutate(selected);
                }}
            />
        </Stack>
    );
}
