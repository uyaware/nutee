import { Button, Stack, TextField, Typography } from "@mui/material";
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
  const create = useMutation({
    mutationFn: (fields: RegistrationInput) =>
      services.auth.register(fields.email, fields.password),
    onSuccess: async (user) => {
      reset();
      await client.cancelQueries({ queryKey: ["customer"] });
      client.removeQueries({ queryKey: ["customer"] });
      client.setQueryData(["session", "customer"], user);
      navigate(
        user.profileCompleted === false
          ? `/account/setup?${new URLSearchParams({ returnTo })}`
          : returnTo,
        {
          replace: true,
          state: { cartMergeNotices: user.cartMergeNotices },
        },
      );
    },
    onError: (error) => {
      if (error instanceof ServiceError && error.fieldErrors)
        for (const field of ["email", "password"] as const)
          if (error.fieldErrors[field])
            setError(field, { message: error.fieldErrors[field] });
    },
  });
  const { ref: emailRef, ...emailField } = register("email");
  const { ref: passwordRef, ...passwordField } = register("password");
  const { ref: confirmRef, ...confirmField } = register("confirmPassword");
  if (
    session.data?.profileCompleted !== false &&
    session.data &&
    !create.isPending
  )
    return <Navigate replace to={returnTo} />;
  return (
    <RegistrationFrame step={0}>
      <Stack
        component="form"
        spacing={3}
        noValidate
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
          {...emailField}
          inputRef={emailRef}
          error={!!errors.email}
          helperText={errors.email?.message}
        />
        <PasswordField
          label="Mật khẩu"
          id="registration-password"
          autoComplete="new-password"
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
          {...confirmField}
          inputRef={confirmRef}
          error={!!errors.confirmPassword}
          helperText={errors.confirmPassword?.message}
        />
        {create.isError && <ErrorState error={create.error} />}
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
            to={`/login?${new URLSearchParams({ returnTo })}`}
          >
            Đăng nhập
          </Button>
        </Stack>
        <GoogleSignIn
          onSuccess={async (user) => {
            await client.cancelQueries({ queryKey: ["customer"] });
            client.removeQueries({ queryKey: ["customer"] });
            client.setQueryData(["session", "customer"], user);
            navigate(returnTo, { replace: true });
          }}
        />
      </Stack>
    </RegistrationFrame>
  );
}
