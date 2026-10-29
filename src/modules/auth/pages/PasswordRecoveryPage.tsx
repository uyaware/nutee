import { useState } from "react";
import {
  Alert,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Link, useLocation, useSearchParams } from "react-router-dom";
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
  .object({ password: authPasswordSchema, confirmPassword: z.string() })
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
  const location = useLocation();
  const [token] = useState(
    () =>
      new URLSearchParams(location.hash.slice(1)).get("token") ??
      params.get("token") ??
      "",
  );
  const client = useQueryClient();
  const returnTo = safeReturnTo(params.get("returnTo"), "customer");
  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });
  const resetForm = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });
  const forgot = useMutation({
    mutationFn: (email: string) => services.auth.forgotPassword(email),
  });
  const reset = useMutation({
    mutationFn: (password: string) =>
      services.auth.resetPassword(token, password),
    onSuccess: async () => {
      resetForm.reset();
      await services.auth.logout("customer");
      await client.cancelQueries({ queryKey: ["session"] });
      client.setQueryData(["session", "customer"], null);
      client.setQueryData(["session", "backoffice"], null);
    },
  });
  const isReset = mode === "reset-password";
  return (
    <Stack spacing={3} sx={{ maxWidth: 540, mx: "auto" }}>
      <Typography variant="h1">
        {isReset ? "Đặt lại mật khẩu" : "Quên mật khẩu"}
      </Typography>
      <Typography color="text.secondary">
        {isReset
          ? "Nhập mật khẩu mới cho tài khoản của bạn."
          : "Nhập email để nhận liên kết đặt lại mật khẩu."}
      </Typography>
      <Paper variant="outlined" sx={{ p: 3 }}>
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
              helperText={emailForm.formState.errors.email?.message}
            />
            {forgot.isSuccess && (
              <Alert severity="success">{forgot.data.message}</Alert>
            )}
            {forgot.isError && (
              <Alert severity="error">{errorMessage(forgot.error)}</Alert>
            )}
            <Button
              type="submit"
              variant="contained"
              disabled={forgot.isPending}
            >
              {forgot.isPending ? "Đang gửi…" : "Gửi liên kết đặt lại mật khẩu"}
            </Button>
          </Stack>
        ) : reset.isSuccess ? (
          <Alert severity="success">
            Đã đổi mật khẩu. Bạn có thể đăng nhập bằng mật khẩu mới.
          </Alert>
        ) : !/^[A-Za-z0-9_-]{43}$/.test(token) ? (
          <Alert severity="warning">
            Liên kết không hợp lệ. Hãy yêu cầu liên kết đặt lại mật khẩu mới.
          </Alert>
        ) : (
          <Stack
            component="form"
            spacing={2}
            noValidate
            onSubmit={resetForm.handleSubmit((fields) =>
              reset.mutate(fields.password),
            )}
          >
            <PasswordField
              label="Mật khẩu mới"
              autoComplete="new-password"
              {...resetForm.register("password")}
              error={!!resetForm.formState.errors.password}
              helperText={
                resetForm.formState.errors.password?.message ??
                "Ít nhất 12 ký tự, tối đa 72 byte UTF-8."
              }
            />
            <PasswordField
              label="Xác nhận mật khẩu"
              autoComplete="new-password"
              {...resetForm.register("confirmPassword")}
              error={!!resetForm.formState.errors.confirmPassword}
              helperText={resetForm.formState.errors.confirmPassword?.message}
            />
            {reset.isError && (
              <Alert severity="error">{errorMessage(reset.error)}</Alert>
            )}
            <Button
              type="submit"
              variant="contained"
              disabled={reset.isPending}
            >
              {reset.isPending ? "Đang lưu…" : "Lưu mật khẩu mới"}
            </Button>
          </Stack>
        )}
      </Paper>
      {isReset && (
        <Button component={Link} to="/forgot-password">
          Yêu cầu liên kết mới
        </Button>
      )}
      <Button
        component={Link}
        to={`/login?${new URLSearchParams({ returnTo })}`}
      >
        Đến đăng nhập
      </Button>
    </Stack>
  );
}
