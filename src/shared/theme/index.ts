import { alpha, createTheme } from "@mui/material/styles";
import type { ThemeOptions } from "@mui/material/styles";
import { tokens } from "@/shared/theme/tokens";

const base: ThemeOptions = {
  cssVariables: true,
  palette: {
    primary: {
      main: tokens.color.blue,
      light: tokens.color.electric,
      dark: tokens.color.deepBlue,
      contrastText: tokens.color.surface,
    },
    secondary: {
      main: tokens.color.charcoal,
      contrastText: tokens.color.surface,
    },
    background: { default: tokens.color.canvas, paper: tokens.color.surface },
    text: { primary: tokens.color.ink, secondary: tokens.color.muted },
    divider: tokens.color.border,
    success: { main: tokens.color.success },
    warning: { main: tokens.color.warning },
    error: { main: tokens.color.error },
    action: {
      hover: alpha(tokens.color.blue, 0.04),
      selected: alpha(tokens.color.blue, 0.08),
    },
  },
  typography: {
    fontFamily: tokens.typography.family,
    h1: {
      fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
      fontWeight: 700,
      lineHeight: 1.15,
      letterSpacing: "-0.045em",
    },
    h2: {
      fontSize: "clamp(1.25rem, 2.5vw, 1.625rem)",
      fontWeight: 700,
      letterSpacing: "-0.035em",
    },
    h3: { fontSize: "1.125rem", fontWeight: 600 },
    h4: { fontSize: "1rem", fontWeight: 600 },
    body1: { fontSize: tokens.typography.body, lineHeight: 1.6 },
    body2: { fontSize: tokens.typography.small, lineHeight: 1.6 },
    button: {
      textTransform: "none",
      fontWeight: 600,
      fontSize: tokens.typography.small,
    },
  },
  shape: { borderRadius: tokens.radius.small },
  spacing: tokens.spacing.unit,
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: ({ ownerState }) => ({
          minHeight:
            ownerState.size === "large"
              ? tokens.layout.largeControlHeight
              : tokens.layout.controlHeight,
          paddingInline: 16,
          lineHeight: 1.5,
        }),
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          width: tokens.layout.controlHeight,
          height: tokens.layout.controlHeight,
          flexShrink: 0,
          borderRadius: tokens.radius.small,
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { borderRadius: tokens.radius.medium },
        outlined: { borderColor: tokens.color.border },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: `1px solid ${tokens.color.border}`,
          borderRadius: tokens.radius.medium,
        },
      },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: tokens.radius.small } },
    },
    MuiAppBar: { styleOverrides: { root: { borderRadius: 0 } } },
    MuiDrawer: { styleOverrides: { paper: { borderRadius: 0 } } },
    MuiTextField: { defaultProps: { fullWidth: true, size: "small" } },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontSize: tokens.typography.body,
          "@media (max-width: 599.95px)": { fontSize: "1rem" },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: ({ ownerState }) => ({
          fontSize: tokens.typography.body,
          ...(ownerState.variant === "outlined" && !ownerState.shrink
            ? {
                transform: `translate(14px, ${ownerState.size === "small" ? 12 : 16}px) scale(1)`,
              }
            : {}),
        }),
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ ownerState, theme }) => ({
          ...(theme.palette.mode === "dark" ? { backgroundColor: theme.palette.background.paper } : {}),
          ...(ownerState.type === "search" ? { borderRadius: "999px" } : {}),
          ...(ownerState.multiline
            ? { height: "auto", alignItems: "flex-start", padding: "12px 14px" }
            : {
                height:
                  ownerState.size === "small"
                    ? tokens.layout.controlHeight
                    : tokens.layout.largeControlHeight,
              }),
        }),
        input: ({ ownerState }) => ({
          ...(ownerState.multiline
            ? {
                padding: 0,
                height: "auto",
                lineHeight: 1.6,
                boxSizing: "content-box",
              }
            : { height: "100%", boxSizing: "border-box", paddingBlock: 0 }),
        }),
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: { fontSize: tokens.typography.body, minHeight: 44 },
      },
    },
    MuiSelect: {
      styleOverrides: {
        select: { display: "flex", alignItems: "center" },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: { padding: 12, "&:last-child": { paddingBottom: 12 } },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 600, background: tokens.color.canvas },
        root: { borderColor: tokens.color.border },
      },
    },
    MuiLink: { defaultProps: { underline: "hover" } },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          margin: 0,
          backgroundColor: tokens.color.canvas,
          backgroundImage: `linear-gradient(135deg, ${tokens.color.canvas}, ${tokens.color.skyTint})`,
          minHeight: "100dvh",
        },
        "*": { boxSizing: "border-box" },
        ":focus-visible": {
          outline: `3px solid ${tokens.color.blue}`,
          outlineOffset: 3,
        },
        "::selection": { background: tokens.color.blueTint },
        a: { color: "inherit" },
        // Global scroll padding makes Chrome repeatedly scroll when revealing
        // the caret in the sticky navbar. Offset content targets instead.
        "#main-content, #main-content :is(a, button, input, textarea, select, [tabindex], [id])":
          {
            scrollMarginTop: tokens.layout.storefrontMobileHeaderHeight + 16,
            "@media (min-width: 900px)": {
              scrollMarginTop: tokens.layout.storefrontHeaderHeight + 16,
            },
          },
        "@media (prefers-reduced-motion: reduce)": {
          "*, *::before, *::after": {
            animationDuration: "0.01ms !important",
            transitionDuration: "0.01ms !important",
            scrollBehavior: "auto !important",
          },
        },
      },
    },
  },
};
export const storefrontTheme = createTheme(base);
export const customerLightTheme = createTheme({ ...base, cssVariables: false });
export const customerDarkTheme = createTheme(
  { ...base, cssVariables: false },
  {
    palette: {
      mode: "dark",
      primary: { main: "#a9b9d3", light: "#c0cbdd", dark: "#8097ba", contrastText: "#101b30" },
      secondary: { main: "#b3bece", contrastText: "#101b30" },
      background: { default: "#0b0d12", paper: "#171d28" },
      text: { primary: "#d8dee8", secondary: "#adb8c8" },
      divider: "#46556c",
      success: { main: "#65dba8" },
      warning: { main: "#ffd08a" },
      error: { main: "#ff9a9a" },
      action: { hover: "rgba(255,255,255,0.08)", selected: "rgba(168,195,255,0.16)" },
    },
    components: {
      MuiPaper: { styleOverrides: { outlined: { borderColor: "#46556c" } } },
      MuiCard: { styleOverrides: { root: { borderColor: "#46556c" } } },
      MuiTableCell: { styleOverrides: { head: { background: "#202a39" }, root: { borderColor: "#46556c" } } },
    },
  },
);
export const backofficeTheme = createTheme(base, {
  components: {
    MuiTableCell: { styleOverrides: { root: { padding: "14px 16px" } } },
    MuiCard: {
      styleOverrides: { root: { borderRadius: tokens.radius.medium } },
    },
  },
});
