import {
    lazy,
    Suspense,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    useSyncExternalStore,
} from "react";
import { Alert, Box, Button } from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/app/services";
import type { Mutation } from "@tanstack/react-query";
import { isSystemError, ServiceError } from "@/shared/lib/errors";
import { GlobalErrorToast } from "@/shared/components/GlobalErrorToast";
import {
    hasReportedSystemError,
    subscribeSystemErrors,
} from "@/shared/lib/systemError";
import { Route, Routes, useLocation } from "react-router-dom";
import { LoadingState } from "@/shared/components/Feedback";
const CustomerRoutes = lazy(() => import("@/app/routes/CustomerRoutes"));
const BackofficeRoutes = lazy(() => import("@/app/routes/BackofficeRoutes"));
const customerTitles: Record<string, string> = {
    "/cart": "Giỏ hàng",
    "/checkout": "Thanh toán",
    "/account/orders": "Đơn hàng của bạn",
    "/account/after-sales": "Bảo hành & đổi trả",
    "/account/after-sales/new": "Tạo yêu cầu hậu mãi",
    "/account/addresses": "Địa chỉ giao hàng",
    "/account/security": "Bảo mật tài khoản",
    "/account/setup": "Hoàn thiện thông tin",
    "/register": "Đăng ký",
    "/verify-email": "Xác minh email",
    "/forgot-password": "Quên mật khẩu",
    "/reset-password": "Đặt lại mật khẩu",
};
const managementTitles: Record<string, string> = {
    "/management": "Tổng quan",
    "/management/orders": "Quản lý đơn hàng",
    "/management/products": "Quản lý sản phẩm",
    "/management/products/new": "Thêm sản phẩm",
    "/management/brands": "Thương hiệu",
    "/management/categories": "Danh mục",
    "/management/promotions": "Khuyến mãi",
    "/management/promotions/new": "Tạo khuyến mãi",
    "/management/users": "Tài khoản",
};

async function checkBackendConnection() {
    try {
        await api.request("/auth/me", { authenticated: false });
    } catch (error) {
        if (
            error instanceof ServiceError &&
            (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN")
        )
            return true;
        throw error;
    }
    return true;
}

export default function App() {
    const location = useLocation();
    useQuery({
        queryKey: ["system", "backend-connection"],
        queryFn: checkBackendConnection,
        meta: { silentErrorToast: true },
        retry: false,
        refetchInterval: 15000,
        refetchOnWindowFocus: "always",
        refetchOnReconnect: "always",
    });
    const client = useQueryClient();
    const queryCache = client.getQueryCache();
    const mutationCache = client.getMutationCache();
    const observedMutations = useRef(new Map<Mutation, number>());
    const alertRef = useRef<HTMLDivElement>(null);
    const [alertHeight, setAlertHeight] = useState(0);
    const hasSystemLoadError = useSyncExternalStore(
        (notify) => queryCache.subscribe(notify),
        () =>
            queryCache
                .getAll()
                .some(
                    (query) =>
                        query.isActive() &&
                        query.state.status === "error" &&
                        isSystemError(query.state.error),
                ),
        () => false,
    );
    const hasSystemMutationError = useSyncExternalStore(
        (notify) =>
            mutationCache.subscribe((event) => {
                const mutation = event.mutation;
                if (mutation && event.type === "observerAdded") {
                    observedMutations.current.set(
                        mutation,
                        (observedMutations.current.get(mutation) ?? 0) + 1,
                    );
                } else if (mutation && event.type === "observerRemoved") {
                    const count = observedMutations.current.get(mutation) ?? 0;
                    if (count <= 1) observedMutations.current.delete(mutation);
                    else observedMutations.current.set(mutation, count - 1);
                }
                notify();
            }),
        () =>
            Array.from(observedMutations.current.keys()).some(
                (mutation) =>
                    mutation.state.status === "error" &&
                    isSystemError(mutation.state.error),
            ),
        () => false,
    );
    const hasReportedError = useSyncExternalStore(
        subscribeSystemErrors,
        hasReportedSystemError,
        () => false,
    );
    const hasSystemError =
        hasSystemLoadError || hasSystemMutationError || hasReportedError;
    useLayoutEffect(() => {
        document.documentElement.style.setProperty(
            "--system-alert-height",
            `${hasSystemError ? alertHeight : 0}px`,
        );
        return () => {
            document.documentElement.style.removeProperty(
                "--system-alert-height",
            );
        };
    }, [alertHeight, hasSystemError]);
    useLayoutEffect(() => {
        const alert = alertRef.current;
        if (!hasSystemError || !alert) return;
        const updateHeight = () =>
            setAlertHeight(alert.getBoundingClientRect().height);
        updateHeight();
        const observer = new ResizeObserver(updateHeight);
        observer.observe(alert);
        return () => observer.disconnect();
    }, [hasSystemError]);
    useEffect(() => {
        const name =
            location.pathname === "/"
                ? "Không gian công nghệ"
                : location.pathname.includes("login")
                  ? "Đăng nhập"
                  : location.pathname.includes("/after-sales")
                    ? location.pathname.startsWith("/management")
                        ? "Yêu cầu"
                        : "Hậu mãi"
                    : location.pathname.startsWith("/management")
                      ? (managementTitles[location.pathname] ??
                        (location.pathname.startsWith("/management/products/")
                            ? "Chỉnh sửa sản phẩm"
                            : location.pathname.startsWith(
                                    "/management/promotions/",
                                )
                              ? "Chi tiết khuyến mãi"
                              : location.pathname.startsWith(
                                      "/management/users/",
                                  )
                                ? "Chi tiết tài khoản"
                                : "Workspace"))
                      : location.pathname === "/products"
                        ? "Sản phẩm"
                        : location.pathname.startsWith("/products/")
                          ? "Chi tiết sản phẩm"
                          : location.pathname.includes("profile")
                            ? "Tài khoản"
                            : location.pathname.endsWith("/payment")
                              ? "Thanh toán QR"
                              : location.pathname.endsWith("/success")
                                ? "Xác nhận đơn hàng"
                                : location.pathname.includes("/review/")
                                  ? "Đánh giá sản phẩm"
                                  : location.pathname.includes("orders")
                                    ? "Đơn hàng"
                                    : "Cửa hàng";
        if (!location.pathname.startsWith("/products/"))
            document.title = `NUTEE · ${customerTitles[location.pathname] ?? name}`;
        document.getElementById("main-content")?.focus({ preventScroll: true });
        window.scrollTo(0, 0);
    }, [location.pathname]);
    return (
        <>
            <Box
                component="a"
                href="#main-content"
                sx={{
                    position: "fixed",
                    left: 16,
                    top: -100,
                    zIndex: 1600,
                    bgcolor: "background.paper",
                    p: 2,
                    "&:focus": { top: 16 },
                }}
            >
                Đi đến nội dung chính
            </Box>
            {hasSystemError && (
                <Alert
                    ref={alertRef}
                    severity="warning"
                    data-testid="system-error-banner"
                    action={
                        <Button
                            color="inherit"
                            onClick={() => {
                                void client.refetchQueries({
                                    type: "active",
                                    predicate: (query) =>
                                        query.state.status === "error",
                                });
                            }}
                        >
                            Thử lại
                        </Button>
                    }
                    sx={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        zIndex: 1400,
                        borderRadius: 0,
                        justifyContent: "center",
                    }}
                >
                    Hệ thống đang gặp sự cố, xin hãy thử lại sau.
                </Alert>
            )}
            <Box
                sx={{
                    "--system-alert-height": `${hasSystemError ? alertHeight : 0}px`,
                    pt: `${hasSystemError ? alertHeight : 0}px`,
                }}
            >
                <Suspense fallback={<LoadingState />}>
                    <Routes>
                        <Route
                            path="/management/*"
                            element={<BackofficeRoutes />}
                        />
                        <Route path="/*" element={<CustomerRoutes />} />
                    </Routes>
                </Suspense>
            </Box>
            <GlobalErrorToast />
        </>
    );
}
