import { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { useLocation, useSearchParams } from "react-router-dom";
import type { WorkflowActions } from "@/shared/lib/usePrototypeWorkflow";

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
            onClick={() => setSelected(action)}
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
        maxWidth="xs"
        aria-labelledby="workflow-title"
      >
        <DialogTitle id="workflow-title">
          {selected ? `${selected.label}?` : ""}
        </DialogTitle>
        <DialogActions sx={{ p: 2 }}>
          <Button autoFocus onClick={() => setSelected(null)}>
            Quay lại
          </Button>
          <Button
            variant="contained"
            color={
              selected?.status === "cancelled" ||
              selected?.status === "rejected"
                ? "error"
                : "primary"
            }
            onClick={() => {
              if (!selected) return;
              const next = new URLSearchParams(params);
              next.set("workflow", selected.status);
              next.set("workflowPath", [...path, selected.status].join(","));
              next.delete(`note-${selected.status}`);
              setParams(next, { state: location.state });
              setSelected(null);
            }}
          >
            Xác nhận
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
