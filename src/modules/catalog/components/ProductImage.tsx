import { useState } from "react";
import { Box, Typography } from "@mui/material";

function Image({
    src,
    alt,
    eager,
    fit = "contain",
}: {
    src: string;
    alt: string;
    eager?: boolean;
    fit?: "cover" | "contain";
}) {
    const [failed, setFailed] = useState(false);
    return !src || failed ? (
        <Typography color="text.secondary" sx={{ p: 3, textAlign: "center" }}>
            Chưa có ảnh sản phẩm
        </Typography>
    ) : (
        <Box
            component="img"
            src={src}
            alt={alt}
            loading={eager ? "eager" : "lazy"}
            onError={() => setFailed(true)}
            sx={{ width: "100%", height: "100%", objectFit: fit, borderRadius: "inherit" }}
        />
    );
}
export function ProductImage(props: {
    src: string;
    alt: string;
    eager?: boolean;
    fit?: "cover" | "contain";
}) {
    const seed = /^https:\/\/picsum\.photos\/seed\/nutee-(\d+)\/640\/640$/.exec(
        props.src,
    );
    const images = [
        "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=640&h=480&fit=crop",
        "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=640&h=480&fit=crop",
        "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=640&h=480&fit=crop",
        "https://images.unsplash.com/photo-1527814050087-3793815479db?w=640&h=480&fit=crop",
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=640&h=480&fit=crop",
    ];
    const kinds = ["laptop", "smartphone", "keyboard", "mouse", "headphone"];
    const localIndex = kinds.findIndex((kind) => props.src === `/images/${kind}.svg`);
    const index = seed ? (Number(seed[1]) - 1) % images.length : localIndex;
    const src = index >= 0 ? images[index] : props.src;
    return <Image key={src} {...props} src={src} />;
}
