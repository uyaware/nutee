import { Alert, Button, Stack, TextField } from "@mui/material";
import CheckRounded from "@mui/icons-material/CheckRounded";
import {
    Navigate,
    useLocation,
    useNavigate,
    useSearchParams,
} from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { services } from "@/app/services";
import { useLogout } from "@/modules/auth/hooks/useSession";
import { useProfile } from "@/modules/account/hooks/useProfile";
import { safeReturnTo } from "@/modules/auth/model/redirect";
import { profileSetupSchema } from "@/modules/account/model/schemas";
import type { ProfileSetupInput } from "@/modules/account/model/schemas";
import { ServiceError } from "@/shared/lib/errors";
import { ErrorState, LoadingState } from "@/shared/components/Feedback";
import { FormErrorSummary } from "@/shared/components/FormErrorSummary";
import { RegistrationFrame } from "@/modules/auth/components/RegistrationFrame";

export default function ProfileSetupPage() {
    const logout = useLogout("customer");
    const client = useQueryClient();
    const navigate = useNavigate();
    const location = useLocation();
    const [params] = useSearchParams();
    const returnTo = safeReturnTo(params.get("returnTo"), "customer");
    const profile = useProfile();
    const {
        register,
        handleSubmit,
        setError,
        formState: { errors, submitCount },
    } = useForm<ProfileSetupInput>({
        resolver: zodResolver(profileSetupSchema),
        shouldFocusError: false,
        defaultValues: {
            name: "",
            phone: "",
            street: "",
            wardCommune: "",
            provinceCity: "",
        },
    });
    const save = useMutation({
        mutationFn: (fields: ProfileSetupInput) =>
            services.profile.completeProfile(fields),
        onSuccess: async (updated) => {
            await client.cancelQueries({ queryKey: ["session"] });
            client.setQueryData(["session", "customer"], updated.user);
            client.setQueryData(
                ["customer", updated.user.id, "profile"],
                updated,
            );
            navigate(returnTo, { replace: true, state: location.state });
        },
        onError: (error) => {
            if (error instanceof ServiceError && error.fieldErrors)
                for (const field of [
                    "name",
                    "phone",
                    "street",
                    "wardCommune",
                    "provinceCity",
                ] as const)
                    if (error.fieldErrors[field])
                        setError(field, { message: error.fieldErrors[field] });
        },
    });
    const { ref: nameRef, ...nameField } = register("name");
    const { ref: phoneRef, ...phoneField } = register("phone");
    if (profile.isPending) return <LoadingState />;
    if (profile.isError)
        return (
            <ErrorState
                error={profile.error}
                retry={() => void profile.refetch()}
            />
        );
    if (profile.data.user.profileCompleted !== false && !save.isPending)
        return <Navigate replace to={returnTo} />;
    return (
        <RegistrationFrame step={1}>
            <Stack
                component="form"
                noValidate
                spacing={3}
                onSubmit={handleSubmit((fields) => {
                    if (!save.isPending) save.mutate(fields);
                })}
            >
                <Alert severity="success" role="status">
                    Tài khoản {profile.data.user.email} đã được tạo. Vui lòng
                    hoàn thiện thông tin để tiếp tục.
                </Alert>
                <FormErrorSummary
                    submitCount={submitCount}
                    errors={[
                        {
                            fieldId: "setup-name",
                            message: errors.name?.message ?? "",
                        },
                        {
                            fieldId: "setup-phone",
                            message: errors.phone?.message ?? "",
                        },
                        ...(
                            ["street", "wardCommune", "provinceCity"] as const
                        ).map((field) => ({
                            fieldId: `setup-${field}`,
                            message: errors[field]?.message ?? "",
                        })),
                    ].filter((error) => !!error.message)}
                />
                <TextField
                    label="Họ và tên"
                    id="setup-name"
                    autoComplete="name"
                    required
                    {...nameField}
                    inputRef={nameRef}
                    error={!!errors.name}
                    helperText={errors.name?.message}
                    slotProps={{ htmlInput: { maxLength: 80 } }}
                />
                <TextField
                    label="Số điện thoại"
                    id="setup-phone"
                    autoComplete="tel"
                    type="tel"
                    required
                    {...phoneField}
                    inputRef={phoneRef}
                    error={!!errors.phone}
                    helperText={errors.phone?.message ?? "Ví dụ: 0912345678"}
                />
                <Alert severity="info">
                    Địa chỉ giao hàng không bắt buộc. Nếu thêm ngay, hãy điền đủ
                    tỉnh/thành phố, phường/xã và số nhà, tên đường.
                </Alert>
                {(
                    [
                        {
                            name: "provinceCity",
                            label: "Tỉnh/Thành phố",
                            autoComplete: "address-level1",
                        },
                        {
                            name: "wardCommune",
                            label: "Phường/Xã",
                            autoComplete: "address-level2",
                        },
                        {
                            name: "street",
                            label: "Số nhà, tên đường",
                            autoComplete: "street-address",
                        },
                    ] as const
                ).map(({ name, label, autoComplete }) => {
                    const { ref, ...field } = register(name);
                    return (
                        <TextField
                            key={name}
                            label={label}
                            id={`setup-${name}`}
                            {...field}
                            inputRef={ref}
                            error={!!errors[name]}
                            helperText={errors[name]?.message}
                            autoComplete={autoComplete}
                            slotProps={{
                                htmlInput: {
                                    maxLength: name === "street" ? 240 : 255,
                                },
                            }}
                        />
                    );
                })}
                {save.isError && (
                    <ErrorState
                        error={save.error}
                        retry={() => {
                            save.reset();
                            void profile.refetch();
                        }}
                    />
                )}
                <Button
                    type="submit"
                    variant="contained"
                    disabled={save.isPending || logout.isPending}
                    endIcon={<CheckRounded />}
                >
                    {save.isPending
                        ? "Đang lưu thông tin…"
                        : "Hoàn tất đăng ký"}
                </Button>
                <Button
                    onClick={() => logout.mutate()}
                    disabled={save.isPending || logout.isPending}
                >
                    Đăng xuất
                </Button>
                {logout.isError && <ErrorState error={logout.error} />}
            </Stack>
        </RegistrationFrame>
    );
}
