import CategoryOutlined from "@mui/icons-material/CategoryOutlined";
import LaptopMacRounded from "@mui/icons-material/LaptopMacRounded";
import SmartphoneRounded from "@mui/icons-material/SmartphoneRounded";
import KeyboardRounded from "@mui/icons-material/KeyboardRounded";
import MouseOutlined from "@mui/icons-material/MouseOutlined";
import HeadphonesOutlined from "@mui/icons-material/HeadphonesOutlined";
import MonitorOutlined from "@mui/icons-material/MonitorOutlined";
import type { SvgIconComponent } from "@mui/icons-material";

const icons: Record<string, SvgIconComponent> = {
    "laptop": LaptopMacRounded,
    "điện thoại": SmartphoneRounded,
    "bàn phím": KeyboardRounded,
    "chuột": MouseOutlined,
    "tai nghe": HeadphonesOutlined,
    "màn hình": MonitorOutlined,
};

export function categoryIcon(name: string, parentName = ""): SvgIconComponent {
    const match = (value: string) => Object.entries(icons).find(([key]) =>
        value.toLocaleLowerCase("vi").includes(key),
    )?.[1];
    return match(name) ?? match(parentName) ?? CategoryOutlined;
}
