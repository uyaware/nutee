import type { ReactNode } from "react";
import {
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from "@mui/material";

export function RegistrationFrame({
  step,
  children,
}: {
  step: number;
  children: ReactNode;
}) {
  return (
    <Stack spacing={3} sx={{ maxWidth: 640, mx: "auto", py: { xs: 1, md: 3 } }}>
      <Stepper activeStep={step} sx={{ mb: 1 }}>
        <Step>
          <StepLabel>Tạo tài khoản</StepLabel>
        </Step>
        <Step>
          <StepLabel>Thông tin cá nhân</StepLabel>
        </Step>
      </Stepper>
      <Stack spacing={1}>
        <Typography variant="h1">
          {step === 0 ? "Tạo tài khoản NUTEE" : "Hoàn thiện thông tin"}
        </Typography>
        <Typography color="text.secondary">
          {step === 0
            ? "Bắt đầu với email và mật khẩu của bạn."
            : "Thêm tên và số điện thoại để hoàn tất đăng ký. Địa chỉ giao hàng có thể bổ sung sau."}
        </Typography>
      </Stack>
      <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 4 } }}>
        {children}
      </Paper>
    </Stack>
  );
}
