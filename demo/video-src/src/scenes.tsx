import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { C, FONT_DISPLAY, FONT_BODY, FONT_MONO } from "./theme";
import {
  Stage, Rise, BlurIn, Pop, MaskLine, Swipe, Counter, Logo,
  Eyebrow, H1, Sub, A, R, G, B, MarketCard, SearchBar, RankRow, useProg, EASE,
} from "./ui";

const tnum: React.CSSProperties = { fontVariantNumeric: "tabular-nums" };
const Big: React.FC<{ children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties }> = ({
  children, size = 122, color = C.text, style,
}) => (
  <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: size, lineHeight: 1.0, letterSpacing: "-0.025em", color, ...style }}>
    {children}
  </div>
);

// ── Scene 1 · HOOK (staged: headline → marketplace cards → line) ─────────────
export const SceneHook: React.FC = () => {
  const frame = useCurrentFrame();
  // beat transition: 0 = headline centered, 1 = cards stage
  const toCards = interpolate(frame, [96, 118], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const headY = interpolate(toCards, [0, 1], [0, -388]);
  const headScale = interpolate(toCards, [0, 1], [1, 0.4]);
  const headColor = interpolate(toCards, [0, 1], [1, 0.55]);

  const cardP = useProg(126, 26);
  const slide = (dir: number) => `translateX(${interpolate(cardP, [0, 1], [dir * 90, 0])}px)`;

  const sold = spring({ frame: frame - 172, fps: 30, config: { damping: 11, stiffness: 190 } });

  return (
    <Stage>
      {/* headline (mask reveal, then shrinks to top) */}
      <div style={{ position: "absolute", transform: `translateY(${headY}px) scale(${headScale})`, opacity: 0.45 + 0.55 * headColor }}>
        <MaskLine delay={6}><Big>You just lost</Big></MaskLine>
        <MaskLine delay={16}><Big>another <R>sale.</R></Big></MaskLine>
      </div>

      {/* marketplace cards */}
      {toCards > 0.01 ? (
        <div style={{ opacity: toCards, marginTop: 40 }}>
          <div style={{ display: "flex", gap: 56, alignItems: "stretch" }}>
            <div style={{ transform: slide(-1), opacity: cardP }}>
              <MarketCard
                tag="Your listing"
                seller="you"
                title="Logitech MX Master 3S — Wireless Mouse"
                price="$95.00"
                priceColor={C.muted}
                cta="Buy now"
              />
            </div>
            <div style={{ transform: slide(1), opacity: cardP }}>
              <MarketCard
                tag="Competitor · noelfelipe"
                tagColor={C.win}
                seller="noelfelipe"
                title="Logitech MX Master 3S — Wireless Mouse"
                price="$70.98"
                priceColor={C.win}
                highlight
                cta="Buy now"
                badge={
                  <div style={{
                    position: "absolute", top: -22, right: 26, transform: `rotate(8deg) scale(${interpolate(sold, [0, 1], [2, 1])})`,
                    opacity: interpolate(sold, [0, 0.25], [0, 1], { extrapolateRight: "clamp" }),
                    border: `4px solid ${C.win}`, color: C.win, fontFamily: FONT_DISPLAY, fontWeight: 800,
                    fontSize: 34, letterSpacing: "0.06em", padding: "2px 20px", borderRadius: 10, background: C.stage,
                  }}>SOLD</div>
                }
              />
            </div>
          </div>
          {/* price-diff callout */}
          <BlurIn delay={196} style={{ marginTop: 40, display: "flex", justifyContent: "center" }}>
            <div style={{
              fontFamily: FONT_MONO, fontSize: 30, color: C.win, border: `1.5px solid ${C.win}55`,
              background: `${C.win}12`, borderRadius: 999, padding: "12px 30px",
            }}>▼ $24.02 cheaper — and you never saw it</div>
          </BlurIn>
        </div>
      ) : null}

      {/* closing line */}
      {frame > 250 ? (
        <BlurIn delay={256} style={{ position: "absolute", bottom: 90 }}>
          <Sub style={{ marginTop: 0 }}>Not because your product was worse.<br />Because their price was lower — and you <B>didn't know.</B></Sub>
        </BlurIn>
      ) : null}
    </Stage>
  );
};

// ── Scene 2 · SEARCH (search box scanning each marketplace) ──────────────────
const MK: Record<string, [string, string][]> = {
  "amazon.com": [["Anker Direct", "$71.49"], ["TechDeals", "$74.20"], ["PrimeSeller", "$76.00"], ["GadgetHub", "$79.99"]],
  "ebay.com": [["noelfelipe", "$70.98"], ["dealmaster", "$75.49"], ["quickship", "$78.00"], ["mousepro", "$84.00"]],
  "walmart.com": [["Walmart.com", "$74.99"], ["HomeTech", "$80.25"], ["ValueShop", "$83.99"], ["SuperSave", "$90.00"]],
  "aliexpress.com": [["Cool Store", "$68.20"], ["TechWorld", "$72.40"], ["FastShip", "$77.30"], ["MegaDeal", "$83.00"]],
  "target.com": [["Logitech", "$79.99"], ["Target", "$82.49"], ["TechCorner", "$88.75"], ["DeskPro", "$97.00"]],
};
export const SceneSearch: React.FC = () => {
  const frame = useCurrentFrame();
  const names = Object.keys(MK);
  const SCAN_START = 66;
  const idx = Math.min(names.length - 1, Math.max(0, Math.floor((frame - SCAN_START) / 34)));
  const active = names[idx];
  const rows = MK[active];
  return (
    <Stage>
      <BlurIn delay={2}><Eyebrow>The old way</Eyebrow></BlurIn>
      <MaskLine delay={8} style={{ marginTop: 12 }}><Big size={92}>Check <A>every</A> marketplace.<br />By hand.</Big></MaskLine>

      <div style={{ marginTop: 46 }}>
        <SearchBar text="logitech mx master 3s" delay={26} scanning={frame > SCAN_START - 6} />
      </div>

      {/* marketplace tabs */}
      <Rise delay={30} style={{ marginTop: 26, display: "flex", gap: 14 }}>
        {names.map((m, i) => {
          const on = m === active && frame > SCAN_START - 6;
          return (
            <span key={m} style={{
              fontFamily: FONT_MONO, fontSize: 25, color: on ? C.stage : C.muted,
              background: on ? C.accent : "transparent", border: `1.5px solid ${on ? C.accent : C.line}`,
              borderRadius: 999, padding: "8px 24px", transition: "none",
              opacity: interpolate(frame, [30 + i * 3, 42 + i * 3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            }}>{m}</span>
          );
        })}
      </Rise>

      {/* results for active marketplace */}
      {frame > SCAN_START ? (
        <div key={active} style={{ marginTop: 28, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18, width: 1180 }}>
          {rows.map(([s, p], i) => (
            <div key={s} style={{
              background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: "18px 20px", textAlign: "left",
              opacity: interpolate(frame - SCAN_START - idx * 0, [i * 3, i * 3 + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              transform: `translateY(${interpolate(frame - SCAN_START, [i * 3, i * 3 + 12], [14, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
            }}>
              <div style={{ color: C.faint, fontSize: 21, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s}</div>
              <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 42, marginTop: 6, ...tnum }}>{p}</div>
            </div>
          ))}
        </div>
      ) : null}

      <BlurIn delay={SCAN_START + 8} style={{ marginTop: 34 }}>
        <div style={{ fontFamily: FONT_MONO, fontSize: 32, color: C.muted }}>
          <Counter to={148} delay={SCAN_START + 8} dur={70} style={{ color: C.text }} /> listings · 7 marketplaces · <span style={{ color: C.lose }}>hours, every day</span>
        </div>
      </BlurIn>
    </Stage>
  );
};

// ── Scene 3 · REVEAL (single brand title, kinetic) ───────────────────────────
export const SceneReveal: React.FC = () => {
  const chips = ["amazon", "ebay", "walmart", "aliexpress", "etsy", "target", "shopee"];
  return (
    <Stage>
      <BlurIn delay={2}><Eyebrow>One API call</Eyebrow></BlurIn>
      <div style={{ marginTop: 18 }}>
        <MaskLine delay={8}><Big size={150} style={{ letterSpacing: "-0.03em" }}>Competitor</Big></MaskLine>
        <MaskLine delay={20}><Big size={150} color={C.accent} style={{ letterSpacing: "-0.03em" }}>Price Advisor</Big></MaskLine>
      </div>
      <div style={{ display: "flex", justifyContent: "center" }}><Swipe delay={40} width={520} height={9} /></div>
      <Sub delay={48}>Live competitor-price intelligence — priced per call,<br />built for AI agents and the sellers behind them.</Sub>
      <Rise delay={64} style={{ marginTop: 38, display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", maxWidth: 1150 }}>
        {chips.map((c, i) => (
          <BlurIn key={c} delay={64 + i * 4} dur={16}>
            <span style={{ fontFamily: FONT_MONO, fontSize: 28, border: `1px solid ${C.line2}`, color: C.muted, borderRadius: 999, padding: "9px 26px" }}>{c}</span>
          </BlurIn>
        ))}
      </Rise>
    </Stage>
  );
};

// ── Scene 4 · HOW (terminal) — kept ──────────────────────────────────────────
const LINES: [string, string][] = [
  ["cmd", "$ curl -X POST pricecheck.web.id/ebay \\"],
  ["cmd", "    -d '{\"query\":\"logitech mx master 3s\",\"my_price\":95,\"my_cost\":62}'"],
  ["p402", "← 402 Payment Required · $0.40 · USDT0 on X Layer (eip155:196)"],
  ["note", "  # agent signs & pays via x402 — no signup, no API key"],
  ["ok", "← 200 OK · settled on-chain"],
  ["json", "  { leader: \"$70.98 by noelfelipe\", offers: 17, yourRank: \"10/18\","],
  ["json", "    recommendation: \"Win\", price: 70.97, nextActions: [...] }"],
];
const LCOLOR: Record<string, string> = { cmd: C.text, p402: C.accent, note: C.faint, ok: C.win, json: "#B7C3D9" };
export const SceneHow: React.FC = () => {
  const frame = useCurrentFrame();
  const start = 22;
  const cps = 1.15;
  const revealed = Math.max(0, (frame - start) * cps);
  let budget = revealed;
  const shown = LINES.map(([cls, text]) => {
    const take = Math.max(0, Math.min(text.length, Math.floor(budget)));
    budget -= text.length + 6;
    return [cls, text.slice(0, take), take > 0] as [string, string, boolean];
  });
  const caretOn = Math.floor(frame / 15) % 2 === 0;
  const lastOn = shown.filter((x) => x[2]).length - 1;
  return (
    <Stage>
      <MaskLine delay={4}><Big size={92}>One call. <A>Machine-payable.</A></Big></MaskLine>
      <Pop delay={12} style={{ marginTop: 34 }}>
        <div style={{ width: 1380, background: C.panel2, border: `1px solid ${C.line2}`, borderRadius: 22, textAlign: "left", fontFamily: FONT_MONO, fontSize: 33, lineHeight: 1.6, padding: "34px 44px", minHeight: 340, boxSizing: "border-box", boxShadow: "0 40px 100px -40px #000" }}>
          <div style={{ display: "flex", gap: 13, marginBottom: 26 }}>
            {["#F0555B", "#FBB454", "#37D689"].map((c) => <span key={c} style={{ width: 18, height: 18, borderRadius: "50%", background: c }} />)}
          </div>
          {shown.map(([cls, text, on], i) => on ? (
            <div key={i} style={{ color: LCOLOR[cls], whiteSpace: "pre-wrap" }}>{text}
              {i === lastOn && caretOn ? <span style={{ color: C.accent }}>▍</span> : null}
            </div>
          ) : null)}
        </div>
      </Pop>
      <Sub delay={20}>Your agent pays <B>$0.40 in USDT0 on X Layer</B> via x402 — no signup, no API key — and gets an answer in seconds.</Sub>
    </Stage>
  );
};

// ── Scene 5 · STRATEGIES — kept ──────────────────────────────────────────────
export const SceneStrategies: React.FC = () => {
  const strats: [string, string, string, "win" | "floor" | "", boolean][] = [
    ["Win", "$70.97", "Undercut the leader by 1¢ and take the top spot.", "win", true],
    ["Match", "$70.98", "Stay competitive without starting a price war.", "", false],
    ["Premium Hold", "$135.49", "Hold high — lean on rating, shipping and returns.", "", false],
    ["Margin Floor", "$62.00", "Your cost. Never price below it — no loss-making wins.", "floor", false],
  ];
  return (
    <Stage>
      <MaskLine delay={4}><Big size={100}>Not one number.<br />A <A>strategy menu.</A></Big></MaskLine>
      <div style={{ marginTop: 46, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 24, width: 1560 }}>
        {strats.map(([n, v, d, kind, rec], i) => (
          <Pop key={i} delay={16 + i * 7}>
            <div style={{
              background: C.panel, border: `1.5px solid ${kind === "win" ? C.win : C.line}`, borderRadius: 22,
              padding: 32, textAlign: "left", position: "relative", height: "100%", boxSizing: "border-box",
              boxShadow: kind === "win" ? `0 30px 80px -34px ${C.win}55` : "0 30px 80px -44px #000",
            }}>
              {rec ? <div style={{ position: "absolute", top: -17, right: 22, background: C.win, color: C.stage, fontSize: 21, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", borderRadius: 999, padding: "6px 18px" }}>Recommended</div> : null}
              <div style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", fontSize: 25, color: C.muted }}>{n}</div>
              <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 74, marginTop: 10, color: kind === "win" ? C.win : kind === "floor" ? C.lose : C.text, letterSpacing: "-0.02em", ...tnum }}>{v}</div>
              <div style={{ color: C.muted, fontSize: 25, lineHeight: 1.4, marginTop: 12 }}>{d}</div>
            </div>
          </Pop>
        ))}
      </div>
      <Sub delay={44}>Computed from <B>17 live offers</B> — with your margin as a hard floor.</Sub>
    </Stage>
  );
};

// ── Scene 6 · BEST PRICE SCAN (simple, animated bars) ────────────────────────
export const SceneScan: React.FC = () => {
  const rows: [string, string, boolean, number][] = [
    ["ebay.com", "$70.98", true, 100],
    ["amazon.com", "$71.49", false, 92],
    ["aliexpress.com", "$72.40", false, 85],
    ["walmart.com", "$74.99", false, 74],
    ["target.com", "$79.99", false, 60],
    ["etsy.com", "$84.00", false, 48],
  ];
  return (
    <Stage>
      <MaskLine delay={4}><Big size={100}>Every marketplace.<br /><A>One call.</A></Big></MaskLine>
      <div style={{ marginTop: 42, display: "flex", flexDirection: "column", gap: 14, width: 1240 }}>
        {rows.map(([m, p, best, pct], i) => (
          <RankRow key={m} market={m} price={p} best={best} delay={16 + i * 7} barPct={pct} />
        ))}
      </div>
      <Sub delay={70}>Best Price Scan · <B>$1.50</B> · every marketplace ranked in one shot.</Sub>
    </Stage>
  );
};

// ── Scene 7 · WHY (animated pillars, short copy) ─────────────────────────────
export const SceneWhy: React.FC = () => {
  const pillars: [string, string, string][] = [
    ["◆", "Pay per call", "No subscription. Settled on-chain in USDT0 on X Layer."],
    ["⚡", "Agent-ready", "Every answer ships nextActions — the agent keeps going alone."],
    ["✓", "Honest evidence", "Every figure cites live listings. Never a black-box number."],
  ];
  return (
    <Stage>
      <MaskLine delay={4}><Big size={104}>Built for the <A>agent economy.</A></Big></MaskLine>
      <div style={{ marginTop: 54, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 28, width: 1560 }}>
        {pillars.map(([icon, t, body], i) => (
          <Pop key={i} delay={16 + i * 9}>
            <div style={{ background: C.panel, border: `1.5px solid ${C.line}`, borderRadius: 22, padding: 44, textAlign: "left", height: "100%", boxSizing: "border-box" }}>
              <div style={{ fontSize: 52, color: C.accent }}>{icon}</div>
              <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 42, marginTop: 18, letterSpacing: "-0.01em" }}>{t}</div>
              <p style={{ color: C.muted, fontSize: 29, lineHeight: 1.5, marginTop: 14 }}>{body}</p>
            </div>
          </Pop>
        ))}
      </div>
    </Stage>
  );
};

// ── Scene 8 · OUTRO (logo · name · site · agent · built on OKX.ai) ───────────
export const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Stage>
      <Pop delay={4}><Logo src="Logo.png" height={150} /></Pop>
      <MaskLine delay={16} style={{ marginTop: 30 }}>
        <Big size={100}>Competitor <A>Price Advisor</A></Big>
      </MaskLine>
      <BlurIn delay={30} style={{ marginTop: 22 }}>
        <div style={{ fontFamily: FONT_MONO, fontSize: 46, color: C.accent }}>pricecheck.web.id</div>
      </BlurIn>
      <BlurIn delay={40} style={{ marginTop: 16 }}>
        <div style={{ fontFamily: FONT_MONO, fontSize: 30, color: C.muted }}>OKX.ai Agent #6713</div>
      </BlurIn>
      <BlurIn delay={52} style={{ marginTop: 40, display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 28, color: C.faint }}>Built on</span>
        <Logo src="okx-logo.png" height={38} style={{ filter: "invert(1) brightness(1.6)" }} />
        <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 34 }}>OKX.ai</span>
        <span style={{ color: C.line2 }}>·</span>
        <span style={{ fontSize: 28, color: C.faint }}>x402 · X Layer · USDT0</span>
      </BlurIn>
    </Stage>
  );
};
