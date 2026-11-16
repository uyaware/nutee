import { useEffect, useState } from "react";
import { Alert, Button, Stack, TextField, Typography } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { services } from "@/app/services";
import { RegistrationFrame } from "@/modules/auth/components/RegistrationFrame";
import { clearPrivateSession } from "@/modules/auth/model/sessionCache";
import { safeReturnTo } from "@/modules/auth/model/redirect";
import { useLogout } from "@/modules/auth/hooks/useSession";
import { ErrorState, LoadingState } from "@/shared/components/Feedback";
import { ServiceError } from "@/shared/lib/errors";

export default function VerifyEmailPage() {
    const [params] = useSearchParams();
    const portal =
        params.get("portal") === "backoffice" ? "backoffice" : "customer";
    const navigate = useNavigate();
    const client = useQueryClient();
    const [otp, setOtp] = useState("");
    const [now, setNow] = useState(Date.now);
    const pending = useQuery({
        queryKey: ["verification"],
        queryFn: () => services.auth.verification(),
        staleTime: 0,
        retry: false,
        refetchOnWindowFocus: false,
    });
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);
    const resend = useMutation({
        mutationFn: () => services.auth.resendVerification(),
        onSuccess: (state) => {
            setOtp("");
            client.setQueryData(["verification"], state);
        },
    });
    const confirm = useMutation({
        mutationFn: () => services.auth.verifyEmail(otp),
        onSuccess: async (user) => {
            await clearPrivateSession(client);
            const targetPortal =
                user.role === "customer" ? "customer" : "backoffice";
            client.setQueryData(["session", targetPortal], user);
            navigate(safeReturnTo(params.get("returnTo"), targetPortal), {
                replace: true,
            });
        },
    });
    const logout = useLogout(portal);
    const login = `${portal === "backoffice" ? "/management/login" : "/login"}?${new URLSearchParams({ returnTo: safeReturnTo(params.get("returnTo"), portal), reason: "verify-email" })}`;
    const state = pending.data;
    const elapsed = Math.max(
        0,
        Math.floor((now - pending.dataUpdatedAt) / 1000),
    );
    const resendAfter = Math.max(0, (state?.resendAfter ?? 0) - elapsed);
    const expired = !!state && elapsed >= state.expiresIn;
    const unauthorized = [pending.error, resend.error, confirm.error].some(
        (error) =>
            error instanceof ServiceError && error.code === "UNAUTHORIZED",
    );
    if (expired || unauthorized) return <Navigate replace to={login} />;
    return (
        <RegistrationFrame
            title="Xác thực email"
            subtitle="Hoàn tất xác thực để sử dụng tài khoản"
        >
            {pending.isPending ? (
                <LoadingState />
            ) : pending.isError ? (
                <ErrorState
                    error={pending.error}
                    retry={() => void pending.refetch()}
                />
            ) : (
                state && (
                    <Stack spacing={2}>
                        <Typography>
                            Mã xác thực được gửi đến{" "}
                            <strong>{state.email}</strong>.
                        </Typography>
                        <Alert
                            severity={
                                state.mailSent || state.resendAfter > 0
                                    ? "info"
                                    : "warning"
                            }
                        >
                            {state.message}
                        </Alert>
                        <Stack
                            component="form"
                            spacing={2}
                            onSubmit={(event) => {
                                event.preventDefault();
                                if (
                                    /^[0-9]{6}$/.test(otp) &&
                                    !confirm.isPending
                                )
                                    confirm.mutate();
                            }}
                        >
                            <TextField
                                label="Mã OTP 6 số"
                                value={otp}
                                onChange={(event) =>
                                    setOtp(
                                        event.target.value
                                            .replace(/\D/g, "")
                                            .slice(0, 6),
                                    )
                                }
                                autoComplete="one-time-code"
                                disabled={confirm.isPending || resend.isPending}
                                slotProps={{
                                    htmlInput: {
                                        inputMode: "numeric",
                                        maxLength: 6,
                                        pattern: "[0-9]{6}",
                                    },
                                }}
                                helperText="Mã có hiệu lực 15 phút, chỉ dùng một lần. Tối đa 5 lần nhập sai."
                            />
                            {confirm.isError && (
                                <ErrorState error={confirm.error} />
                            )}
                            <Button
                                type="submit"
                                variant="contained"
                                disabled={
                                    !/^[0-9]{6}$/.test(otp) ||
                                    confirm.isPending ||
                                    resend.isPending
                                }
                            >
                                {confirm.isPending
                                    ? "Đang xác thực…"
                                    : "Xác thực email"}
                            </Button>
                        </Stack>
                        {resend.isError && <ErrorState error={resend.error} />}
                        <Button
                            disabled={
                                resendAfter > 0 ||
                                resend.isPending ||
                                confirm.isPending
                            }
                            onClick={() => resend.mutate()}
                        >
                            {resend.isPending
                                ? "Đang gửi…"
                                : resendAfter > 0
                                  ? `Gửi lại mã sau ${resendAfter}s`
                                  : "Gửi lại mã OTP"}
                        </Button>
                        {logout.isError && <ErrorState error={logout.error} />}
                        <Button
                            disabled={
                                logout.isPending ||
                                confirm.isPending ||
                                resend.isPending
                            }
                            onClick={() =>
                                logout.mutate(undefined, {
                                    onSuccess: () =>
                                        navigate(login, { replace: true }),
                                })
                            }
                        >
                            Đăng xuất / Dùng tài khoản khác
                        </Button>
                    </Stack>
                )
            )}
        </RegistrationFrame>
    );
}
