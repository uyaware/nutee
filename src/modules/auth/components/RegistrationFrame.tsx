import type { ReactNode } from "react";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import { Link } from "react-router-dom";
import { Brand } from "@/shared/components/Brand";

/** Bố cục đăng ký customer, dùng cùng nhận diện với trang đăng nhập. */
export function RegistrationFrame({
  children,
  step = 0,
}: {
  children: ReactNode;
  step?: number;
}) {
  return (
    <Box
      component="main"
      id="main-content"
      tabIndex={-1}
      sx={{
        minHeight: "100dvh",
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
      }}
    >
      <Stack
        component="aside"
        justifyContent="space-between"
        sx={{
          display: { xs: "none", md: "flex" },
          bgcolor: "primary.main",
          color: "primary.contrastText",
          p: { md: 6, lg: 9 },
        }}
      >
        <Typography
          sx={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.04em" }}
        >
          NUTEE
        </Typography>
        <Stack spacing={3} sx={{ maxWidth: 480 }}>
          <Typography
            variant="h2"
            component="p"
            sx={{ fontSize: { md: 44, lg: 56 }, lineHeight: 1.2 }}
          >
            Khởi đầu mới,
            <br />
            cùng NUTEE.
          </Typography>
          <Typography sx={{ opacity: 0.85, fontSize: 18 }}>
            Tạo tài khoản của bạn chỉ với email và mật khẩu.
          </Typography>
        </Stack>
        <Typography variant="body2" sx={{ opacity: 0.8 }}>
          Không gian công nghệ của bạn.
        </Typography>
      </Stack>
      <Stack
        spacing={4}
        justifyContent="center"
        sx={{
          width: "100%",
          maxWidth: 580,
          mx: "auto",
          p: { xs: 3, sm: 5, lg: 7 },
          boxSizing: "border-box",
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          gap={2}
        >
          <Brand />
          <Button
            component={Link}
            to="/"
            startIcon={<ArrowBackRounded />}
            color="secondary"
          >
            Trang chủ
          </Button>
        </Stack>
        <Stack spacing={1}>
          <Typography variant="h1">
            {step === 1 ? "Hoàn thiện thông tin" : "Tạo tài khoản NUTEE"}
          </Typography>
          <Typography color="text.secondary">
            Đăng ký tài khoản dành cho khách hàng.
          </Typography>
        </Stack>
        <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3 } }}>
          {children}
        </Paper>
      </Stack>
    </Box>
  );
}
