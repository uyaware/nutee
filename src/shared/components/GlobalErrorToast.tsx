import { useSyncExternalStore } from "react";
import { Alert, Portal, Snackbar } from "@mui/material";
import {
    currentErrorToast,
    dismissErrorToast,
    subscribeErrorToasts,
} from "@/shared/lib/errorToast";

export function GlobalErrorToast() {
    const notice = useSyncExternalStore(
        subscribeErrorToasts,
        currentErrorToast,
        () => undefined,
    );
    if (!notice) return null;
    return (
        <Portal key={notice.id}>
            <Snackbar
                key={notice?.id}
                open={!!notice}
                autoHideDuration={2000}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                data-testid="error-toast"
                onClose={(_, reason) => {
                    if (notice && reason !== "clickaway")
                        dismissErrorToast(notice.id);
                }}
            >
                <Alert
                    variant="filled"
                    icon={false}
                    sx={{
                        width: { xs: "calc(100vw - 32px)", sm: 360 },
                        maxWidth: "100%",
                        bgcolor: "#1976d2",
                        color: "#fff",
                        alignItems: "center",
                        "& .MuiAlert-message": {
                            minWidth: 0,
                            width: "100%",
                            py: 0.5,
                            overflowWrap: "anywhere",
                        },
                    }}
                >
                    {notice?.message}
                </Alert>
            </Snackbar>
        </Portal>
    );
}
