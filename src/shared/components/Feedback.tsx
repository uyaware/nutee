import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { errorMessage, ServiceError } from "@/shared/lib/errors";

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
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  if (error instanceof ServiceError && error.code === "NETWORK") return null;

  return (
    <Alert
      severity="error"
      action={
        retry && (
          <Button color="inherit" onClick={retry}>
            Thử lại
          </Button>
        )
      }
    >
      {errorMessage(error)}
    </Alert>
  );
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
