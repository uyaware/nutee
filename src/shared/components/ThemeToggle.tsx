import { IconButton } from "@mui/material";
import DarkModeOutlined from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlined from "@mui/icons-material/LightModeOutlined";
import { useCustomerMode } from "@/shared/theme/customerMode";

export function ThemeToggle() {
    const { mode, toggle } = useCustomerMode();
    return (
        <IconButton onClick={toggle} aria-label={mode === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}>
            {mode === "dark" ? <LightModeOutlined /> : <DarkModeOutlined />}
        </IconButton>
    );
}
