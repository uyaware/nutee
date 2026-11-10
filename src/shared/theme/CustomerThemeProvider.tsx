import { useCallback, useState, type ReactNode } from "react";
import { ThemeProvider } from "@mui/material/styles";
import { customerDarkTheme, customerLightTheme } from "@/shared/theme";
import { CustomerModeContext } from "@/shared/theme/customerMode";

export function CustomerThemeProvider({ children }: { children: ReactNode }) {
    const [mode, setMode] = useState<"light" | "dark">("dark");
    const toggle = useCallback(() => setMode((current) => current === "dark" ? "light" : "dark"), []);
    return (
        <CustomerModeContext.Provider value={{ mode, toggle }}>
            <ThemeProvider theme={() => mode === "dark" ? customerDarkTheme : customerLightTheme}>
                {children}
            </ThemeProvider>
        </CustomerModeContext.Provider>
    );
}
