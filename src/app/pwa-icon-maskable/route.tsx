import { ImageResponse } from "next/og";

// Maskable icon: background fills the full square (the OS clips a shape
// like a circle out of it), and the glyph stays within the ~80% "safe
// zone" so it isn't cut off by that clipping.
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#171717",
        }}
      >
        <div style={{ fontSize: 220 }}>🏗️</div>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
