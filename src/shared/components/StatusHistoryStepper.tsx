import { Step, StepLabel, Stepper, Stack, Typography } from "@mui/material";

interface HistoryStep {
  title: string;
  description: string;
  note?: string;
  negative?: boolean;
}

export function StatusHistoryStepper({
  entries,
  finished = false,
  label,
}: {
  entries: HistoryStep[];
  finished?: boolean;
  label: string;
}) {
  return (
    <Stepper
      orientation="vertical"
      activeStep={entries.length - 1}
      aria-label={label}
      sx={{ "& .MuiStepConnector-line": { minHeight: 20 } }}
    >
      {entries.map((entry, index) => (
        <Step
          key={index}
          completed={
            index < entries.length - 1 || (finished && !entry.negative)
          }
        >
          <StepLabel
            error={entry.negative}
            aria-current={index === entries.length - 1 ? "step" : undefined}
            sx={{
              alignItems: "flex-start",
              "& .MuiStepLabel-iconContainer": { pt: 0.5 },
              "& .MuiStepLabel-labelContainer": { minWidth: 0 },
            }}
            optional={
              <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  {entry.description}
                </Typography>
                {entry.note && (
                  <Typography
                    variant="body2"
                    sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                  >
                    {entry.note}
                  </Typography>
                )}
              </Stack>
            }
          >
            <Typography component="span" fontWeight={600}>
              {entry.title}
            </Typography>
          </StepLabel>
        </Step>
      ))}
    </Stepper>
  );
}
