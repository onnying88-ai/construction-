import { ImageResponse } from "next/og";

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
        <div style={{ fontSize: 308 }}>🏗️</div>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
