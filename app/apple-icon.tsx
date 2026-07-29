import { ImageResponse } from "next/og";
import { kjIconStyle } from "@/core/lib/iconDesign";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const s = kjIconStyle(size.width, { rounded: false }); // iOS le hace su propio recorte
  return new ImageResponse(
    (
      <div style={{ ...s.outer, background: "linear-gradient(135deg, #006cff 0%, #4d9bff 45%, #7c3aed 100%)" }}>
        <div style={{ ...s.inner, background: "transparent", borderRadius: 0, boxShadow: "none" }}>KJ</div>
      </div>
    ),
    { ...size }
  );
}
