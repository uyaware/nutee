import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useLocation, useSearchParams } from "react-router-dom";
import type { WorkflowActions } from "../lib/usePrototypeWorkflow";

export function PrototypeWorkflow<S extends string>({
  status,
  actions,
  path = [status],
}: {
  status: S;
  actions: WorkflowActions<S>;
  path?: S[];
}) {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const [selected, setSelected] = useState<{ status: S; label: string } | null>(
    null,
  );
  const [note, setNote] = useState("");
  const available = actions[status] ?? [];
  return (
    <Stack spacing={2}>
      <Typography variant="h3" component="h2">
        Xử lý tiếp theo
      </Typography>
      {available.length ? (
        available.map((action) => (
          <Button
            key={action.status}
            variant={
              action.status === "cancelled" || action.status === "rejected"
                ? "outlined"
                : "contained"
            }
            color={
              action.status === "cancelled" || action.status === "rejected"
                ? "error"
                : "primary"
            }
            onClick={() => {
              setSelected(action);
              setNote("");
            }}
          >
            {action.label}
          </Button>
        ))
      ) : (
        <Typography color="text.secondary">
          Đã kết thúc quy trình xử lý.
        </Typography>
      )}
      <Dialog
        open={!!selected}
        onClose={() => setSelected(null)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="workflow-title"
      >
        <Box
          component="form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!selected || !note.trim()) return;
            const next = new URLSearchParams(params);
            next.set("workflow", selected.status);
            next.set("workflowPath", [...path, selected.status].join(","));
            next.set(`note-${selected.status}`, note.trim());
            setParams(next, { state: location.state });
            setSelected(null);
          }}
        >
          <DialogTitle id="workflow-title">{selected?.label}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Typography color="text.secondary">
                Ghi kết quả hoặc lý do xử lý yêu cầu.
              </Typography>
              <TextField
                autoFocus
                fullWidth
                required
                label="Ghi chú xử lý"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                multiline
                minRows={3}
                slotProps={{ htmlInput: { maxLength: 1000 } }}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setSelected(null)}>Quay lại</Button>
            <Button type="submit" variant="contained" disabled={!note.trim()}>
              Xác nhận
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Stack>
  );
}
