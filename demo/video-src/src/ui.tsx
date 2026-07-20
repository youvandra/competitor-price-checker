import React from "react";
import {
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
  Easing,
  Img,
  staticFile,
} from "remotion";
import { C, FONT_DISPLAY, FONT_BODY, FONT_MONO } from "./theme";

// Premium ease — easeOutExpo-ish. Everything decelerates into place.
export const EASE = Easing.bezier(0.16, 1, 0.3, 1);
const tnum: React.CSSProperties = { fontVariantNumeric: "tabular-nums" };

// prog: 0..1 eased ramp starting at `delay`, over `dur` frames.
export const useProg = (delay = 0, dur = 22) => {
  const frame = useCurrentFrame();
  return interpolate(frame - delay, [0, dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
};

// ── Stage: animated ground (drifting glow + vignette + faint grid) ───────────
export const Stage: React.FC<{ children: React.ReactNode; pad?: number }> = ({
  children,
  pad = 130,
}) => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 90) * 40;
  const glow = 0.06 + Math.sin(frame / 60) * 0.015;
  return (
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
        padding: `0 ${pad}px`,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* faint grid */}
      <div
        style={{
          position: "absolute",
          inset: -2,
          backgroundImage: `linear-gradient(${C.line}20 1px, transparent 1px), linear-gradient(90deg, ${C.line}20 1px, transparent 1px)`,
          backgroundSize: "84px 84px",
          maskImage: "radial-gradient(120% 100% at 50% 40%, #000 30%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(120% 100% at 50% 40%, #000 30%, transparent 78%)",
        }}
      />
      {/* drifting brand glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(60% 50% at ${50 + drift / 20}% 8%, rgba(242,130,12,${glow}), transparent 60%), radial-gradient(80% 60% at 50% 118%, rgba(0,0,0,.55), transparent 60%)`,
          pointerEvents: "none",
        }}
      />
      {children}
    </div>
  );
};

// ── Kinetic text: mask reveal (line rises from below a clip) ─────────────────
export const MaskLine: React.FC<{
  children: React.ReactNode;
  delay?: number;
  dur?: number;
  style?: React.CSSProperties;
}> = ({ children, delay = 0, dur = 26, style }) => {
  const p = useProg(delay, dur);
  const y = interpolate(p, [0, 1], [118, 0]);
  return (
    <div style={{ overflow: "hidden", padding: "0.08em 0.02em" }}>
      <div style={{ transform: `translateY(${y}%)`, ...style }}>{children}</div>
    </div>
  );
};

// blur + fade + slight lift
export const BlurIn: React.FC<{
  children: React.ReactNode;
  delay?: number;
  dur?: number;
  y?: number;
  style?: React.CSSProperties;
}> = ({ children, delay = 0, dur = 24, y = 24, style }) => {
  const p = useProg(delay, dur);
  return (
    <div
      style={{
        opacity: p,
        filter: `blur(${interpolate(p, [0, 1], [14, 0])}px)`,
        transform: `translateY(${interpolate(p, [0, 1], [y, 0])}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// spring pop with soft scale
export const Pop: React.FC<{
  children: React.ReactNode;
  delay?: number;
  from?: number;
  style?: React.CSSProperties;
}> = ({ children, delay = 0, from = 0.82, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 15, stiffness: 150, mass: 0.9 } });
  return (
    <div style={{ transform: `scale(${interpolate(s, [0, 1], [from, 1])})`, opacity: Math.min(1, s * 1.4), ...style }}>
      {children}
    </div>
  );
};

// Rise: fade + upward translate (workhorse)
export const Rise: React.FC<{
  delay?: number;
  y?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ delay = 0, y = 26, children, style }) => {
  const p = useProg(delay, 20);
  return (
    <div style={{ opacity: p, transform: `translateY(${interpolate(p, [0, 1], [y, 0])}px)`, ...style }}>
      {children}
    </div>
  );
};

// ── Typography ───────────────────────────────────────────────────────────────
export const Eyebrow: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => (
  <BlurIn delay={delay} dur={18} y={12}>
    <div
      style={{
        fontFamily: FONT_MONO,
        fontWeight: 500,
        letterSpacing: "0.34em",
        textTransform: "uppercase",
        color: C.accent,
        fontSize: 26,
      }}
    >
      {children}
    </div>
  </BlurIn>
);

export const H1: React.FC<{ children: React.ReactNode; size?: number; style?: React.CSSProperties }> = ({
  children,
  size = 118,
  style,
}) => (
  <h1
    style={{
      fontFamily: FONT_DISPLAY,
      fontWeight: 800,
      letterSpacing: "-0.02em",
      fontSize: size,
      lineHeight: 1.0,
      margin: 0,
      textWrap: "balance",
      ...style,
    }}
  >
    {children}
  </h1>
);

export const Sub: React.FC<{ children: React.ReactNode; delay?: number; style?: React.CSSProperties }> = ({
  children,
  delay = 0,
  style,
}) => (
  <BlurIn delay={delay} dur={22}>
    <p style={{ color: C.muted, fontSize: 38, lineHeight: 1.45, maxWidth: 1060, marginTop: 30, fontWeight: 400, ...style }}>
      {children}
    </p>
  </BlurIn>
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

// animated accent underline swipe
export const Swipe: React.FC<{ delay?: number; width: number; color?: string; height?: number }> = ({
  delay = 0,
  width,
  color = C.accent,
  height = 8,
}) => {
  const p = useProg(delay, 20);
  return (
    <div style={{ width: width * p, height, background: color, borderRadius: 999, marginTop: 18, boxShadow: `0 0 24px ${color}66` }} />
  );
};

// ── Animated number counter ──────────────────────────────────────────────────
export const Counter: React.FC<{
  to: number;
  delay?: number;
  dur?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  style?: React.CSSProperties;
}> = ({ to, delay = 0, dur = 40, prefix = "", suffix = "", decimals = 0, style }) => {
  const p = useProg(delay, dur);
  const v = (p * to).toFixed(decimals);
  return (
    <span style={{ ...tnum, ...style }}>
      {prefix}
      {v}
      {suffix}
    </span>
  );
};

// ── Rating stars ─────────────────────────────────────────────────────────────
export const Stars: React.FC<{ n?: number; count?: string; size?: number }> = ({ n = 4.5, count, size = 22 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: size, color: C.accent2 }}>
    <span style={{ letterSpacing: 2 }}>★★★★</span>
    <span style={{ color: C.line2 }}>★</span>
    {count ? <span style={{ color: C.faint, fontSize: size * 0.82, marginLeft: 6 }}>{count}</span> : null}
    <span style={{ position: "absolute", opacity: 0 }}>{n}</span>
  </div>
);

// ── Marketplace product card ─────────────────────────────────────────────────
export const MarketCard: React.FC<{
  tag: string;
  tagColor?: string;
  seller: string;
  title: string;
  price: string;
  priceColor?: string;
  highlight?: boolean;
  cta?: string;
  badge?: React.ReactNode;
  width?: number;
}> = ({ tag, tagColor = C.faint, seller, title, price, priceColor = C.text, highlight, cta = "Buy now", badge, width = 470 }) => (
  <div
    style={{
      width,
      background: highlight ? `linear-gradient(180deg, rgba(55,214,137,.08), ${C.panel})` : C.panel,
      border: `1.5px solid ${highlight ? C.win : C.line}`,
      borderRadius: 24,
      padding: 30,
      textAlign: "left",
      position: "relative",
      boxShadow: highlight ? `0 30px 80px -30px ${C.win}55` : "0 30px 80px -40px #000",
    }}
  >
    {badge}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontFamily: FONT_MONO, fontSize: 20, letterSpacing: "0.12em", textTransform: "uppercase", color: tagColor }}>{tag}</span>
      <Stars count="1,204" size={20} />
    </div>
    {/* thumbnail */}
    <div
      style={{
        height: 168,
        marginTop: 18,
        borderRadius: 16,
        background: `radial-gradient(80% 120% at 30% 20%, ${C.line2}, ${C.panel2})`,
        border: `1px solid ${C.line}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* stylized mouse glyph */}
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
        <rect x="40" y="20" width="40" height="80" rx="20" stroke={C.faint} strokeWidth="4" />
        <line x1="60" y1="24" x2="60" y2="54" stroke={C.faint} strokeWidth="4" />
        <circle cx="60" cy="40" r="5" fill={C.accent} />
      </svg>
    </div>
    <div style={{ fontSize: 27, fontWeight: 500, marginTop: 18, lineHeight: 1.3, color: C.text }}>{title}</div>
    <div style={{ fontSize: 20, color: C.faint, marginTop: 8 }}>Sold by {seller}</div>
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 16 }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 68, color: priceColor, letterSpacing: "-0.02em", ...tnum }}>{price}</div>
      <div
        style={{
          background: highlight ? C.win : C.line,
          color: highlight ? C.stage : C.muted,
          fontWeight: 600,
          fontSize: 22,
          padding: "12px 26px",
          borderRadius: 12,
        }}
      >
        {cta}
      </div>
    </div>
  </div>
);

// ── Search bar (typing) ──────────────────────────────────────────────────────
export const SearchBar: React.FC<{
  text: string;
  delay?: number;
  cps?: number;
  width?: number;
  scanning?: boolean;
}> = ({ text, delay = 0, cps = 1.6, width = 1180, scanning }) => {
  const frame = useCurrentFrame();
  const shown = Math.max(0, Math.floor((frame - delay) * cps));
  const typed = text.slice(0, shown);
  const caret = Math.floor(frame / 15) % 2 === 0;
  const done = shown >= text.length;
  return (
    <Pop delay={delay - 6}>
      <div
        style={{
          width,
          display: "flex",
          alignItems: "center",
          gap: 22,
          background: C.panel2,
          border: `2px solid ${done && scanning ? C.accent : C.line2}`,
          borderRadius: 999,
          padding: "22px 34px",
          boxShadow: "0 30px 80px -40px #000",
        }}
      >
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7" stroke={C.accent} strokeWidth="2.4" />
          <line x1="16.5" y1="16.5" x2="21" y2="21" stroke={C.accent} strokeWidth="2.4" strokeLinecap="round" />
        </svg>
        <span style={{ fontFamily: FONT_BODY, fontSize: 40, color: C.text, fontWeight: 500, whiteSpace: "nowrap" }}>
          {typed}
          {!done && caret ? <span style={{ color: C.accent }}>|</span> : null}
        </span>
        <div style={{ flex: 1 }} />
        {done && scanning ? (
          <span style={{ fontFamily: FONT_MONO, fontSize: 24, color: C.accent, letterSpacing: "0.1em" }}>SCANNING…</span>
        ) : null}
      </div>
    </Pop>
  );
};

// ── Ranked price row ─────────────────────────────────────────────────────────
export const RankRow: React.FC<{
  market: string;
  price: string;
  best?: boolean;
  delay?: number;
  barPct: number;
}> = ({ market, price, best, delay = 0, barPct }) => {
  const p = useProg(delay, 20);
  const bar = useProg(delay + 6, 26);
  return (
    <div
      style={{
        opacity: p,
        transform: `translateX(${interpolate(p, [0, 1], [-40, 0])}px)`,
        display: "flex",
        alignItems: "center",
        gap: 26,
        background: best ? `linear-gradient(90deg, rgba(242,130,12,.16), ${C.panel})` : C.panel,
        border: `1.5px solid ${best ? C.accent : C.line}`,
        borderRadius: 16,
        padding: "16px 28px",
      }}
    >
      <span style={{ fontFamily: FONT_MONO, fontSize: 30, color: best ? C.accent : C.muted, width: 260, textAlign: "left" }}>{market}</span>
      <div style={{ flex: 1, height: 14, background: C.panel2, borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: `${barPct * bar}%`, height: "100%", background: best ? C.accent : C.line2, borderRadius: 999 }} />
      </div>
      {best ? (
        <span style={{ fontFamily: FONT_MONO, fontSize: 20, letterSpacing: "0.14em", textTransform: "uppercase", color: C.accent, fontWeight: 700 }}>Cheapest</span>
      ) : null}
      <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 40, color: best ? C.accent : C.text, width: 150, textAlign: "right", ...tnum }}>{price}</span>
    </div>
  );
};

export const Logo: React.FC<{ src: string; height: number; style?: React.CSSProperties }> = ({ src, height, style }) => (
  <Img src={staticFile(src)} style={{ height, display: "block", ...style }} />
);

export { FONT_DISPLAY, FONT_BODY, FONT_MONO };
