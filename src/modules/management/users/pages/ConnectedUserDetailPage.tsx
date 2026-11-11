import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { Link, useParams } from "react-router-dom";
import { api } from "@/app/services";
import { useSession } from "@/modules/auth/hooks/useSession";
import { roleLabels } from "@/modules/auth/model/permissions";
import type { Role } from "@/modules/auth/model/types";
import { AdminConfirm, AdminPageHeader, AdminSection } from "@/modules/management/components/AdminUI";
import type { ManagementUser } from "@/modules/management/users/model/managementUser";
import { ErrorState, LoadingState } from "@/shared/components/Feedback";
import { errorMessage } from "@/shared/lib/errors";

export default function ConnectedUserDetailPage() {
    const { id } = useParams();
    const session = useSession("backoffice");
    const query = useQuery({ queryKey: ["management", session.data?.id, "user", id], queryFn: () => api.request<ManagementUser>(`/management/users/${id}`), enabled: !!id, retry: false });
    if (query.isPending) return <LoadingState />;
    if (query.isError) return <ErrorState error={query.error} />;
    return <Editor key={`${query.data.id}:${query.data.role}:${query.data.isActive}`} user={query.data} self={query.data.id === session.data?.id} />;
}

function Editor({ user, self }: { user: ManagementUser; self: boolean }) {
    const client = useQueryClient();
    const [role, setRole] = useState<Role>(user.role);
    const [isActive, setActive] = useState(user.isActive);
    const [confirm, setConfirm] = useState(false);
    const save = useMutation({
        mutationFn: () => api.request<ManagementUser>(`/management/users/${user.id}/access`, { method: "PUT", body: { role, isActive } }),
        onSuccess: async () => { setConfirm(false); await client.invalidateQueries({ queryKey: ["management"] }); },
        onError: () => setConfirm(false),
    });
    return <Stack spacing={3}>
        <AdminPageHeader title={`Tài khoản ${user.name || user.email}`} description="Thông tin và quyền truy cập." action={<Button component={Link} to="/management/users">Về danh sách</Button>} />
        <AdminSection title="Thông tin tài khoản"><Typography>{user.email}</Typography><Typography>Điện thoại: {user.phone || "Chưa cập nhật"}</Typography><Typography>Mã tài khoản: {user.id}</Typography></AdminSection>
        <AdminSection title="Vai trò và quyền truy cập">
            {self && <Alert severity="info">Không thể thay đổi quyền của tài khoản đang đăng nhập.</Alert>}
            {save.isError && <Alert severity="error">{errorMessage(save.error)}</Alert>}
            <TextField select label="Vai trò" value={role} disabled={self || save.isPending} onChange={(event) => setRole(event.target.value as Role)}>
                {Object.entries(roleLabels).map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}
            </TextField>
            <TextField select label="Trạng thái" value={String(isActive)} disabled={self || save.isPending} onChange={(event) => setActive(event.target.value === "true")}>
                <MenuItem value="true">Hoạt động</MenuItem><MenuItem value="false">Đã khóa</MenuItem>
            </TextField>
            <Button variant="contained" disabled={self || save.isPending || (role === user.role && isActive === user.isActive)} onClick={() => setConfirm(true)} sx={{ alignSelf: "flex-start" }}>Lưu thay đổi</Button>
        </AdminSection>
        <AdminConfirm open={confirm} title="Xác nhận thay đổi quyền?" description={`${user.email}: ${roleLabels[role]} · ${isActive ? "Hoạt động" : "Đã khóa"}.`} danger={!isActive || role === "admin"} onClose={() => setConfirm(false)} onConfirm={() => save.mutate()} />
    </Stack>;
}
