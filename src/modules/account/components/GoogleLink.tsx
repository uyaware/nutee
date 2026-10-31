import { useState } from "react";
import { Alert, Paper, Stack, Typography } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import { GoogleSignIn } from "@/modules/auth/components/GoogleSignIn";
import { useProfile } from "@/modules/account/hooks/useProfile";
import { ErrorState, LoadingState } from "@/shared/components/Feedback";

export function GoogleLink() {
    const profile = useProfile();
    const client = useQueryClient();
    const [linkedOwner, setLinkedOwner] = useState<string | null>(null);
    return (
        <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3 } }}>
            <Stack spacing={2}>
                <Typography variant="h3" component="h2">
                    Liên kết Google
                </Typography>
                {profile.isPending ? (
                    <LoadingState />
                ) : profile.isError ? (
                    <ErrorState
                        error={profile.error}
                        retry={() => void profile.refetch()}
                    />
                ) : (
                    <>
                        <Typography color="text.secondary">
                            Dùng Google có email {profile.data.user.email} để
                            đăng nhập vào tài khoản NUTEE này.
                        </Typography>
                        {profile.data.googleLinked ||
                        linkedOwner === profile.data.user.id ? (
                            <Alert severity="success">
                                {linkedOwner === profile.data.user.id
                                    ? "Đã liên kết Google thành công."
                                    : "Tài khoản đã liên kết Google."}
                            </Alert>
                        ) : (
                            <GoogleSignIn
                                mode="link"
                                onSuccess={async (user) => {
                                    await client.cancelQueries({
                                        queryKey: ["session"],
                                    });
                                    client.setQueryData(
                                        ["session", "customer"],
                                        user,
                                    );
                                    setLinkedOwner(user.id);
                                    await client.invalidateQueries({
                                        queryKey: [
                                            "customer",
                                            user.id,
                                            "profile",
                                        ],
                                    });
                                }}
                            />
                        )}
                    </>
                )}
            </Stack>
        </Paper>
    );
}
