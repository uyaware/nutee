import { Box } from "@mui/material";
import { useEffect, useRef } from "react";
import { useCustomerMode } from "@/shared/theme/customerMode";

function Stars() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context) return;
        const draw = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            const ratio = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = width * ratio;
            canvas.height = height * ratio;
            context.setTransform(ratio, 0, 0, ratio, 0, 0);
            const count = Math.ceil((width * height) / 10000);
            for (let i = 0; i < count; i++) {
                context.beginPath();
                context.arc(Math.random() * width, Math.random() * height, 0.4 + Math.random() * 1.1, 0, Math.PI * 2);
                context.fillStyle = `rgba(205, 220, 255, ${0.2 + Math.random() * 0.6})`;
                context.fill();
            }
        };
        draw();
        window.addEventListener("resize", draw);
        return () => window.removeEventListener("resize", draw);
    }, []);
    return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />;
}

export function LandingBackground() {
    const { mode } = useCustomerMode();
    const dark = mode === "dark";
    return (
        <Box aria-hidden="true" sx={{
            position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none",
            backgroundColor: dark ? "#070910" : "#fafbfe",
            backgroundImage: dark ? "none" : "radial-gradient(ellipse at 75% 20%, rgba(169, 198, 255, .28), transparent 42%), radial-gradient(ellipse at 20% 35%, rgba(217, 229, 255, .32), transparent 45%)",
        }}>
            {dark ? (
                <>
                    <Box sx={{
                        position: "absolute", inset: 0,
                        backgroundImage: "radial-gradient(ellipse at 75% 38%, rgba(71, 49, 165, .5), transparent 37%), radial-gradient(ellipse at 22% 82%, rgba(19, 76, 157, .35), transparent 42%)",
                    }} />
                    <Stars />
                    <Box sx={{
                        position: "absolute", inset: "0 0 auto", height: "75%",
                        backgroundImage: "linear-gradient(rgba(235, 240, 255, .14) 1px, transparent 1px), linear-gradient(90deg, rgba(235, 240, 255, .14) 1px, transparent 1px)",
                        backgroundSize: "28px 28px",
                        maskImage: "linear-gradient(to bottom, #000, transparent)",
                        WebkitMaskImage: "linear-gradient(to bottom, #000, transparent)",
                    }} />
                </>
            ) : (
                <Box sx={{
                    position: "absolute", inset: 0,
                    backgroundImage: "radial-gradient(circle, rgba(70, 93, 130, .35) 2px, transparent 2.4px)",
                    backgroundSize: "28px 28px",
                    maskImage: "linear-gradient(to bottom, #000, transparent 50%)",
                    WebkitMaskImage: "linear-gradient(to bottom, #000, transparent 50%)",
                }} />
            )}
        </Box>
    );
}

