import { useState } from "react";
import AddRounded from "@mui/icons-material/AddRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import {
    Alert,
    Button,
    Checkbox,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    IconButton,
    Paper,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { services } from "@/app/services";
import { useProfile } from "@/modules/account/hooks/useProfile";
import { addressInputSchema } from "@/modules/account/model/schemas";
import type { AddressInput } from "@/modules/account/model/schemas";
import type { Address } from "@/modules/account/model/types";
import {
    EmptyState,
    ErrorState,
    LoadingState,
} from "@/shared/components/Feedback";
import { ServiceError } from "@/shared/lib/errors";
import { FormErrorSummary } from "@/shared/components/FormErrorSummary";

function AddressEditor({
    address,
    ownerId,
    close,
}: {
    address: Address | null;
    ownerId: string;
    close: () => void;
}) {
    const client = useQueryClient();
    const {
        register,
        handleSubmit,
        setError,
        control,
        formState: { errors, submitCount },
    } = useForm<AddressInput>({
        resolver: zodResolver(addressInputSchema),
        shouldFocusError: false,
        defaultValues: address ?? {
            street: "",
            wardCommune: "",
            provinceCity: "",
            isDefault: false,
        },
    });
    const save = useMutation({
        mutationFn: (fields: AddressInput) =>
            services.profile.saveAddress(address?.id ?? null, fields),
        onSuccess: async (updated) => {
            client.setQueryData(
                ["customer", updated.user.id, "profile"],
                updated,
            );
            await client.invalidateQueries({
                queryKey: ["customer", ownerId, "profile"],
            });
            close();
        },
        onError: (error) => {
            if (error instanceof ServiceError && error.fieldErrors)
                for (const field of [
                    "street",
                    "wardCommune",
                    "provinceCity",
                ] as const) {
                    if (error.fieldErrors[field])
                        setError(field, { message: error.fieldErrors[field] });
                }
        },
    });
    return (
        <Dialog
            open
            onClose={() => {
                if (!save.isPending) close();
            }}
            fullWidth
            maxWidth="sm"
            aria-labelledby="address-editor-title"
            slotProps={{
                paper: { sx: { maxWidth: 520, borderRadius: 2 } },
                transition: {
                    onEntered: () => {
                        // Initial dialog focus may need moving to the input; preserve focus
                        // if the user already interacted or validation focused the summary.
                        if (
                            document.activeElement?.getAttribute("role") ===
                            "dialog"
                        )
                            document
                                .getElementById("address-provinceCity")
                                ?.focus();
                    },
                },
            }}
        >
            <form
                noValidate
                onSubmit={handleSubmit((fields) => {
                    if (!save.isPending) save.mutate(fields);
                })}
            >
                <DialogTitle
                    id="address-editor-title"
                    sx={{ px: 3, pt: 3, pb: 1 }}
                >
                    {address ? "Sửa địa chỉ" : "Thêm địa chỉ"}
                </DialogTitle>
                <DialogContent sx={{ px: 3, pb: 3 }}>
                    <Stack spacing={2} sx={{ pt: 1 }}>
                        <FormErrorSummary
                            submitCount={submitCount}
                            errors={[
                                ...(
                                    [
                                        "street",
                                        "wardCommune",
                                        "provinceCity",
                                    ] as const
                                ).map((field) => ({
                                    fieldId: `address-${field}`,
                                    message: errors[field]?.message ?? "",
                                })),
                            ].filter((error) => !!error.message)}
                        />
                        {save.isError && <ErrorState error={save.error} />}
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
                                    id={`address-${name}`}
                                    required
                                    {...field}
                                    inputRef={ref}
                                    error={!!errors[name]}
                                    helperText={errors[name]?.message}
                                    autoComplete={autoComplete}
                                    disabled={save.isPending}
                                    slotProps={{
                                        htmlInput: {
                                            maxLength:
                                                name === "street" ? 240 : 255,
                                        },
                                    }}
                                />
                            );
                        })}
                        <Controller
                            name="isDefault"
                            control={control}
                            render={({ field }) => (
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={field.value}
                                            onChange={(_, value) =>
                                                field.onChange(value)
                                            }
                                            onBlur={field.onBlur}
                                            inputRef={field.ref}
                                            disabled={address?.isDefault}
                                        />
                                    }
                                    sx={{ m: 0 }}
                                    label="Đặt làm địa chỉ mặc định"
                                />
                            )}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions
                    sx={{
                        px: 3,
                        py: 2,
                        bgcolor: "background.default",
                        borderTop: "1px solid",
                        borderColor: "divider",
                        gap: 1,
                    }}
                >
                    <Button
                        onClick={close}
                        disabled={save.isPending}
                        color="secondary"
                    >
                        Hủy
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={save.isPending}
                    >
                        {save.isPending ? "Đang lưu…" : "Lưu địa chỉ"}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}

export default function AddressesPage() {
    const client = useQueryClient();
    const profile = useProfile();
    const [edit, setEdit] = useState<{
        address: Address | null;
        ownerId: string;
    } | null>(null);
    const [deleting, setDeleting] = useState<{
        address: Address;
        ownerId: string;
    } | null>(null);
    const action = useMutation({
        mutationFn: ({ id, remove }: { id: string; remove?: boolean }) =>
            remove
                ? services.profile.removeAddress(id)
                : services.profile.setDefaultAddress(id),
        onSuccess: async (updated) => {
            setDeleting(null);
            client.setQueryData(
                ["customer", updated.user.id, "profile"],
                updated,
            );
            await client.invalidateQueries({
                queryKey: ["customer", updated.user.id, "profile"],
            });
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
    const data = profile.data;
    return (
        <Stack spacing={2} sx={{ width: "100%", maxWidth: 800 }}>
            <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                alignItems={{ xs: "flex-start", sm: "center" }}
                justifyContent="space-between"
            >
                <Stack spacing={0.5}>
                    <Typography variant="h2" component="h1">
                        Địa chỉ giao hàng
                    </Typography>
                </Stack>
                <Button
                    variant="contained"
                    startIcon={<AddRounded />}
                    sx={{ flexShrink: 0 }}
                    onClick={() =>
                        setEdit({
                            address: null,
                            ownerId: data.user.id,
                        })
                    }
                >
                    Thêm địa chỉ
                </Button>
            </Stack>
            {action.isError && (
                <ErrorState
                    error={action.error}
                    retry={() => {
                        action.reset();
                        void profile.refetch();
                    }}
                />
            )}
            {action.isSuccess && (
                <Alert severity="success" role="status">
                    Đã cập nhật địa chỉ.
                </Alert>
            )}
            {!data.addresses.length && (
                <EmptyState
                    title="Chưa có địa chỉ"
                    description="Thêm địa chỉ giao hàng đầu tiên."
                />
            )}
            {[...data.addresses]
                .sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
                .map((address) => (
                    <Paper
                        key={address.id}
                        variant="outlined"
                        sx={{
                            overflowWrap: "anywhere",
                            overflow: "hidden",
                            borderColor: address.isDefault
                                ? "primary.main"
                                : "divider",
                            p: 2,
                            display: "grid",
                            gridTemplateColumns: {
                                xs: "minmax(0, 1fr)",
                                sm: "minmax(0, 1fr) auto",
                            },
                            gap: { xs: 1, sm: 2 },
                            alignItems: "start",
                        }}
                    >
                        <Stack spacing={0.75} sx={{ minWidth: 0 }}>
                            <Stack
                                direction="row"
                                useFlexGap
                                flexWrap="wrap"
                                gap={1}
                                alignItems="center"
                            >
                                <Typography component="h2" fontWeight={600}>
                                    {address.recipient}
                                </Typography>
                                {address.isDefault && (
                                    <Chip
                                        size="small"
                                        label="Mặc định"
                                        color="primary"
                                        variant="outlined"
                                        sx={{ height: 24 }}
                                    />
                                )}
                            </Stack>
                            <Typography variant="body2" color="text.secondary">
                                {address.phone}
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={{ lineHeight: 1.6 }}
                            >
                                {address.line}
                            </Typography>
                        </Stack>
                        <Stack
                            direction="row"
                            useFlexGap
                            flexWrap="wrap"
                            gap={0.5}
                            sx={{
                                alignItems: "center",
                                justifyContent: {
                                    xs: "flex-start",
                                    sm: "flex-end",
                                },
                                maxWidth: { sm: 200 },
                            }}
                        >
                            <Button
                                disabled={action.isPending}
                                onClick={() =>
                                    setEdit({
                                        address,
                                        ownerId: data.user.id,
                                    })
                                }
                                aria-label={`Sửa địa chỉ ${address.line}`}
                            >
                                Sửa
                            </Button>
                            {!address.isDefault && (
                                <Button
                                    disabled={action.isPending}
                                    onClick={() =>
                                        action.mutate({ id: address.id })
                                    }
                                    aria-label={`Đặt ${address.line} làm mặc định`}
                                >
                                    Đặt mặc định
                                </Button>
                            )}
                            <IconButton
                                color="error"
                                disabled={action.isPending}
                                onClick={() => {
                                    action.reset();
                                    setDeleting({
                                        address,
                                        ownerId: data.user.id,
                                    });
                                }}
                                aria-label={`Xóa địa chỉ ${address.line}`}
                            >
                                <DeleteOutlineRounded fontSize="small" />
                            </IconButton>
                        </Stack>
                    </Paper>
                ))}
            {edit && edit.ownerId === data.user.id && (
                <AddressEditor
                    key={`${edit.ownerId}:${edit.address?.id ?? "new"}`}
                    address={edit.address}
                    ownerId={edit.ownerId}
                    close={() => setEdit(null)}
                />
            )}
            <Dialog
                open={!!deleting && deleting.ownerId === data.user.id}
                onClose={() => {
                    if (!action.isPending) setDeleting(null);
                }}
                aria-labelledby="delete-address-title"
            >
                <DialogTitle id="delete-address-title">
                    Xóa địa chỉ này?
                </DialogTitle>
                <DialogContent>
                    <Typography>{deleting?.address.line}</Typography>
                    <Typography sx={{ mt: 1 }}>
                        Nếu xóa địa chỉ mặc định, địa chỉ còn lại đầu tiên sẽ
                        thay thế.
                    </Typography>
                    {action.isError && <ErrorState error={action.error} />}
                </DialogContent>
                <DialogActions>
                    <Button
                        disabled={action.isPending}
                        onClick={() => setDeleting(null)}
                    >
                        Hủy
                    </Button>
                    <Button
                        color="error"
                        disabled={action.isPending}
                        onClick={() => {
                            if (deleting)
                                action.mutate({
                                    id: deleting.address.id,
                                    remove: true,
                                });
                        }}
                    >
                        Xác nhận xóa
                    </Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
}
