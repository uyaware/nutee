import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import { useEffect } from "react";
import { reportErrorToast } from "@/shared/lib/errorToast";
import { useReportSystemError } from "@/shared/lib/systemError";

export function LoadingState() {
    return (
        <Box role="status" sx={{ py: 8, textAlign: "center" }}>
            <CircularProgress size={28} />
            <Typography sx={{ mt: 2 }}>Đang tải dữ liệu…</Typography>
        </Box>
    );
}
export function ErrorState({
    error,
}: {
    error: unknown;
    retry?: () => void;
    retryLabel?: string;
}) {
    useReportSystemError(error);
    useEffect(() => {
        reportErrorToast(error);
    }, [error]);
    return null;
}
export function EmptyState({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <Stack sx={{ p: 5, textAlign: "center" }} spacing={1}>
            <Typography variant="h3" component="h2">
                {title}
            </Typography>
            <Typography color="text.secondary">{description}</Typography>
        </Stack>
    );
}
