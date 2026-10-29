import { Alert, Button, Stack, TextField } from "@mui/material";
import CheckRounded from "@mui/icons-material/CheckRounded";
import {
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { services } from "@/app/services";
import { useLogout, useSession } from "@/modules/auth/hooks/useSession";
import { safeReturnTo } from "@/modules/auth/model/redirect";
import { profileSetupSchema } from "@/modules/account/model/schemas";
import type { ProfileSetupInput } from "@/modules/account/model/schemas";
import { ServiceError } from "@/shared/lib/errors";
import { ErrorState, LoadingState } from "@/shared/components/Feedback";
import { FormErrorSummary } from "@/shared/components/FormErrorSummary";
import { RegistrationFrame } from "@/modules/auth/components/RegistrationFrame";

export default function ProfileSetupPage() {
  const session = useSession("customer");
  const logout = useLogout("customer");
  const client = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const returnTo = safeReturnTo(params.get("returnTo"), "customer");
  const profile = useQuery({
    queryKey: ["customer", session.data?.id, "profile"],
    queryFn: services.profile.get,
  });
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, submitCount },
  } = useForm<ProfileSetupInput>({
    resolver: zodResolver(profileSetupSchema),
    shouldFocusError: false,
    defaultValues: { name: "", phone: "", line: "" },
  });
  const save = useMutation({
    mutationFn: (fields: ProfileSetupInput) =>
      services.profile.completeProfile(fields, profile.data!.revision),
    onSuccess: async (user) => {
      client.setQueryData(["session", "customer"], user);
      await client.invalidateQueries({ queryKey: ["customer"] });
      navigate(returnTo, { replace: true, state: location.state });
    },
    onError: (error) => {
      if (error instanceof ServiceError && error.fieldErrors)
        for (const field of ["name", "phone", "line"] as const)
          if (error.fieldErrors[field])
            setError(field, { message: error.fieldErrors[field] });
    },
  });
  const { ref: nameRef, ...nameField } = register("name");
  const { ref: phoneRef, ...phoneField } = register("phone");
  const { ref: lineRef, ...lineField } = register("line");
  if (profile.isPending) return <LoadingState />;
  if (profile.isError)
    return (
      <ErrorState error={profile.error} retry={() => void profile.refetch()} />
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
          Tài khoản {profile.data.user.email} đã được tạo. Vui lòng hoàn thiện
          thông tin để tiếp tục.
        </Alert>
        <FormErrorSummary
          submitCount={submitCount}
          errors={[
            { fieldId: "setup-name", message: errors.name?.message ?? "" },
            { fieldId: "setup-phone", message: errors.phone?.message ?? "" },
            { fieldId: "setup-line", message: errors.line?.message ?? "" },
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
        <TextField
          label="Địa chỉ giao hàng"
          id="setup-line"
          autoComplete="street-address"
          multiline
          minRows={3}
          {...lineField}
          inputRef={lineRef}
          error={!!errors.line}
          helperText={
            errors.line?.message ??
            "Không bắt buộc. Bạn có thể thêm địa chỉ sau trong tài khoản."
          }
          slotProps={{ htmlInput: { maxLength: 240 } }}
        />
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
          {save.isPending ? "Đang lưu thông tin…" : "Hoàn tất đăng ký"}
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
