import { useState } from "react";
import { Box, Typography } from "@mui/material";

function Image({
  src,
  alt,
  eager,
}: {
  src: string;
  alt: string;
  eager?: boolean;
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
      sx={{ width: "100%", height: "100%", objectFit: "contain" }}
    />
  );
}
export function ProductImage(props: {
  src: string;
  alt: string;
  eager?: boolean;
}) {
  return <Image key={props.src} {...props} />;
}
