import { useEffect, useRef } from "react";
import { useCustomerMode } from "@/shared/theme/customerMode";

export function CharacterBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { mode } = useCustomerMode();

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context) return;

        const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
        const characters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ<>/{}[]";
        let timer: number | undefined;
        let width = 0;
        let height = 0;
        let columns = 0;
        let rows = 0;
        let phases: number[] = [];

        const resize = () => {
            width = window.innerWidth;
            height = Math.ceil(window.innerHeight / 2);
            const ratio = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = width * ratio;
            canvas.height = height * ratio;
            context.setTransform(ratio, 0, 0, ratio, 0, 0);
            context.font = "10px monospace";
            columns = Math.ceil(width / 16);
            rows = Math.ceil(height / 19);
            phases = Array.from({ length: columns * rows }, () => Math.random());
        };
        const draw = () => {
            context.clearRect(0, 0, width, height);
            const time = motion.matches ? 0 : performance.now() / 4000;
            for (let row = 0; row < rows; row++) {
                const y = 12 + row * 19;
                const fade = Math.max(0, 1 - y / height);
                for (let column = 0; column < columns; column++) {
                    const index = row * columns + column;
                    const cycle = time + phases[index];
                    const visibility = (1 - Math.cos((cycle % 1) * Math.PI * 2)) / 2;
                    const character = (index * 17 + Math.floor(cycle) * 13) % characters.length;
                    context.fillStyle = mode === "dark" ? `rgba(218, 224, 233, ${0.16 * fade * visibility})` : `rgba(67, 76, 88, ${0.16 * fade * visibility})`;
                    context.fillText(characters[character], 5 + column * 16, y);
                }
            }
        };
        const start = () => {
            window.clearInterval(timer);
            resize();
            draw();
            if (!motion.matches && !document.hidden) timer = window.setInterval(draw, 80);
        };
        start();
        window.addEventListener("resize", start);
        motion.addEventListener("change", start);
        document.addEventListener("visibilitychange", start);
        return () => {
            window.clearInterval(timer);
            window.removeEventListener("resize", start);
            motion.removeEventListener("change", start);
            document.removeEventListener("visibilitychange", start);
        };
    }, [mode]);

    return <canvas ref={canvasRef} aria-hidden="true" style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "50vh", pointerEvents: "none" }} />;
}
