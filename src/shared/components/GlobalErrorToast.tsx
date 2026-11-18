import { useSyncExternalStore } from "react";
import { Alert, Portal, Snackbar } from "@mui/material";
import { toastAppearance, toastPosition } from "@/shared/components/toastStyles";
import {
    currentErrorToast,
    dismissErrorToast,
    lastErrorToast,
    subscribeErrorToasts,
} from "@/shared/lib/errorToast";

export function GlobalErrorToast() {
    const notice = useSyncExternalStore(
        subscribeErrorToasts,
        currentErrorToast,
        () => undefined,
    );
    return (
        <Portal>
            <Snackbar
                open={!!notice}
                autoHideDuration={3000}
                transitionDuration={250}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                sx={toastPosition}
                data-testid="error-toast"
                onClose={(_, reason) => {
                    if (notice && reason !== "clickaway")
                        dismissErrorToast(notice.id);
                }}
            >
                <Alert
                    icon={false}
                    onClose={() => { if (notice) dismissErrorToast(notice.id); }}
                    sx={toastAppearance("error")}
                >
                    {(notice ?? lastErrorToast())?.message}
                </Alert>
            </Snackbar>
        </Portal>
    );
}
