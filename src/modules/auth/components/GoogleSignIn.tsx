import { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, CircularProgress, Stack } from "@mui/material";
import { services } from "@/app/services";
import type { User } from "@/modules/auth/model/types";
import { errorMessage, ServiceError } from "@/shared/lib/errors";
import { useReportSystemError } from "@/shared/lib/systemError";

type GoogleId = {
    initialize(options: {
        client_id: string;
        nonce: string;
        callback: (result: { credential: string }) => void;
    }): void;
    renderButton(
        element: HTMLElement,
        options: { theme: string; size: string; text: string; locale: string },
    ): void;
};
declare global {
    interface Window {
        google?: { accounts: { id: GoogleId } };
    }
}
let scriptPromise: Promise<GoogleId> | undefined;
function loadGoogle(): Promise<GoogleId> {
    if (window.google) return Promise.resolve(window.google.accounts.id);
    if (!scriptPromise) {
        scriptPromise = new Promise<GoogleId>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://accounts.google.com/gsi/client";
            script.async = true;
            script.onload = () =>
                window.google
                    ? resolve(window.google.accounts.id)
                    : reject(new ServiceError("NETWORK", "Không thể tải Google."));
            script.onerror = () => {
                script.remove();
                reject(new ServiceError("NETWORK", "Không thể tải Google. Vui lòng thử lại."));
            };
            document.head.appendChild(script);
        }).catch((error) => {
            scriptPromise = undefined;
            throw error;
        });
    }
    return scriptPromise;
}

export function GoogleSignIn({
    onSuccess,
    mode = "login",
}: {
    onSuccess: (user: User) => Promise<void>;
    mode?: "login" | "link";
}) {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const container = useRef<HTMLDivElement>(null);
    const latest = useRef({ onSuccess });
    useEffect(() => {
        latest.current = { onSuccess };
    }, [onSuccess]);
    const [attempt, setAttempt] = useState(0);
    const [error, setError] = useState<unknown>(null);
    useReportSystemError(error);
    useEffect(() => {
        if (!(error instanceof ServiceError) || error.code !== "NETWORK") return;
        const timer = setTimeout(() => setAttempt((value) => value + 1), 10000);
        return () => clearTimeout(timer);
    }, [error]);
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        if (!clientId) return;
        let active = true;
        let submitting = false;
        let renewal: ReturnType<typeof setTimeout> | undefined;
        async function prepare() {
            try {
                const google = await loadGoogle();
                if (!active) return;
                const { nonce } = await services.auth.googleNonce();
                if (!active || !container.current) return;
                google.initialize({
                    client_id: clientId,
                    nonce,
                    callback: ({ credential }) => {
                        if (!active || submitting) return;
                        submitting = true;
                        clearTimeout(renewal);
                        setBusy(true);
                        setError(null);
                        void (
                            mode === "link"
                                ? services.auth.linkGoogle(credential)
                                : services.auth.google(credential)
                        )
                            .then((user) => {
                                if (active)
                                    return latest.current.onSuccess(user);
                            })
                            .catch((reason) => {
                                if (active) {
                                    setError(reason);
                                    setAttempt((value) => value + 1);
                                }
                            })
                            .finally(() => {
                                submitting = false;
                                if (active) setBusy(false);
                            });
                    },
                });
                setError(null);
                container.current.replaceChildren();
                google.renderButton(container.current, {
                    theme: "outline",
                    size: "large",
                    text: "continue_with",
                    locale: "vi",
                });
                // Renew the browser nonce before the backend's five-minute cookie expires.
                renewal = setTimeout(
                    () => setAttempt((value) => value + 1),
                    4 * 60 * 1000,
                );
            } catch (reason) {
                if (active) setError(reason);
            }
        }
        void prepare();
        return () => {
            active = false;
            clearTimeout(renewal);
        };
    }, [clientId, attempt, mode]);
    if (!clientId)
        return (
            <Button variant="outlined" disabled>
                {mode === "link" ? "Liên kết Google" : "Đăng nhập với Google"}{" "}
                (chưa khả dụng)
            </Button>
        );
    return (
        <Stack spacing={1}>
            <Box
                ref={container}
                sx={{
                    pointerEvents: busy ? "none" : "auto",
                    opacity: busy ? 0.5 : 1,
                }}
            />
            {busy && (
                <CircularProgress
                    size={22}
                    aria-label={
                        mode === "link"
                            ? "Đang liên kết Google"
                            : "Đang đăng nhập Google"
                    }
                />
            )}
            {!!error && !(error instanceof ServiceError && error.code === "NETWORK") && (
                <Alert
                    severity="error"
                    action={
                        <Button
                            onClick={() => {
                                setError(null);
                                setAttempt((value) => value + 1);
                            }}
                        >
                            Thử lại
                        </Button>
                    }
                >
                    {errorMessage(error)}
                </Alert>
            )}
        </Stack>
    );
}
