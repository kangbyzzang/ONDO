import { ImageResponse } from "next/og";

export const alt = "온도 ONDO — 한일 진지한 관계 매칭";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        color: "#1d2924",
        background: "#f7f3ea",
        padding: "72px 82px",
      }}
    >
      <div
        style={{
          width: 470,
          height: 470,
          position: "absolute",
          right: -40,
          top: 70,
          display: "flex",
          borderRadius: "50%",
          background: "#ef5033",
        }}
      />
      <div style={{ display: "flex", position: "relative", flexDirection: "column", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, fontWeight: 800 }}>
          <span style={{ color: "#ef5033" }}>●</span>
          <span>온도</span>
          <span style={{ color: "#7e837b", fontSize: 18, letterSpacing: 4 }}>ONDO</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ color: "#ef5033", fontSize: 18, fontWeight: 700, letterSpacing: 3 }}>KOREA × JAPAN, SERIOUSLY</span>
          <span style={{ marginTop: 20, fontSize: 66, fontWeight: 800, letterSpacing: -4 }}>잘 맞는 사람은,</span>
          <span style={{ fontSize: 66, fontWeight: 800, letterSpacing: -4 }}>대화 전에도 보여요.</span>
          <span style={{ marginTop: 26, color: "#666e67", fontSize: 24 }}>적응형 질문으로 알아보는 진지한 관계의 가능성</span>
        </div>
      </div>
      <div
        style={{
          width: 250,
          height: 250,
          position: "absolute",
          right: 70,
          top: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "2px solid rgba(255,255,255,.45)",
          borderRadius: "50%",
          color: "white",
          fontSize: 58,
          fontWeight: 800,
        }}
      >
        ↔
      </div>
    </div>,
    size,
  );
}
