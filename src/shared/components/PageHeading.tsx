import { Stack, Typography } from "@mui/material";

export function PageHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Stack spacing={1}>
      <Typography variant="h2" component="h1">
        {title}
      </Typography>
      <Typography color="text.secondary">{description}</Typography>
    </Stack>
  );
}
