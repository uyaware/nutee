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
import { LandingBackground } from "@/shared/components/LandingBackground";
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
        <Box
            sx={{
                minHeight: "100dvh",
                display: "flex",
                flexDirection: "column",
                backgroundColor: dark ? "#0b0d12" : "#fafafa",
                position: "relative",
            }}
        >
            {home && <LandingBackground />}
            {!home && <CharacterBackground />}
            <StorefrontHeader />
            <Container
                component="main"
                id="main-content"
                tabIndex={-1}
                maxWidth="lg"
                sx={{
                    pt: home ? 0 : { xs: 2.5, md: 3 },
                    pb: { xs: 2.5, md: 3 },
                    flex: 1,
                    position: "relative",
                    color: "text.primary",
                    "& .MuiOutlinedInput-root": {
                        backgroundColor: "background.paper",
                    },
                }}
            >
                {session.isError && (
                    <ErrorState
                        error={session.error}
                        retry={() => void session.refetch()}
                    />
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
