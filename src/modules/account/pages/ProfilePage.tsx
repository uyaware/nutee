import { useState } from "react";
import {
    Alert,
    Box,
    Button,
    Divider,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import PersonOutlineRounded from "@mui/icons-material/PersonOutlineRounded";
import LocationOnOutlined from "@mui/icons-material/LocationOnOutlined";
import SaveOutlined from "@mui/icons-material/SaveOutlined";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { services } from "@/app/services";
import { useProfile } from "@/modules/account/hooks/useProfile";
import {
    AccountSection,
    AccountSectionActions,
    AccountSectionBody,
} from "@/modules/account/components/AccountSection";
import { PageHeading } from "@/shared/components/PageHeading";
import {
    profileInputSchema,
    type ProfileInput,
} from "@/modules/account/model/schemas";
import { ErrorState, LoadingState } from "@/shared/components/Feedback";

const InsetTextField = styled(TextField)(({ theme }) => ({
    "& .MuiOutlinedInput-root": {
        backgroundColor: theme.palette.background.default,
    },
}));

export default function ProfilePage() {
    const client = useQueryClient();
    const profile = useProfile();
    const [edit, setEdit] = useState<
        (ProfileInput & { ownerId: string }) | null
    >(null);
    const draft = edit?.ownerId === profile.data?.user.id ? edit : null;
    const validation = draft ? profileInputSchema.safeParse(draft) : null;
    const fields =
        validation?.success === false
            ? validation.error.flatten().fieldErrors
            : {};
    const save = useMutation({
        mutationFn: (input: ProfileInput) => services.profile.update(input),
        onSuccess: async (updated) => {
            setEdit(null);
            await client.cancelQueries({ queryKey: ["session"] });
            client.setQueryData(["session", "customer"], updated.user);
            client.setQueryData(
                ["customer", updated.user.id, "profile"],
                updated,
            );
            await client.invalidateQueries({ queryKey: ["session"] });
        },
    });
    if (profile.isPending) return <LoadingState />;
    if (profile.isError)
        return (
            <ErrorState
                error={profile.error}
                retry={() => void profile.refetch()}
            />
        );
    const defaultAddress =
        profile.data.addresses.find((address) => address.isDefault) ??
        profile.data.addresses[0];
    return (
        <Stack spacing={3} sx={{ width: "100%", maxWidth: 680 }}>
            <PageHeading
                title="Hồ sơ cá nhân"
                description="Cập nhật thông tin để NUTEE hỗ trợ bạn tốt hơn."
            />
            <AccountSection
                title="Thông tin tài khoản"
                description="Thông tin liên hệ của bạn tại NUTEE."
                icon={<PersonOutlineRounded aria-hidden="true" />}
                iconVariant="circular"
                headerSpacing={2}
            >
                <Stack
                    spacing={0}
                    component="form"
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (validation?.success && !save.isPending)
                            save.mutate(validation.data);
                    }}
                >
                    <AccountSectionBody>
                        <TextField
                            label="Tên hiển thị"
                            autoComplete="name"
                            value={draft?.name ?? profile.data.user.name}
                            disabled={save.isPending}
                            error={!!fields.name}
                            helperText={fields.name?.[0]}
                            onChange={(event) => {
                                setEdit({
                                    name: event.target.value,
                                    phone:
                                        draft?.phone ?? profile.data.user.phone,
                                    ownerId: profile.data.user.id,
                                });
                                save.reset();
                            }}
                            slotProps={{ htmlInput: { maxLength: 80 } }}
                        />
                        <Box
                            sx={{
                                display: "grid",
                                gridTemplateColumns: {
                                    xs: "minmax(0, 1fr)",
                                    sm: "minmax(0, 1.3fr) minmax(0, 1fr)",
                                },
                                gap: 2,
                            }}
                        >
                            <InsetTextField
                                label="Email"
                                value={profile.data.user.email}
                                slotProps={{ input: { readOnly: true } }}
                                helperText="Email được sử dụng để đăng nhập."
                            />
                            <InsetTextField
                                label="Số điện thoại"
                                value={draft?.phone ?? profile.data.user.phone}
                                disabled={save.isPending}
                                error={!!fields.phone}
                                onChange={(event) => {
                                    setEdit({
                                        name:
                                            draft?.name ??
                                            profile.data.user.name,
                                        phone: event.target.value,
                                        ownerId: profile.data.user.id,
                                    });
                                    save.reset();
                                }}
                                autoComplete="tel"
                                slotProps={{ htmlInput: { maxLength: 12 } }}
                                type="tel"
                                helperText={
                                    fields.phone?.[0] ??
                                    "Số liên hệ của tài khoản (không bắt buộc)."
                                }
                            />
                        </Box>
                        <Divider />
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <LocationOnOutlined
                                color="primary"
                                aria-hidden="true"
                            />
                            <Typography variant="h4" component="h3">
                                Địa chỉ nhận hàng
                            </Typography>
                        </Stack>
                        <InsetTextField
                            label="Địa chỉ mặc định"
                            value={defaultAddress?.line ?? ""}
                            placeholder="Bạn chưa thêm địa chỉ nhận hàng."
                            multiline
                            minRows={3}
                            slotProps={{
                                input: { readOnly: true },
                                inputLabel: { shrink: true },
                            }}
                        />
                        <Button
                            component={Link}
                            to="/account/addresses"
                            sx={{ alignSelf: "flex-start", px: 0 }}
                        >
                            {defaultAddress
                                ? "Chỉnh sửa trong sổ địa chỉ"
                                : "Thêm địa chỉ nhận hàng"}
                        </Button>
                        {save.isError && (
                            <ErrorState
                                error={save.error}
                                retryLabel="Tải lại hồ sơ mới"
                                retry={() => {
                                    setEdit(null);
                                    save.reset();
                                    void profile.refetch();
                                }}
                            />
                        )}
                        {save.isSuccess && (
                            <Alert severity="success">Đã lưu hồ sơ.</Alert>
                        )}
                    </AccountSectionBody>
                    <AccountSectionActions
                        direction={{ xs: "column", sm: "row" }}
                        gap={2}
                        alignItems={{ sm: "center" }}
                        justifyContent="space-between"
                        sx={{
                            bgcolor: "background.default",
                            borderRadius: "0 0 8px 8px",
                        }}
                    >
                        <Typography variant="body2" color="text.secondary">
                            Cập nhật tên hiển thị và số điện thoại của bạn.
                        </Typography>
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={save.isPending || !validation?.success}
                            startIcon={<SaveOutlined />}
                            sx={{
                                alignSelf: { xs: "stretch", sm: "flex-end" },
                                minWidth: 160,
                            }}
                        >
                            {save.isPending ? "Đang lưu…" : "Lưu hồ sơ"}
                        </Button>
                    </AccountSectionActions>
                </Stack>
            </AccountSection>
        </Stack>
    );
}
