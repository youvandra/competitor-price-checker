import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { C, FONT_DISPLAY, FONT_BODY, FONT_MONO } from "./theme";

// Rise: fade + upward translate, staggered by `delay` (frames). The workhorse
// entrance used across every scene, mirroring the HTML "line" reveal.
export const Rise: React.FC<{
  delay?: number;
  y?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ delay = 0, y = 26, children, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 200 }, durationInFrames: 20 });
  const opacity = interpolate(s, [0, 1], [0, 1]);
  const translate = interpolate(s, [0, 1], [y, 0]);
  return <div style={{ opacity, transform: `translateY(${translate}px)`, ...style }}>{children}</div>;
};

export const Stage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      background: C.stage,
      color: C.text,
      fontFamily: FONT_BODY,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      padding: "0 120px",
      boxSizing: "border-box",
      overflow: "hidden",
    }}
  >
    <div
      style={{
        position: "absolute",
        inset: 0,
        background:
          "radial-gradient(120% 90% at 50% 0%, rgba(242,130,12,.07), transparent 55%), radial-gradient(90% 70% at 50% 115%, rgba(0,0,0,.5), transparent 60%)",
        pointerEvents: "none",
      }}
    />
    {children}
  </div>
);

export const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      fontFamily: FONT_BODY,
      fontWeight: 600,
      letterSpacing: "0.35em",
      textTransform: "uppercase",
      color: C.accent,
      fontSize: 30,
    }}
  >
    {children}
  </div>
);

export const H1: React.FC<{ children: React.ReactNode; size?: number; style?: React.CSSProperties }> = ({
  children,
  size = 128,
  style,
}) => (
  <h1
    style={{
      fontFamily: FONT_DISPLAY,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.01em",
      fontSize: size,
      lineHeight: 0.98,
      margin: "10px 0 0",
      textWrap: "balance",
      ...style,
    }}
  >
    {children}
  </h1>
);

export const Sub: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <p style={{ color: C.muted, fontSize: 40, lineHeight: 1.45, maxWidth: 1040, marginTop: 30, ...style }}>
    {children}
  </p>
);

export const A: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ color: C.accent }}>{children}</span>
);
export const R: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ color: C.lose }}>{children}</span>
);
export const G: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ color: C.win }}>{children}</span>
);
export const B: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <strong style={{ color: C.text, fontWeight: 600 }}>{children}</strong>
);

export { FONT_DISPLAY, FONT_BODY, FONT_MONO };
