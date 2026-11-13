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
                autoHideDuration={6000}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                data-testid="error-toast"
                onClose={(_, reason) => {
                    if (notice && reason !== "clickaway")
                        dismissErrorToast(notice.id);
                }}
            >
                <Alert
                    severity="error"
                    variant="filled"
                    closeText="Đóng thông báo"
                    sx={{
                        maxWidth: 480,
                        "& .MuiAlert-message": {
                            minWidth: 0,
                            overflowWrap: "anywhere",
                        },
                    }}
                    onClose={() => {
                        if (notice) dismissErrorToast(notice.id);
                    }}
                >
                    {notice?.message}
                </Alert>
            </Snackbar>
        </Portal>
    );
}
