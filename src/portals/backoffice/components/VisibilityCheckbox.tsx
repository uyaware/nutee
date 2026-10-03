import { Checkbox, FormControlLabel } from "@mui/material";

export function VisibilityCheckbox({
  checked,
  onChange,
  name,
  showStatus = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  name: string;
  showStatus?: boolean;
}) {
  return (
    <FormControlLabel
      sx={{ m: 0, "& .MuiFormControlLabel-label": { fontSize: 14 } }}
      label={showStatus && !checked ? "Ẩn" : "Hiển thị"}
      control={
        <Checkbox
          checked={checked}
          onChange={(_, value) => onChange(value)}
          slotProps={{ input: { "aria-label": `Hiển thị ${name}` } }}
          sx={{ minWidth: 44, minHeight: 44 }}
        />
      }
    />
  );
}
