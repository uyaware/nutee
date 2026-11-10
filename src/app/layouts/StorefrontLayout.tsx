import {
  Alert,
  Box,
  Button,
  Container,
  Stack,
  Typography,
} from "@mui/material";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useLogout, useSession } from "@/modules/auth/hooks/useSession";
import { ErrorState, LoadingState } from "@/shared/components/Feedback";
import { StorefrontHeader } from "@/app/layouts/components/StorefrontHeader";
import { StorefrontFooter } from "@/app/layouts/components/StorefrontFooter";
import { CharacterBackground } from "@/shared/components/CharacterBackground";
import { useCustomerMode } from "@/shared/theme/customerMode";

export function StorefrontLayout() {
  const location = useLocation();
  const home = location.pathname === "/";
  const { mode } = useCustomerMode();
  const dark = mode === "dark";
  const session = useSession("customer");
  const logout = useLogout("customer");
  const state = location.state as { cartMergeNotices?: unknown } | null;
  const mergeNotices = Array.isArray(state?.cartMergeNotices)
    ? state.cartMergeNotices.filter(
        (value): value is string => typeof value === "string",
      )
    : [];
  return (
    <Box sx={{
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      backgroundColor: dark ? "#0b0d12" : "#fafafa",
      position: "relative",
    }}>
      {home && (
        <Box aria-hidden="true" sx={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          backgroundColor: dark ? "#070910" : "#fafbfe",
          backgroundImage: dark ? "radial-gradient(ellipse at 75% 38%, rgba(71, 49, 165, .5), transparent 37%), radial-gradient(ellipse at 22% 82%, rgba(19, 76, 157, .35), transparent 42%), radial-gradient(2px 2px at 20px 30px, rgba(255,255,255,.6) 50%, transparent 100%), radial-gradient(1px 1px at 80px 110px, rgba(168,198,255,.6) 50%, transparent 100%), linear-gradient(rgba(173, 192, 255, .075) 1px, transparent 1px), linear-gradient(90deg, rgba(173, 192, 255, .075) 1px, transparent 1px)" : "radial-gradient(ellipse at 75% 20%, rgba(169, 198, 255, .28), transparent 42%), radial-gradient(ellipse at 20% 35%, rgba(217, 229, 255, .32), transparent 45%)",
          backgroundSize: dark ? "auto, auto, 210px 180px, 260px 240px, 28px 28px, 28px 28px" : "auto, auto",
          ...(!dark && {
            "&::after": {
              content: '""',
              position: "absolute",
              inset: 0,
              backgroundImage: "radial-gradient(circle, rgba(70, 93, 130, .35) 2px, transparent 2.4px)",
              backgroundSize: "28px 28px",
              maskImage: "linear-gradient(to bottom, #000, transparent 50%)",
              WebkitMaskImage: "linear-gradient(to bottom, #000, transparent 50%)",
            },
          }),
        }} />
      )}
      {!home && <CharacterBackground />}
      <StorefrontHeader />
      <Container
        component="main"
        id="main-content"
        tabIndex={-1}
        maxWidth="lg"
        sx={{ pt: home ? 0 : { xs: 2.5, md: 3 }, pb: { xs: 2.5, md: 3 }, flex: 1, position: "relative", color: "text.primary", "& .MuiOutlinedInput-root": { backgroundColor: "background.paper" } }}
      >
        {session.isError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Không đọc được phiên khách hàng.{" "}
            <Button onClick={() => logout.mutate()}>Xóa phiên này</Button>
          </Alert>
        )}
        {logout.isError && <ErrorState error={logout.error} />}
        {!!mergeNotices.length && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Stack spacing={1}>
              {mergeNotices.map((notice, index) => (
                <Typography key={index}>{notice}</Typography>
              ))}
              <Button component={Link} to="/cart">
                Kiểm tra giỏ hàng
              </Button>
            </Stack>
          </Alert>
        )}
        {session.isPending ? <LoadingState /> : <Outlet />}
      </Container>
      <StorefrontFooter dark={dark} />
    </Box>
  );
}
