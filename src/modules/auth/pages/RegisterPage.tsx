import { Button, Divider, Stack, TextField, Typography } from "@mui/material";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registrationSchema } from "@/modules/auth/model/schemas";
import type { RegistrationInput } from "@/modules/auth/model/schemas";
import { services } from "@/app/services";
import { useSession } from "@/modules/auth/hooks/useSession";
import { safeReturnTo } from "@/modules/auth/model/redirect";
import { ServiceError } from "@/shared/lib/errors";
import { ErrorState } from "@/shared/components/Feedback";
import { FormErrorSummary } from "@/shared/components/FormErrorSummary";
import { PasswordField } from "@/shared/components/PasswordField";
import { RegistrationFrame } from "@/modules/auth/components/RegistrationFrame";
import { GoogleSignIn } from "@/modules/auth/components/GoogleSignIn";
import type { User } from "@/modules/auth/model/types";

export default function RegisterPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const session = useSession("customer");
  const returnTo = safeReturnTo(params.get("returnTo"), "customer");
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, submitCount },
  } = useForm<RegistrationInput>({
    resolver: zodResolver(registrationSchema),
    shouldFocusError: false,
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
        spacing={3}
        noValidate
        aria-label="Đăng ký khách hàng"
        aria-busy={create.isPending}
        onSubmit={handleSubmit((fields) => {
          if (!create.isPending) create.mutate(fields);
        })}
      >
        <FormErrorSummary
          submitCount={submitCount}
          errors={[
            {
              fieldId: "registration-email",
              message: errors.email?.message ?? "",
            },
            {
              fieldId: "registration-password",
              message: errors.password?.message ?? "",
            },
            {
              fieldId: "registration-confirm-password",
              message: errors.confirmPassword?.message ?? "",
            },
          ].filter((error) => !!error.message)}
        />
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
          helperText={
            errors.password?.message ??
            "Ít nhất 12 ký tự, tối đa 72 byte UTF-8."
          }
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
