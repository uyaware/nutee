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

export function StorefrontLayout() {
  const location = useLocation();
  const session = useSession("customer");
  const logout = useLogout("customer");
  const state = location.state as { cartMergeNotices?: unknown } | null;
  const mergeNotices = Array.isArray(state?.cartMergeNotices)
    ? state.cartMergeNotices.filter(
        (value): value is string => typeof value === "string",
      )
    : [];
  return (
    <Box sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <StorefrontHeader />
      <Container
        component="main"
        id="main-content"
        tabIndex={-1}
        maxWidth="lg"
        sx={{ py: { xs: 2.5, md: 3 }, flex: 1 }}
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
      <StorefrontFooter />
    </Box>
  );
}
