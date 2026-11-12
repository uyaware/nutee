import { Box, Stack, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import { tokens } from "@/shared/theme/tokens";
export function Brand({
  management = false,
  compact = false,
}: {
  management?: boolean;
  compact?: boolean;
}) {
  return (
    <Stack
      component={Link}
      to={management ? "/management" : "/"}
      aria-label={management ? "NUTEE — Workspace" : "NUTEE — Trang chủ"}
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{ textDecoration: "none", flexShrink: 0 }}
    >
      <Box
        component="img"
        src="/logo_nutee.png"
        alt=""
        sx={{
          width: compact ? { xs: 36, sm: 44 } : 50,
          height: compact ? { xs: 36, sm: 44 } : 50,
          objectFit: "contain",
          borderRadius: 1,
        }}
      />
      <Box sx={{ display: compact ? { xs: "none", sm: "block" } : "block" }}>
        <Typography
          sx={{
            fontSize: 21,
            fontWeight: 800,
            letterSpacing: "-.06em",
            lineHeight: 1.1,
          }}
        >
          <Box component="span" sx={{ color: tokens.color.blue }}>
            NUT
          </Box>
          EE
        </Typography>
        {!compact && (
          <Typography variant="caption" color="text.secondary">
            {management ? "WORKSPACE" : "Không gian công nghệ"}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}
