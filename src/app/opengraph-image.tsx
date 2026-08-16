import { ImageResponse } from "next/og";

export const alt = "ServiceFlow — one calm flow for appointment-based work";
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
        color: "#f7f5ef",
        background: "#090d1c",
        fontFamily: "sans-serif",
        padding: "76px 82px",
      }}
    >
      <div style={{ position: "absolute", inset: 0, display: "flex", opacity: 0.22, backgroundImage: "linear-gradient(rgba(148,163,184,.25) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,.25) 1px,transparent 1px)", backgroundSize: "48px 48px" }} />
      <div style={{ position: "absolute", width: 520, height: 520, borderRadius: 520, right: -120, top: -180, background: "radial-gradient(circle,rgba(118,92,255,.65),rgba(118,92,255,0))" }} />
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", fontSize: 30, fontWeight: 700, letterSpacing: "-1px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 5, marginRight: 15, padding: "10px 11px", borderRadius: 12, background: "linear-gradient(140deg,#6f63ff,#9a60ff)" }}>
            <span style={{ width: 5, height: 13, borderRadius: 5, background: "white", opacity: 0.65 }} />
            <span style={{ width: 5, height: 23, borderRadius: 5, background: "white" }} />
            <span style={{ width: 5, height: 17, borderRadius: 5, background: "white", opacity: 0.82 }} />
          </div>
          ServiceFlow
        </div>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 870 }}>
          <div style={{ display: "flex", alignItems: "center", color: "#9cf3cf", fontSize: 20, fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 20 }}>
            <span style={{ width: 9, height: 9, borderRadius: 9, background: "#72dfb1", marginRight: 12 }} />
            Appointment operations, considered
          </div>
          <div style={{ fontSize: 70, lineHeight: 1.02, fontWeight: 720, letterSpacing: "-4px" }}>Turn scattered schedules into one calm flow.</div>
          <div style={{ fontSize: 23, lineHeight: 1.4, color: "#b7bfd1", marginTop: 26 }}>A production-minded B2B SaaS portfolio demonstration.</div>
        </div>
      </div>
    </div>,
    size,
  );
}
