import { useEffect, useState } from "react";
import { Alert, Snackbar } from "@mui/material";
import { toastAppearance, toastPosition } from "@/shared/components/toastStyles";

export function GlobalSuccessToast() {
    const [notice, setNotice] = useState<{ id: number; message: string } | null>(null);
    const [open, setOpen] = useState(false);
    useEffect(() => {
        const show = (event: Event) => {
            setNotice({ id: Date.now(), message: (event as CustomEvent<string>).detail });
            setOpen(true);
        };
        window.addEventListener("nutee:success", show);
        return () => window.removeEventListener("nutee:success", show);
    }, []);
    return <Snackbar key={notice?.id} open={open} autoHideDuration={3000} transitionDuration={250} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} sx={toastPosition} onClose={(_, reason) => { if (reason !== "clickaway") setOpen(false); }}>
        <Alert severity="success" icon={false} onClose={() => setOpen(false)} sx={toastAppearance("success")}>{notice?.message}</Alert>
    </Snackbar>;
}
