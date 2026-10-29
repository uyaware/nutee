import { useState } from "react";
import { Box, Button, Divider, Paper, Stack, Typography } from "@mui/material";
import LockOutlined from "@mui/icons-material/LockOutlined";
import CheckCircleOutlineRounded from "@mui/icons-material/CheckCircleOutlineRounded";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PasswordField } from "@/shared/components/PasswordField";
import { FormErrorSummary } from "@/shared/components/FormErrorSummary";

const passwordChangeSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Nhập mật khẩu hiện tại.")
      .max(128, "Mật khẩu tối đa 128 ký tự."),
    newPassword: z
      .string()
      .min(8, "Mật khẩu mới cần ít nhất 8 ký tự.")
      .max(128, "Mật khẩu tối đa 128 ký tự."),
    confirmPassword: z
      .string()
      .min(1, "Nhập lại mật khẩu mới.")
      .max(128, "Mật khẩu tối đa 128 ký tự."),
  })
  .refine((fields) => fields.newPassword !== fields.currentPassword, {
    path: ["newPassword"],
    message: "Mật khẩu mới phải khác mật khẩu hiện tại.",
  })
  .refine((fields) => fields.newPassword === fields.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu xác nhận không khớp.",
  });
type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;

export default function SecurityPage() {
  const [complete, setComplete] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, submitCount },
  } = useForm<PasswordChangeInput>({
    resolver: zodResolver(passwordChangeSchema),
    shouldFocusError: false,
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  const { ref: currentRef, ...currentField } = register("currentPassword");
  const { ref: newRef, ...newField } = register("newPassword");
  const { ref: confirmRef, ...confirmField } = register("confirmPassword");

  return (
    <Stack spacing={2.5} sx={{ width: "100%", maxWidth: 680 }}>
      <Stack spacing={0.75}>
        <Typography variant="h2" component="h1">
          Bảo mật tài khoản
        </Typography>
        <Typography color="text.secondary">
          Quản lý mật khẩu đăng nhập của bạn.
        </Typography>
      </Stack>
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        {complete ? (
          <Stack
            spacing={2.5}
            alignItems="center"
            textAlign="center"
            sx={{ p: { xs: 3, sm: 4 }, py: { xs: 4, sm: 5 } }}
          >
            <Box
              sx={{
                p: 2,
                borderRadius: "50%",
                bgcolor: "action.selected",
                display: "flex",
              }}
            >
              <CheckCircleOutlineRounded
                color="success"
                sx={{ fontSize: 44 }}
              />
            </Box>
            <Typography variant="h3" component="h2" role="status">
              Đã hoàn tất
            </Typography>
            <Typography color="text.secondary">
              Bạn có thể tiếp tục quản lý tài khoản của mình.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} gap={1.5}>
              <Button
                component={Link}
                to="/account/profile"
                variant="contained"
              >
                Về hồ sơ
              </Button>
              <Button onClick={() => setComplete(false)} variant="outlined">
                Quay lại bảo mật
              </Button>
            </Stack>
          </Stack>
        ) : (
          <>
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              sx={{ p: { xs: 2.5, sm: 3 } }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 1,
                  bgcolor: "action.selected",
                  color: "primary.main",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <LockOutlined aria-hidden="true" />
              </Box>
              <Typography variant="h3" component="h2">
                Đổi mật khẩu
              </Typography>
            </Stack>
            <Divider />
            <Stack
              component="form"
              noValidate
              onSubmit={handleSubmit(() => {
                // Prototype confirmation only: credentials never enter storage or the URL.
                reset();
                setComplete(true);
              })}
              spacing={0}
            >
              <Stack spacing={2.5} sx={{ p: { xs: 2.5, sm: 3 } }}>
                <FormErrorSummary
                  submitCount={submitCount}
                  errors={[
                    {
                      fieldId: "security-current-password",
                      message: errors.currentPassword?.message ?? "",
                    },
                    {
                      fieldId: "security-new-password",
                      message: errors.newPassword?.message ?? "",
                    },
                    {
                      fieldId: "security-confirm-password",
                      message: errors.confirmPassword?.message ?? "",
                    },
                  ].filter((error) => !!error.message)}
                />
                <PasswordField
                  id="security-current-password"
                  label="Mật khẩu hiện tại"
                  autoComplete="current-password"
                  {...currentField}
                  inputRef={currentRef}
                  error={!!errors.currentPassword}
                  helperText={errors.currentPassword?.message}
                  slotProps={{ htmlInput: { maxLength: 128 } }}
                />
                <PasswordField
                  id="security-new-password"
                  label="Mật khẩu mới"
                  autoComplete="new-password"
                  {...newField}
                  inputRef={newRef}
                  error={!!errors.newPassword}
                  helperText={
                    errors.newPassword?.message ?? "Sử dụng từ 8 đến 128 ký tự."
                  }
                  slotProps={{ htmlInput: { maxLength: 128 } }}
                />
                <PasswordField
                  id="security-confirm-password"
                  label="Xác nhận mật khẩu mới"
                  autoComplete="new-password"
                  {...confirmField}
                  inputRef={confirmRef}
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword?.message}
                  slotProps={{ htmlInput: { maxLength: 128 } }}
                />
              </Stack>
              <Divider />
              <Stack
                direction="row"
                justifyContent="flex-end"
                gap={1.5}
                sx={{ p: { xs: 2.5, sm: 3 } }}
              >
                <Button color="secondary" onClick={() => reset()}>
                  Hủy
                </Button>
                <Button type="submit" variant="contained">
                  Đổi mật khẩu
                </Button>
              </Stack>
            </Stack>
          </>
        )}
      </Paper>
    </Stack>
  );
}
