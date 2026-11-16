import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { services } from "@/app/services";
import { subscribeEmailVerification } from "@/modules/auth/model/verificationEvents";
import { clearPrivateSession } from "@/modules/auth/model/sessionCache";
import { safeReturnTo } from "@/modules/auth/model/redirect";
import { ServiceError } from "@/shared/lib/errors";
import { ErrorState, LoadingState } from "@/shared/components/Feedback";

/** Chặn hiển thị dữ liệu cũ trong khi chuyển từ phiên đầy đủ sang bước xác thực email. */
export function EmailVerificationBoundary({
    children,
}: {
    children: ReactNode;
}) {
    const client = useQueryClient();
    const location = useLocation();
    const navigate = useNavigate();
    const busy = useRef(false);
    const [checking, setChecking] = useState(false);
    const [error, setError] = useState<unknown>(null);
    const retry = useRef<() => void>(() => {});
    useLayoutEffect(() => {
        const handle = () => {
            if (busy.current || location.pathname === "/verify-email") return;
            busy.current = true;
            setChecking(true);
            setError(null);
            const params = new URLSearchParams(location.search);
            const portal =
                location.pathname.startsWith("/management") ||
                params.get("portal") === "backoffice"
                    ? "backoffice"
                    : "customer";
            const returnTo = safeReturnTo(
                params.get("returnTo") ?? location.pathname + location.search,
                portal,
            );
            const query = new URLSearchParams({ returnTo, portal });
            services.auth.clearSession();
            void (async () => {
                await clearPrivateSession(client);
                try {
                    await services.auth.verification();
                    navigate(`/verify-email?${query}`, { replace: true });
                } catch (reason) {
                    if (
                        reason instanceof ServiceError &&
                        reason.code === "UNAUTHORIZED"
                    ) {
                        query.set("reason", "verify-email");
                        navigate(
                            `${portal === "backoffice" ? "/management/login" : "/login"}?${query}`,
                            { replace: true },
                        );
                    } else {
                        setError(reason);
                    }
                } finally {
                    busy.current = false;
                    setChecking(false);
                }
            })();
        };
        retry.current = handle;
        return subscribeEmailVerification(handle);
    }, [client, location.pathname, location.search, navigate]);
    if (checking) return <LoadingState />;
    if (error)
        return <ErrorState error={error} retry={() => retry.current()} />;
    return children;
}
