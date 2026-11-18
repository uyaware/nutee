import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Alert,
    Avatar,
    Box,
    Button,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import SaveOutlined from "@mui/icons-material/SaveOutlined";
import AdminPanelSettingsOutlined from "@mui/icons-material/AdminPanelSettingsOutlined";
import { Link, useParams } from "react-router-dom";
import { api } from "@/app/services";
import { useSession } from "@/modules/auth/hooks/useSession";
import { roleLabels } from "@/modules/auth/model/permissions";
import type { Role } from "@/modules/auth/model/types";
import {
    AdminConfirm,
    AdminPageHeader,
    AdminSection,
} from "@/modules/management/components/AdminUI";
import type { ManagementUser } from "@/modules/management/users/model/managementUser";
import { ErrorState, LoadingState } from "@/shared/components/Feedback";
import { reportSuccessToast } from "@/shared/lib/successToast";
import { StatusBadge } from "@/shared/components/StatusBadge";

export default function ConnectedUserDetailPage() {
    const { id } = useParams();
    const session = useSession("backoffice");
    const query = useQuery({
        queryKey: ["management", session.data?.id, "user", id],
        queryFn: () => api.request<ManagementUser>(`/management/users/${id}`),
        enabled: !!id,
        retry: false,
    });
    if (query.isPending) return <LoadingState />;
    if (query.isError) return <ErrorState error={query.error} />;
    return (
        <Editor
            key={`${query.data.id}:${query.data.role}:${query.data.isActive}`}
            user={query.data}
            self={query.data.id === session.data?.id}
        />
    );
}

function Editor({ user, self }: { user: ManagementUser; self: boolean }) {
    const client = useQueryClient();
    const [role, setRole] = useState<Role>(user.role);
    const [isActive, setActive] = useState(user.isActive);
    const [confirm, setConfirm] = useState(false);
    const save = useMutation({
        mutationFn: () =>
            api.request<ManagementUser>(`/management/users/${user.id}/access`, {
                method: "PUT",
                body: { role, isActive },
            }),
        onSuccess: async () => {
            reportSuccessToast("Đã lưu quyền tài khoản.");
            setConfirm(false);
            await client.invalidateQueries({ queryKey: ["management"] });
        },
        onError: () => setConfirm(false),
    });
    return (
        <Stack spacing={3}>
            <AdminPageHeader
                title={`Tài khoản ${user.name || user.email}`}
                description="Thông tin và quyền truy cập."
                action={
                    <Button component={Link} to="/management/users" startIcon={<ArrowBackRounded />}>
                        Về danh sách
                    </Button>
                }
            />
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "repeat(2, minmax(0, 1fr))" }, gap: 3, alignItems: "start" }}>
            <AdminSection title="Thông tin tài khoản">
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{ width: 48, height: 48, bgcolor: "primary.main" }}>{(user.name || user.email).slice(0, 1).toUpperCase()}</Avatar>
                    <Box sx={{ minWidth: 0 }}><Typography fontWeight={700} sx={{ overflowWrap: "anywhere" }}>{user.name || "Chưa cập nhật"}</Typography><Typography variant="body2" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>{user.email}</Typography></Box>
                </Stack>
                <Box sx={{ p: 2, bgcolor: "action.hover", borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary">Điện thoại</Typography>
                    <Typography>{user.phone || "Chưa cập nhật"}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>Mã tài khoản</Typography>
                    <Typography sx={{ overflowWrap: "anywhere" }}>{user.id}</Typography>
                </Box>
            </AdminSection>
            <AdminSection title="Vai trò và quyền truy cập">
                {self && (
                    <Alert severity="info">
                        Không thể thay đổi quyền của tài khoản đang đăng nhập.
                    </Alert>
                )}
                {save.isError && <ErrorState error={save.error} />}
                <Stack direction="row" alignItems="center" gap={1.5} sx={{ p: 2, bgcolor: "action.selected", border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                    <AdminPanelSettingsOutlined color="primary" />
                    <Box sx={{ flex: 1, minWidth: 0 }}><Typography variant="body2" color="text.secondary">Vai trò đang chọn</Typography><Typography fontWeight={700}>{roleLabels[role]}</Typography></Box>
                    <StatusBadge kind="general" status={isActive ? "active" : "locked"} label={isActive ? "Hoạt động" : "Đã khóa"} />
                </Stack>
                <TextField
                    select
                    label="Vai trò"
                    value={role}
                    disabled={self || save.isPending}
                    onChange={(event) => setRole(event.target.value as Role)}
                >
                    {(["staff", "admin"] as const).map((role) => (
                        <MenuItem key={role} value={role}>
                            {roleLabels[role]}
                        </MenuItem>
                    ))}
                </TextField>
                <TextField
                    select
                    label="Trạng thái"
                    value={String(isActive)}
                    disabled={self || save.isPending}
                    onChange={(event) =>
                        setActive(event.target.value === "true")
                    }
                >
                    <MenuItem value="true">Hoạt động</MenuItem>
                    <MenuItem value="false">Đã khóa</MenuItem>
                </TextField>
                <Button
                    variant="contained"
                    startIcon={<SaveOutlined />}
                    disabled={
                        self ||
                        save.isPending ||
                        (role === user.role && isActive === user.isActive)
                    }
                    onClick={() => setConfirm(true)}
                    sx={{ alignSelf: "flex-end" }}
                >
                    Lưu thay đổi
                </Button>
            </AdminSection>
            </Box>
            <AdminConfirm
                open={confirm}
                title="Xác nhận thay đổi quyền?"
                description={`${user.email}: ${roleLabels[role]} · ${isActive ? "Hoạt động" : "Đã khóa"}.`}
                danger={!isActive || role === "admin"}
                onClose={() => setConfirm(false)}
                onConfirm={() => save.mutate()}
            />
        </Stack>
    );
}
