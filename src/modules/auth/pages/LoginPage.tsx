import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Portal } from "@/modules/auth/model/types";
import { services } from "@/app/services";
import { errorMessage, ServiceError } from "@/shared/lib/errors";
import { safeReturnTo } from "@/modules/auth/model/redirect";
import { LandingBackground } from "@/shared/components/LandingBackground";
import { ThemeToggle } from "@/shared/components/ThemeToggle";
import { useCustomerMode } from "@/shared/theme/customerMode";
import { PasswordField } from "@/shared/components/PasswordField";
import { GoogleSignIn } from "@/modules/auth/components/GoogleSignIn";
import type { User } from "@/modules/auth/model/types";

const schema = z.object({
  email: z.email("Nhập địa chỉ email hợp lệ."),
  password: z.string().min(1, "Nhập mật khẩu."),
});
type Fields = z.infer<typeof schema>;
export function LoginPage({ portal }: { portal: Portal }) {
  const management = portal === "backoffice";
  const { mode } = useCustomerMode();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const client = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Fields>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });
  const onSignedIn = async (user: User) => {
    await client.cancelQueries({ queryKey: ["session"] });
    client.setQueryData(["session", portal], user);
    const returnTo = safeReturnTo(params.get("returnTo"), portal);
    navigate(returnTo, { replace: true });
  };
  const login = useMutation({
    mutationFn: (fields: Fields) =>
      services.auth.login(portal, fields.email, fields.password),
    onSuccess: onSignedIn,
  });
  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "grid",
        gridTemplateColumns: "1fr",
        position: "relative", backgroundColor: mode === "dark" ? "#0b0d12" : "#fafafa", color: "text.primary",
      }}
    >
      <LandingBackground />
      <Box sx={{
          position: "fixed", right: { xs: 16, sm: 24 }, bottom: { xs: 16, sm: 24 }, zIndex: 10,
          "& .MuiIconButton-root": {
            width: 48, height: 48,
            color: mode === "dark" ? "#fff4c2" : "#17336a",
            bgcolor: mode === "dark" ? "#273655" : "#fff",
            border: "1px solid", borderColor: mode === "dark" ? "#829bc5" : "#aabbd8",
            boxShadow: 3,
            "&:hover": { bgcolor: mode === "dark" ? "#394f78" : "#e8efff" },
          },
        }}>
          <ThemeToggle />
        </Box>
      <Stack
        component="main"
        id="main-content"
        tabIndex={-1}
        sx={{
          px: { xs: 3, sm: 6 },
          py: 5,
          maxWidth: 600,
          width: "100%",
          mx: "auto",
          justifyContent: "center",
          position: "relative",
        }}
        spacing={3}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
          useFlexGap
          flexWrap="wrap"
        >
          <Button component={Link} to="/" startIcon={<ArrowBackRounded />}>
            Về trang chủ
          </Button>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Button component={Link} to={management ? "/login" : "/management/login"} endIcon={<ArrowForwardRounded />}>
              {management ? "Store" : "Backoffice"}
            </Button>
          </Stack>
        </Stack>
        <Paper variant="outlined" sx={{ p: { xs: 3, sm: 4 }, borderRadius: 2 }}>
        <Stack spacing={3}>
        <Box>
          <Typography variant="h2" component="h1">
            Đăng nhập
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            {management
              ? "Dành cho nhân viên và quản lý cửa hàng"
              : "Dành cho khách hàng"}
          </Typography>
        </Box>
        <Stack
          component="form"
          onSubmit={handleSubmit((fields) => login.mutate(fields))}
          noValidate
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
            ...(mode === "dark" && {
              "& .MuiInputLabel-root:not(.Mui-error)": { color: "#aebbd0" },
            }),
            // Paint over the browser autofill background without disabling autofill.
            "& input:is(:-webkit-autofill, :autofill)": {
              WebkitBoxShadow: `0 0 0 1000px ${mode === "dark" ? "#171e2b" : theme.palette.background.paper} inset`,
              boxShadow: `0 0 0 1000px ${mode === "dark" ? "#171e2b" : theme.palette.background.paper} inset`,
              WebkitTextFillColor: theme.palette.text.primary,
              caretColor: theme.palette.text.primary,
            },
          })}
        >
          <TextField
            label="Email"
            autoComplete="username"
            type="email"
            {...register("email")}
            error={!!errors.email}
            helperText={errors.email?.message}
          />
          <PasswordField
            label="Mật khẩu"
            autoComplete="current-password"
            {...register("password")}
            error={!!errors.password}
            helperText={errors.password?.message}
          />
          {!management && (
            <Button component={Link} to="/forgot-password" sx={{ px: 1, alignSelf: "flex-start" }}>
              Quên mật khẩu?
            </Button>
          )}
          {login.isError && !(login.error instanceof ServiceError && login.error.code === "NETWORK") && (
            <Alert severity="error">{errorMessage(login.error)}</Alert>
          )}
          <Button
            type="submit"
            variant="contained"
            sx={{
              color: mode === "dark" ? "#e0e6ef" : "#fff", borderRadius: 2,
              background: "linear-gradient(180deg, #3978ed, #1f55c7)",
              border: "1px solid #6197ff", borderBottom: "4px solid #173d94", boxShadow: "none",
              transition: "background 200ms, transform 150ms, border-width 150ms",
              "&:hover": { background: "linear-gradient(180deg, #3270df, #1d4daf)", boxShadow: "none" },
              "&:active": { transform: "translateY(2px)", borderBottomWidth: "2px" },
              "@media (prefers-reduced-motion: reduce)": { transition: "none" },
            }}
            disabled={login.isPending}
            endIcon={<ArrowForwardRounded />}
          >
            {login.isPending ? "Đang đăng nhập…" : "Đăng nhập"}
          </Button>
        </Stack>
        {!management && (
          <GoogleSignIn onSuccess={onSignedIn} />
        )}
        {!management && (
          <Stack direction="row" alignItems="center" justifyContent="center" useFlexGap flexWrap="wrap" columnGap={0.5}>
            <Typography variant="body2" color="text.secondary">Chưa có tài khoản?</Typography>
            <Button
              component={Link}
              sx={{ px: 1 }}
              to={
                params.has("returnTo")
                  ? `/register?${new URLSearchParams({ returnTo: safeReturnTo(params.get("returnTo"), portal) })}`
                  : "/register"
              }
            >
              Tạo tài khoản
            </Button>
          </Stack>
        )}
        </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}
