import type { SxProps, Theme } from "@mui/material/styles";

export const toastPosition: SxProps<Theme> = {
    left: "auto",
    right: { xs: 16, sm: 24 },
    bottom: { xs: 16, sm: 24 },
};

export function toastAppearance(tone: "success" | "error" | "warning"): SxProps<Theme> {
    const colors = {
        success: { background: "#f0f7f4", border: "#c6dfd2", text: "#24543e" },
        error: { background: "#fcf3f3", border: "#e8cccc", text: "#783c3c" },
        warning: { background: "#fbf7ee", border: "#e8d8b7", text: "#70562c" },
    }[tone];
    return {
        width: { xs: "calc(100vw - 32px)", sm: 360 },
        maxWidth: "100%",
        minHeight: 52,
        display: "flex",
        alignItems: "center",
        bgcolor: colors.background,
        color: colors.text,
        border: "1px solid",
        borderColor: colors.border,
        borderRadius: 2,
        boxShadow: "0 8px 24px rgba(27, 39, 53, 0.12)",
        "& .MuiAlert-message": { minWidth: 0, flex: 1, py: 0.5, overflowWrap: "anywhere" },
        "& .MuiAlert-action": { alignItems: "center", p: 0, m: 0, ml: 1 },
        "& .MuiAlert-action .MuiIconButton-root": { width: 36, height: 36, color: "inherit" },
    };
}
