import { Button, Divider, Stack, TextField, Typography } from "@mui/material";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registrationSchema } from "@/modules/auth/model/schemas";
import type { RegistrationInput } from "@/modules/auth/model/schemas";
import { services } from "@/app/services";
import { useCustomerMode } from "@/shared/theme/customerMode";
import { useSession } from "@/modules/auth/hooks/useSession";
import { safeReturnTo } from "@/modules/auth/model/redirect";
import { ServiceError } from "@/shared/lib/errors";
import { ErrorState } from "@/shared/components/Feedback";
import { PasswordField } from "@/shared/components/PasswordField";
import { RegistrationFrame } from "@/modules/auth/components/RegistrationFrame";
import { GoogleSignIn } from "@/modules/auth/components/GoogleSignIn";
import type { User } from "@/modules/auth/model/types";

export default function RegisterPage() {
  const [params] = useSearchParams();
  const { mode } = useCustomerMode();
  const navigate = useNavigate();
  const client = useQueryClient();
  const session = useSession("customer");
  const returnTo = safeReturnTo(params.get("returnTo"), "customer");
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<RegistrationInput>({
    resolver: zodResolver(registrationSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });
  /** Dùng phiên backend vừa cấp để mở hồ sơ hoặc trang đích của khách hàng. */
  const onRegistered = async (user: User) => {
    await client.cancelQueries({ queryKey: ["session"] });
    client.setQueryData(["session", "backoffice"], null);
    client.setQueryData(["session", "customer"], user);
    navigate(returnTo, { replace: true });
  };
  const create = useMutation({
    mutationFn: (fields: RegistrationInput) =>
      services.auth.register(fields.email, fields.password),
    onSuccess: async (user) => {
      reset();
      await onRegistered(user);
    },
    onError: (error) => {
      if (error instanceof ServiceError && error.code === "CONFLICT") {
        setError(
          "email",
          {
            message:
              "Email đã được sử dụng. Vui lòng đăng nhập hoặc dùng email khác.",
          },
          { shouldFocus: true },
        );
        return;
      }
      if (error instanceof ServiceError && error.fieldErrors)
        for (const field of ["email", "password"] as const)
          if (error.fieldErrors[field])
            setError(field, { message: error.fieldErrors[field] });
    },
  });
  const { ref: emailRef, ...emailField } = register("email");
  const { ref: passwordRef, ...passwordField } = register("password");
  const { ref: confirmRef, ...confirmField } = register("confirmPassword");
  if (session.data && !create.isPending)
    return <Navigate replace to={returnTo} />;
  return (
    <RegistrationFrame>
      <Stack
        component="form"
        spacing={2}
        sx={(theme) => ({
          "& .MuiOutlinedInput-root": {
            bgcolor: mode === "dark" ? "#171e2b" : "background.paper",
            ...(mode === "dark" && {
              color: "#e1e7f0",
              "& .MuiOutlinedInput-notchedOutline": { borderColor: "#576780" },
              "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#aebbd0" },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#829bc5" },
              "&.Mui-error .MuiOutlinedInput-notchedOutline": { borderColor: theme.palette.error.main },
              "& .MuiIconButton-root": { color: "#aebbd0" },
            }),
          },
          ...(mode === "dark" && { "& .MuiInputLabel-root:not(.Mui-error)": { color: "#aebbd0" } }),
          "& input:is(:-webkit-autofill, :autofill)": {
            WebkitBoxShadow: `0 0 0 1000px ${mode === "dark" ? "#171e2b" : theme.palette.background.paper} inset`,
            boxShadow: `0 0 0 1000px ${mode === "dark" ? "#171e2b" : theme.palette.background.paper} inset`,
            WebkitTextFillColor: theme.palette.text.primary, caretColor: theme.palette.text.primary,
          },
        })}
        noValidate
        aria-label="Đăng ký khách hàng"
        aria-busy={create.isPending}
        onSubmit={handleSubmit((fields) => {
          if (!create.isPending) create.mutate(fields);
        })}
      >
        <TextField
          label="Email"
          id="registration-email"
          type="email"
          autoComplete="email"
          disabled={create.isPending}
          {...emailField}
          inputRef={emailRef}
          error={!!errors.email}
          helperText={errors.email?.message}
        />
        <PasswordField
          label="Mật khẩu"
          id="registration-password"
          autoComplete="new-password"
          disabled={create.isPending}
          {...passwordField}
          inputRef={passwordRef}
          error={!!errors.password}
          helperText={errors.password?.message}
        />
        <PasswordField
          label="Xác nhận mật khẩu"
          id="registration-confirm-password"
          autoComplete="new-password"
          disabled={create.isPending}
          {...confirmField}
          inputRef={confirmRef}
          error={!!errors.confirmPassword}
          helperText={errors.confirmPassword?.message}
        />
        {create.isError &&
          !(
            create.error instanceof ServiceError &&
            create.error.code === "CONFLICT"
          ) && <ErrorState error={create.error} />}
        <Button
          type="submit"
          variant="contained"
          sx={{
            color: mode === "dark" ? "#e0e6ef" : "#fff", borderRadius: 2, background: "linear-gradient(180deg, #3978ed, #1f55c7)",
            border: "1px solid #6197ff", borderBottom: "4px solid #173d94", boxShadow: "none",
            transition: "background 200ms, transform 150ms, border-width 150ms",
            "&:hover": { background: "linear-gradient(180deg, #3270df, #1d4daf)", boxShadow: "none" },
            "&:active": { transform: "translateY(2px)", borderBottomWidth: "2px" },
            "@media (prefers-reduced-motion: reduce)": { transition: "none" },
          }}
          disabled={create.isPending}
          endIcon={<ArrowForwardRounded />}
        >
          {create.isPending ? "Đang tạo tài khoản…" : "Tạo tài khoản"}
        </Button>
        <Stack
          direction="row"
          justifyContent="center"
          alignItems="center"
          useFlexGap
          flexWrap="wrap"
          gap={1}
        >
          <Typography color="text.secondary">Đã có tài khoản?</Typography>
          <Button
            component={Link}
            to={
              params.has("returnTo")
                ? `/login?${new URLSearchParams({ returnTo })}`
                : "/login"
            }
          >
            Đăng nhập
          </Button>
        </Stack>
        <Divider>hoặc</Divider>
        <GoogleSignIn onSuccess={onRegistered} />
      </Stack>
    </RegistrationFrame>
  );
}
