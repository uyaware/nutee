import { useState } from "react";
import {
    Alert,
    Button,
    Paper,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { services } from "@/app/services";
import { authPasswordSchema } from "@/modules/auth/model/schemas";
import { PasswordField } from "@/shared/components/PasswordField";
import { errorMessage } from "@/shared/lib/errors";
import { safeReturnTo } from "@/modules/auth/model/redirect";

const emailSchema = z.object({ email: z.email("Nhập địa chỉ email hợp lệ.") });
const resetSchema = z
    .object({
        email: z.email("Nhập địa chỉ email hợp lệ."),
        otp: z.string().regex(/^[0-9]{6}$/, "Nhập mã OTP gồm đúng 6 chữ số."),
        password: authPasswordSchema,
        confirmPassword: z.string(),
    })
    .refine((fields) => fields.password === fields.confirmPassword, {
        path: ["confirmPassword"],
        message: "Mật khẩu xác nhận không khớp.",
    });

export default function PasswordRecoveryPage({
    mode,
}: {
    mode: "forgot-password" | "reset-password";
}) {
    const [params] = useSearchParams();
    const [requested, setRequested] = useState(false);
    const [resendAt, setResendAt] = useState(0);
    const client = useQueryClient();
    const returnTo = safeReturnTo(params.get("returnTo"), "customer");
    const emailForm = useForm<z.infer<typeof emailSchema>>({
        resolver: zodResolver(emailSchema),
        defaultValues: { email: "" },
    });
    const resetForm = useForm<z.infer<typeof resetSchema>>({
        resolver: zodResolver(resetSchema),
        defaultValues: {
            email: "",
            otp: "",
            password: "",
            confirmPassword: "",
        },
    });
    const forgot = useMutation({
        mutationFn: (email: string) => services.auth.forgotPassword(email),
        onSuccess: (_, email) => {
            resetForm.setValue("email", email);
            resetForm.setValue("otp", "");
            setRequested(true);
            setResendAt(Date.now() + 60_000);
        },
    });
    const reset = useMutation({
        mutationFn: (fields: z.infer<typeof resetSchema>) =>
            services.auth.resetPassword(
                fields.email,
                fields.otp,
                fields.password,
            ),
        onSuccess: async () => {
            resetForm.reset();
            await services.auth.logout("customer");
            await client.cancelQueries({ queryKey: ["session"] });
            client.setQueryData(["session", "customer"], null);
            client.setQueryData(["session", "backoffice"], null);
        },
    });
    const isReset = mode === "reset-password" || requested;
    return (
        <Stack spacing={3} sx={{ maxWidth: 540, mx: "auto" }}>
            <Paper variant="outlined" sx={{ p: 3 }}>
                <Stack spacing={2}>
                    <Typography
                        variant="h2"
                        component="h1"
                        sx={{ fontSize: { xs: "1.4rem", sm: "1.6rem" } }}
                    >
                        {isReset ? "Đặt lại mật khẩu" : "Quên mật khẩu"}
                    </Typography>
                    <Typography
                        color="text.secondary"
                        sx={{ fontSize: "1rem", lineHeight: 1.65 }}
                    >
                        {isReset
                            ? "Nhập email, mã OTP 6 số trong thư và mật khẩu mới. Mã có hiệu lực 15 phút."
                            : "Nhập email để nhận mã OTP 6 số đặt lại mật khẩu."}
                    </Typography>
                    {!isReset ? (
                        <Stack
                            component="form"
                            spacing={2}
                            noValidate
                            onSubmit={emailForm.handleSubmit((fields) =>
                                forgot.mutate(fields.email),
                            )}
                        >
                            <TextField
                                label="Email"
                                type="email"
                                autoComplete="email"
                                {...emailForm.register("email")}
                                error={!!emailForm.formState.errors.email}
                                helperText={
                                    emailForm.formState.errors.email?.message
                                }
                            />
                            {forgot.isSuccess && (
                                <Alert severity="success">
                                    {forgot.data.message}
                                </Alert>
                            )}
                            {forgot.isError && (
                                <Alert severity="error">
                                    {errorMessage(forgot.error)}
                                </Alert>
                            )}
                            <Button
                                type="submit"
                                variant="contained"
                                disabled={forgot.isPending}
                            >
                                {forgot.isPending ? "Đang gửi…" : "Gửi mã OTP"}
                            </Button>
                        </Stack>
                    ) : reset.isSuccess ? (
                        <Alert severity="success">
                            Đã đổi mật khẩu. Bạn có thể đăng nhập bằng mật khẩu
                            mới.
                        </Alert>
                    ) : (
                        <Stack
                            component="form"
                            spacing={2}
                            noValidate
                            onSubmit={resetForm.handleSubmit((fields) =>
                                reset.mutate(fields),
                            )}
                        >
                            {forgot.isSuccess && (
                                <Alert severity="success">
                                    {forgot.data.message}
                                </Alert>
                            )}
                            {forgot.isError && (
                                <Alert severity="error">
                                    {errorMessage(forgot.error)}
                                </Alert>
                            )}
                            <TextField
                                label="Email"
                                type="email"
                                autoComplete="email"
                                {...resetForm.register("email")}
                                error={!!resetForm.formState.errors.email}
                                helperText={
                                    resetForm.formState.errors.email?.message
                                }
                            />
                            <TextField
                                label="Mã OTP"
                                autoComplete="one-time-code"
                                slotProps={{
                                    htmlInput: {
                                        inputMode: "numeric",
                                        maxLength: 6,
                                        pattern: "[0-9]{6}",
                                    },
                                }}
                                {...resetForm.register("otp")}
                                error={!!resetForm.formState.errors.otp}
                                helperText={
                                    resetForm.formState.errors.otp?.message ??
                                    "Mã chỉ dùng một lần. Tối đa 5 lần nhập sai."
                                }
                            />
                            <Button
                                type="button"
                                disabled={forgot.isPending}
                                onClick={() => {
                                    const email = resetForm.getValues("email");
                                    if (
                                        !emailSchema.safeParse({ email })
                                            .success
                                    ) {
                                        resetForm.setError("email", {
                                            message:
                                                "Nhập địa chỉ email hợp lệ.",
                                        });
                                    } else if (Date.now() < resendAt) {
                                        resetForm.setError("otp", {
                                            message:
                                                "Vui lòng đợi đủ 60 giây trước khi gửi lại mã.",
                                        });
                                    } else {
                                        resetForm.clearErrors("otp");
                                        forgot.mutate(email);
                                    }
                                }}
                            >
                                {forgot.isPending
                                    ? "Đang gửi…"
                                    : "Gửi lại mã OTP"}
                            </Button>
                            <PasswordField
                                label="Mật khẩu mới"
                                autoComplete="new-password"
                                {...resetForm.register("password")}
                                error={!!resetForm.formState.errors.password}
                                helperText={
                                    resetForm.formState.errors.password
                                        ?.message ??
                                    "Ít nhất 12 ký tự, tối đa 72 byte UTF-8."
                                }
                            />
                            <PasswordField
                                label="Xác nhận mật khẩu"
                                autoComplete="new-password"
                                {...resetForm.register("confirmPassword")}
                                error={
                                    !!resetForm.formState.errors.confirmPassword
                                }
                                helperText={
                                    resetForm.formState.errors.confirmPassword
                                        ?.message
                                }
                            />
                            {reset.isError && (
                                <Alert severity="error">
                                    {errorMessage(reset.error)}
                                </Alert>
                            )}
                            <Button
                                type="submit"
                                variant="contained"
                                disabled={reset.isPending}
                            >
                                {reset.isPending
                                    ? "Đang lưu…"
                                    : "Lưu mật khẩu mới"}
                            </Button>
                        </Stack>
                    )}
                </Stack>
            </Paper>
            <Button
                component={Link}
                to={`/login?${new URLSearchParams({ returnTo })}`}
            >
                Đến đăng nhập
            </Button>
        </Stack>
    );
}
