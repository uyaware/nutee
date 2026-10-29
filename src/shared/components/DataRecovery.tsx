import { useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
} from "@mui/material";
import RestartAltRounded from "@mui/icons-material/RestartAltRounded";
import DownloadRounded from "@mui/icons-material/DownloadRounded";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { unavailable, unavailableMessage } from "@/shared/api/unavailable";
import { errorMessage } from "@/shared/lib/errors";

export function DataRecovery() {
  const [open, setOpen] = useState(false);
  const [exportError, setExportError] = useState("");
  const client = useQueryClient();
  const navigate = useNavigate();
  const reset = useMutation({
    mutationFn: unavailable,
    onSuccess: async () => {
      await client.cancelQueries();
      client.clear();
      setOpen(false);
      navigate("/", { replace: true });
    },
  });
  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <Button
          variant="outlined"
          startIcon={<DownloadRounded />}
          onClick={() => {
            setExportError(unavailableMessage);
          }}
        >
          Xuất dữ liệu hiện tại
        </Button>
        <Button
          variant="contained"
          color="error"
          startIcon={<RestartAltRounded />}
          onClick={() => {
            reset.reset();
            setOpen(true);
          }}
        >
          Đặt lại dữ liệu
        </Button>
      </Stack>
      {exportError && <Alert severity="error">{exportError}</Alert>}
      <Dialog
        open={open}
        onClose={() => {
          if (!reset.isPending) setOpen(false);
        }}
        aria-labelledby="reset-title"
      >
        <DialogTitle id="reset-title">Đặt lại toàn bộ dữ liệu?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Thay đổi trong cửa hàng và cổng vận hành sẽ bị xóa. Các phiên đăng
            nhập và giỏ khách sẽ được xóa, dữ liệu ban đầu được khôi phục. Dữ
            liệu của ứng dụng khác được giữ nguyên. Bạn có thể xuất dữ liệu
            trước khi tiếp tục.
          </DialogContentText>
          {reset.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {errorMessage(reset.error)}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button disabled={reset.isPending} onClick={() => setOpen(false)}>
            Hủy
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={reset.isPending}
            onClick={() => reset.mutate()}
          >
            {reset.isPending ? "Đang đặt lại…" : "Xác nhận đặt lại"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
