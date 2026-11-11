import { Box } from "@mui/material";
import { useCustomerMode } from "@/shared/theme/customerMode";

export function LandingBackground() {
  const { mode } = useCustomerMode();
  const dark = mode === "dark";
  return (
    <Box aria-hidden="true" sx={{
      position: "fixed",
      inset: 0,
      pointerEvents: "none",
      backgroundColor: dark ? "#070910" : "#fafbfe",
      backgroundImage: dark ? "radial-gradient(ellipse at 75% 38%, rgba(71, 49, 165, .5), transparent 37%), radial-gradient(ellipse at 22% 82%, rgba(19, 76, 157, .35), transparent 42%), radial-gradient(2px 2px at 20px 30px, rgba(255,255,255,.6) 50%, transparent 100%), radial-gradient(1px 1px at 80px 110px, rgba(168,198,255,.6) 50%, transparent 100%), linear-gradient(rgba(173, 192, 255, .075) 1px, transparent 1px), linear-gradient(90deg, rgba(173, 192, 255, .075) 1px, transparent 1px)" : "radial-gradient(ellipse at 75% 20%, rgba(169, 198, 255, .28), transparent 42%), radial-gradient(ellipse at 20% 35%, rgba(217, 229, 255, .32), transparent 45%)",
      backgroundSize: dark ? "auto, auto, 210px 180px, 260px 240px, 28px 28px, 28px 28px" : "auto, auto",
      ...(!dark && {
        "&::after": {
          content: '""',
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(circle, rgba(70, 93, 130, .35) 2px, transparent 2.4px)",
          backgroundSize: "28px 28px",
          maskImage: "linear-gradient(to bottom, #000, transparent 50%)",
          WebkitMaskImage: "linear-gradient(to bottom, #000, transparent 50%)",
        },
      }),
    }} />
  );
}
