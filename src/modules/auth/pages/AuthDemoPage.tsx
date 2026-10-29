import { Button, Paper, Stack, Typography } from "@mui/material";
import { Link, useSearchParams } from "react-router-dom";
import { safeReturnTo } from "@/modules/auth/model/redirect";

type Mode = "verify-email";
const copy: Record<Mode, { title: string; description: string }> = {
  "verify-email": {
    title: "Xác minh email",
    description:
      "Bạn có thể đăng nhập sau khi tạo tài khoản. Xác minh qua email hiện chưa khả dụng.",
  },
};

export default function AuthDemoPage({ mode }: { mode: Mode }) {
  const [params] = useSearchParams();
  const returnTo = safeReturnTo(params.get("returnTo"), "customer");
  return (
    <Stack spacing={3} sx={{ maxWidth: 640, mx: "auto" }}>
      <Typography variant="h1">{copy[mode].title}</Typography>
      <Typography color="text.secondary">{copy[mode].description}</Typography>
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Button
            component={Link}
            to={`/login?${new URLSearchParams({ returnTo })}`}
            variant="contained"
          >
            Đến đăng nhập
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
}
