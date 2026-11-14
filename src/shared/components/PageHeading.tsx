import { Stack, Typography, type StackProps } from "@mui/material";

export function PageHeading({
  title,
  description,
  spacing = 1,
}: {
  title: string;
  description: string;
  spacing?: StackProps["spacing"];
}) {
  return (
    <Stack spacing={spacing}>
      <Typography variant="h2" component="h1">
        {title}
      </Typography>
      <Typography color="text.secondary">{description}</Typography>
    </Stack>
  );
}
