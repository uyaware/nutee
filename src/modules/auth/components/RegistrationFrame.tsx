import type { ReactNode } from "react";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import { Link } from "react-router-dom";
import { LandingBackground } from "@/shared/components/LandingBackground";
import { ThemeToggle } from "@/shared/components/ThemeToggle";
import { useCustomerMode } from "@/shared/theme/customerMode";

export function RegistrationFrame({ children, step = 0 }: { children: ReactNode; step?: number }) {
  const { mode } = useCustomerMode();
  return (
    <Box sx={{ minHeight: "100dvh", display: "grid", position: "relative", backgroundColor: mode === "dark" ? "#0b0d12" : "#fafafa", color: "text.primary" }}>
      <LandingBackground />
      <Box sx={{
        position: "fixed", right: { xs: 16, sm: 24 }, bottom: { xs: 16, sm: 24 }, zIndex: 10,
        "& .MuiIconButton-root": {
          width: 48, height: 48, color: mode === "dark" ? "#fff4c2" : "#17336a",
          bgcolor: mode === "dark" ? "#273655" : "#fff", border: "1px solid",
          borderColor: mode === "dark" ? "#829bc5" : "#aabbd8", boxShadow: 3,
          "&:hover": { bgcolor: mode === "dark" ? "#394f78" : "#e8efff" },
        },
      }}><ThemeToggle /></Box>
      <Stack component="main" id="main-content" tabIndex={-1} spacing={3} sx={{
        px: { xs: 3, sm: 6 }, py: 5, maxWidth: 600, width: "100%", mx: "auto",
        justifyContent: "center", position: "relative",
      }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} useFlexGap flexWrap="wrap">
          <Button component={Link} to="/" startIcon={<ArrowBackRounded />}>Về trang chủ</Button>
        </Stack>
        <Paper variant="outlined" sx={{ p: { xs: 3, sm: 4 }, borderRadius: 2 }}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h2" component="h1">{step === 1 ? "Hoàn thiện thông tin" : "Tạo tài khoản"}</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>Dành cho khách hàng</Typography>
            </Box>
            {children}
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}
