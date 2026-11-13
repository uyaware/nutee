import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
} from "@mui/material";
import { Link } from "react-router-dom";
import { api } from "@/app/services";
import { useSession } from "@/modules/auth/hooks/useSession";
import { roleLabels } from "@/modules/auth/model/permissions";
import { AdminPageHeader } from "@/modules/management/components/AdminUI";
import type {
    ManagementUser,
    ManagementUserPage,
} from "@/modules/management/users/model/managementUser";
import { ErrorState, LoadingState } from "@/shared/components/Feedback";

export default function ConnectedUsersPage() {
    const session = useSession("backoffice");
    const client = useQueryClient();
    const [creating, setCreating] = useState(false);
    const [q, setQ] = useState("");
    const [role, setRole] = useState("all");
    const [status, setStatus] = useState("all");
    const [page, setPage] = useState(0);
    const query = useQuery({
        queryKey: [
            "management",
            session.data?.id,
            "users",
            q,
            role,
            status,
            page,
        ],
        queryFn: () =>
            api.request<ManagementUserPage>(
                `/management/users?${new URLSearchParams({ q, role, status, page: String(page), size: "20" })}`,
            ),
        retry: false,
    });
    return (
        <Stack spacing={3}>
            <AdminPageHeader
                title="Tài khoản"
                description="Tra cứu và quản lý quyền truy cập tài khoản."
                action={
                    <Button
                        variant="contained"
                        onClick={() => setCreating(true)}
                    >
                        Thêm tài khoản
                    </Button>
                }
            />
            <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
                <TextField
                    label="Tìm tên, email hoặc điện thoại"
                    value={q}
                    onChange={(event) => {
                        setQ(event.target.value);
                        setPage(0);
                    }}
                />
                <TextField
                    select
                    label="Vai trò"
                    value={role}
                    onChange={(event) => {
                        setRole(event.target.value);
                        setPage(0);
                    }}
                >
                    <MenuItem value="all">Tất cả</MenuItem>
                    {Object.entries(roleLabels).map(([key, label]) => (
                        <MenuItem key={key} value={key}>
                            {label}
                        </MenuItem>
                    ))}
                </TextField>
                <TextField
                    select
                    label="Trạng thái"
                    value={status}
                    onChange={(event) => {
                        setStatus(event.target.value);
                        setPage(0);
                    }}
                >
                    <MenuItem value="all">Tất cả</MenuItem>
                    <MenuItem value="active">Hoạt động</MenuItem>
                    <MenuItem value="locked">Đã khóa</MenuItem>
                </TextField>
            </Stack>
            {query.isPending ? (
                <LoadingState />
            ) : query.isError ? (
                <ErrorState error={query.error} />
            ) : (
                <Paper variant="outlined">
                    <TableContainer>
                        <Table aria-label="Danh sách tài khoản">
                            <TableHead>
                                <TableRow>
                                    {[
                                        "Tên",
                                        "Email",
                                        "Điện thoại",
                                        "Vai trò",
                                        "Trạng thái",
                                        "Thao tác",
                                    ].map((label) => (
                                        <TableCell key={label}>
                                            {label}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {query.data.content.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            {user.name || "Chưa cập nhật"}
                                        </TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            {user.phone || "—"}
                                        </TableCell>
                                        <TableCell>
                                            {roleLabels[user.role]}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                label={
                                                    user.isActive
                                                        ? "Hoạt động"
                                                        : "Đã khóa"
                                                }
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                component={Link}
                                                to={`/management/users/${user.id}`}
                                            >
                                                Chi tiết / quyền
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
            {creating && (
                <CreateUserDialog
                    onClose={() => setCreating(false)}
                    onSaved={async () => {
                        setCreating(false);
                        setPage(0);
                        await client.invalidateQueries({
                            queryKey: ["management"],
                        });
                    }}
                />
            )}
        </Stack>
    );
}

function CreateUserDialog({
    onClose,
    onSaved,
}: {
    onClose: () => void;
    onSaved: () => Promise<void>;
}) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("staff");
    const create = useMutation({
        mutationFn: () =>
            api.request<ManagementUser>("/management/users", {
                method: "POST",
                body: {
                    name: name.trim(),
                    email: email.trim(),
                    password,
                    role,
                },
            }),
        onSuccess: onSaved,
    });
    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="sm">
            <Stack
                component="form"
                onSubmit={(event) => {
                    event.preventDefault();
                    create.mutate();
                }}
            >
                <DialogTitle>Thêm tài khoản</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ pt: 1 }}>
                        {create.isError && <ErrorState error={create.error} />}
                        <TextField
                            required
                            label="Họ tên"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            slotProps={{ htmlInput: { maxLength: 100 } }}
                        />
                        <TextField
                            required
                            type="email"
                            label="Email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            slotProps={{ htmlInput: { maxLength: 255 } }}
                        />
                        <TextField
                            required
                            type="password"
                            label="Mật khẩu"
                            autoComplete="new-password"
                            value={password}
                            onChange={(event) =>
                                setPassword(event.target.value)
                            }
                            helperText="Ít nhất 12 ký tự, tối đa 72 byte UTF-8."
                            slotProps={{
                                htmlInput: { minLength: 12, maxLength: 72 },
                            }}
                        />
                        <TextField
                            select
                            label="Vai trò"
                            value={role}
                            onChange={(event) => setRole(event.target.value)}
                        >
                            {Object.entries(roleLabels).map(([key, label]) => (
                                <MenuItem key={key} value={key}>
                                    {label}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Hủy</Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={create.isPending}
                    >
                        Tạo tài khoản
                    </Button>
                </DialogActions>
            </Stack>
        </Dialog>
    );
}
