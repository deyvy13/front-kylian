import { ImageResponse } from "next/og";
import { kjIconStyle } from "@/core/lib/iconDesign";

const SIZE = 192;

export async function GET() {
  const s = kjIconStyle(SIZE, { maskable: true });
  return new ImageResponse(
    (
      <div style={s.outer}>
        <div style={s.inner}>KJ</div>
      </div>
    ),
    { width: SIZE, height: SIZE }
  );
}
