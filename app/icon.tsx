import { ImageResponse } from "next/og";
import { kjIconStyle } from "@/core/lib/iconDesign";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  const s = kjIconStyle(size.width);
  return new ImageResponse(
    (
      <div style={s.outer}>
        <div style={s.inner}>KJ</div>
      </div>
    ),
    { ...size }
  );
}
