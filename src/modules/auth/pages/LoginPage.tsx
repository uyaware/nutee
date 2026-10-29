import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
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
import type { Portal } from "@/shared/types/database";
import { services } from "@/app/services";
import { errorMessage } from "@/shared/lib/errors";
import { safeReturnTo } from "@/modules/auth/model/redirect";
import { Brand } from "@/shared/components/Brand";
import { PasswordField } from "@/shared/components/PasswordField";
import { GoogleSignIn } from "@/modules/auth/components/GoogleSignIn";
import type { User } from "@/shared/types/database";

const schema = z.object({
  email: z.email("Nhập địa chỉ email hợp lệ."),
  password: z.string().min(1, "Nhập mật khẩu."),
});
type Fields = z.infer<typeof schema>;
export function LoginPage({ portal }: { portal: Portal }) {
  const management = portal === "backoffice";
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const client = useQueryClient();
  const [rememberLogin, setRememberLogin] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Fields>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });
  const onSignedIn = async (user: User & { cartMergeNotices?: string[] }) => {
    await client.cancelQueries({ queryKey: [portal] });
    client.removeQueries({ queryKey: [portal] });
    client.setQueryData(["session", portal], user);
    const returnTo = safeReturnTo(params.get("returnTo"), portal);
    navigate(
      portal === "customer" && user.profileCompleted === false
        ? `/account/setup?${new URLSearchParams({ returnTo })}`
        : returnTo,
      {
        replace: true,
        state: { cartMergeNotices: user.cartMergeNotices },
      },
    );
  };
  const login = useMutation({
    mutationFn: (fields: Fields) =>
      services.auth.login(portal, fields.email, fields.password, rememberLogin),
    onSuccess: onSignedIn,
  });
  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
      }}
    >
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          justifyContent: "space-between",
          p: { md: 6, lg: 9 },
          bgcolor: "secondary.main",
          color: "primary.contrastText",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Chip
          label={management ? "NUTEE / WORKSPACE" : "NUTEE / STORE"}
          sx={{
            color: "inherit",
            border: "1px solid",
            borderColor: "primary.light",
            alignSelf: "flex-start",
          }}
        />
        <Box sx={{ py: 8, position: "relative", zIndex: 1 }}>
          <Typography variant="h1" component="h2">
            {management
              ? "Một không gian.\nVận hành kết nối."
              : "Công nghệ tốt.\nTrải nghiệm tốt hơn."}
          </Typography>
          <Typography sx={{ mt: 3, maxWidth: 430, opacity: 0.85 }}>
            {management
              ? "Theo dõi dữ liệu bán hàng và cộng tác trong một workspace dành riêng cho đội ngũ NUTEE."
              : "Chào mừng bạn đến với không gian công nghệ NUTEE. Những thiết bị cho công việc và cuộc sống mỗi ngày."}
          </Typography>
        </Box>
        <Typography variant="body2">
          {management
            ? "Dành cho nhân viên & quản trị viên"
            : "Dành cho khách hàng"}
        </Typography>
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            width: 420,
            height: 420,
            border: "70px solid",
            borderColor: "primary.main",
            borderRadius: "50%",
            right: -230,
            bottom: 90,
            opacity: 0.6,
          }}
        />
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
          <Brand management={management} />
          <Button component={Link} to="/" startIcon={<ArrowBackRounded />}>
            Về trang chủ
          </Button>
        </Stack>
        <Box>
          <Typography variant="h2" component="h1">
            {management ? "Đăng nhập vận hành" : "Đăng nhập cửa hàng"}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            {management
              ? "Đăng nhập để quản lý cửa hàng NUTEE."
              : "Đăng nhập để quản lý tài khoản và giỏ hàng của bạn."}
          </Typography>
        </Box>
        <Stack
          component="form"
          onSubmit={handleSubmit((fields) => login.mutate(fields))}
          noValidate
          spacing={2}
          sx={(theme) => ({
            "& .MuiOutlinedInput-root": { bgcolor: "background.paper" },
            // Paint over the browser autofill background without disabling autofill.
            "& input:is(:-webkit-autofill, :autofill)": {
              WebkitBoxShadow: `0 0 0 1000px ${theme.palette.background.paper} inset`,
              boxShadow: `0 0 0 1000px ${theme.palette.background.paper} inset`,
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
          <FormControlLabel
            sx={{ m: 0, alignSelf: "flex-start" }}
            control={
              <Checkbox
                checked={rememberLogin}
                onChange={(_, checked) => setRememberLogin(checked)}
                disabled={login.isPending}
                sx={{ width: 44, height: 44 }}
              />
            }
            label="Ghi nhớ đăng nhập"
          />
          {login.isError && (
            <Alert severity="error">{errorMessage(login.error)}</Alert>
          )}
          <Button
            type="submit"
            variant="outlined"
            disabled={login.isPending}
            endIcon={<ArrowForwardRounded />}
          >
            {login.isPending ? "Đang đăng nhập…" : "Đăng nhập"}
          </Button>
        </Stack>
        {!management && (
          <GoogleSignIn remember={rememberLogin} onSuccess={onSignedIn} />
        )}
        {!management && (
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Button
              component={Link}
              to={`/register?${new URLSearchParams({ returnTo: safeReturnTo(params.get("returnTo"), portal) })}`}
            >
              Tạo tài khoản
            </Button>
            <Button component={Link} to="/forgot-password">
              Quên mật khẩu
            </Button>
          </Stack>
        )}
        <Button
          component={Link}
          to={management ? "/login" : "/management/login"}
          color="secondary"
        >
          {management
            ? "Đến đăng nhập khách hàng"
            : "Đến đăng nhập nhân viên / admin"}
        </Button>
      </Stack>
    </Box>
  );
}
