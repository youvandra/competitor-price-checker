import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig, Easing } from "remotion";
import { C, FONT_DISPLAY, FONT_BODY, FONT_MONO } from "./theme";
import { Rise, Stage, Eyebrow, H1, Sub, A, R, G, B } from "./ui";

const tnum: React.CSSProperties = { fontVariantNumeric: "tabular-nums" };

// ── Scene 1 · HOOK ──────────────────────────────────────────────────────────
export const SceneHook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stamp = spring({ frame: frame - 92, fps, config: { damping: 12, stiffness: 200 } });
  const stampScale = interpolate(stamp, [0, 1], [2.2, 1]);
  const dim = interpolate(frame, [96, 112], [1, 0.35], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const gray = interpolate(frame, [96, 112], [0, 0.7], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const seek = spring({ frame: frame - 52, fps, config: { damping: 200 }, durationInFrames: 40 });
  const px = interpolate(seek, [0, 1], [38, 63]);
  const py = interpolate(seek, [0, 1], [78, 56]);
  const pOp = interpolate(frame, [52, 62], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const card: React.CSSProperties = {
    width: 430, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 22,
    padding: 36, textAlign: "left", position: "relative",
  };
  return (
    <Stage>
      <Rise delay={2}><Eyebrow>A story every seller knows</Eyebrow></Rise>
      <Rise delay={7}><H1 style={{ marginTop: 14 }}>You just lost<br />another <R>sale.</R></H1></Rise>
      <div style={{ display: "flex", gap: 54, marginTop: 58 }}>
        <Rise delay={16} style={{ opacity: dim, filter: `grayscale(${gray})` }}>
          <div style={card}>
            <div style={{ fontSize: 26, letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted }}>Your listing</div>
            <div style={{ fontSize: 33, fontWeight: 600, marginTop: 10, lineHeight: 1.25 }}>Logitech MX Master 3S — Wireless Mouse</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 90, marginTop: 16, color: C.lose, ...tnum }}>$95.00</div>
          </div>
        </Rise>
        <Rise delay={20}>
          <div style={card}>
            <div style={{ fontSize: 26, letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted }}>Competitor · noelfelipe</div>
            <div style={{ fontSize: 33, fontWeight: 600, marginTop: 10, lineHeight: 1.25 }}>Logitech MX Master 3S — Wireless Mouse</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 90, marginTop: 16, color: C.win, ...tnum }}>$70.98</div>
            <div style={{
              position: "absolute", top: 22, right: 22, border: `4px solid ${C.win}`, color: C.win,
              fontFamily: FONT_DISPLAY, textTransform: "uppercase", fontSize: 42, padding: "2px 18px",
              borderRadius: 8, transform: `rotate(8deg) scale(${stampScale})`, opacity: interpolate(stamp, [0, 0.3], [0, 1]),
            }}>Sold</div>
          </div>
        </Rise>
      </div>
      <div style={{
        position: "absolute", left: `${px}%`, top: `${py}%`, width: 38, height: 38, borderRadius: "50%",
        background: C.text, boxShadow: "0 0 0 9px rgba(242,239,230,.25)", opacity: pOp,
      }} />
      <Rise delay={76}><Sub>Not because your product was worse.<br />Because their price was <B>$24.02 lower</B> — and you didn't know.</Sub></Rise>
    </Stage>
  );
};

// ── Scene 2 · PAIN ──────────────────────────────────────────────────────────
const MARKETS: Record<string, [string, string][]> = {
  "amazon.com": [["Anker Direct", "$71.49"], ["TechDeals", "$74.20"], ["PrimeSeller", "$76.00"], ["GadgetHub", "$79.99"], ["OfficeMax", "$82.50"], ["EliteShop", "$88.00"], ["MegaStore", "$91.25"], ["TopRated", "$94.75"]],
  "ebay.com": [["noelfelipe", "$70.98"], ["shopA", "$72.10"], ["dealmaster", "$75.49"], ["quickship", "$78.00"], ["bargainbin", "$81.99"], ["mousepro", "$84.00"], ["ecomking", "$89.99"], ["stockroom", "$95.49"]],
  "walmart.com": [["Walmart.com", "$74.99"], ["MarketSeller", "$77.80"], ["HomeTech", "$80.25"], ["ValueShop", "$83.99"], ["DirectBuy", "$86.50"], ["SuperSave", "$90.00"], ["TopChoice", "$93.20"], ["BestValue", "$97.99"]],
  "aliexpress.com": [["Cool Store", "$68.20"], ["Top-rated store", "$70.15"], ["TechWorld", "$72.40"], ["GlobalDirect", "$74.90"], ["FastShip", "$77.30"], ["EliteTech", "$80.60"], ["MegaDeal", "$83.00"], ["ProSeller", "$86.45"]],
  "etsy.com": [["Crafty", "$84.00"], ["HandmadeHub", "$86.75"], ["ArtisanShop", "$89.99"], ["VintageFinds", "$92.50"], ["UniqueGoods", "$95.00"], ["CustomWorks", "$98.25"], ["TheWorkshop", "$102.00"], ["MakersLane", "$106.50"]],
  "target.com": [["Logitech", "$79.99"], ["Target", "$82.49"], ["PartnerCo", "$85.00"], ["TechCorner", "$88.75"], ["HomeOffice", "$91.99"], ["WorkSpace", "$94.50"], ["DeskPro", "$97.00"], ["OfficePlus", "$99.99"]],
  "shopee.co.id": [["Shopee Mall", "Rp1.198.000"], ["Toko Medan", "Rp1.215.000"], ["JakartaTech", "Rp1.240.000"], ["SurabayaShop", "Rp1.265.000"], ["BandungStore", "Rp1.290.000"], ["GadgetID", "Rp1.320.000"], ["TechMurah", "Rp1.350.000"], ["OfficialID", "Rp1.385.000"]],
};
export const ScenePain: React.FC = () => {
  const frame = useCurrentFrame();
  const names = Object.keys(MARKETS);
  const idx = Math.min(names.length - 1, Math.floor(Math.max(0, frame - 24) / 42));
  const active = names[idx];
  const count = Math.round(interpolate(frame, [30, 250], [0, 148], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return (
    <Stage>
      <Rise delay={2}><H1 size={100}>Finding out by hand<br />means checking <A>everything.</A></H1></Rise>
      <Rise delay={16} style={{ marginTop: 46, display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", maxWidth: 1500 }}>
        {names.map((m) => (
          <span key={m} style={{
            fontFamily: FONT_MONO, fontSize: 28,
            color: m === active ? C.stage : C.muted,
            background: m === active ? C.accent : "transparent",
            border: `1px solid ${m === active ? C.accent : C.line}`,
            borderRadius: 999, padding: "9px 26px", fontWeight: m === active ? 700 : 400,
          }}>{m}</span>
        ))}
      </Rise>
      <Rise delay={22} style={{ marginTop: 30 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 22, width: 1360 }}>
          {MARKETS[active].map(([s, p], i) => (
            <div key={i} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 16, padding: 22, textAlign: "left" }}>
              <div style={{ color: C.muted, fontSize: 24, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s}</div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 46, marginTop: 8, ...tnum }}>{p}</div>
            </div>
          ))}
        </div>
      </Rise>
      <Rise delay={28} style={{ marginTop: 36, display: "flex", gap: 72, fontFamily: FONT_MONO, fontSize: 34, color: C.muted }}>
        <span>Listings compared: <b style={{ color: C.text, ...tnum }}>{count}</b></span>
        <span>Marketplaces: <b style={{ color: C.text }}>7</b></span>
        <span>Time spent: <b style={{ color: C.text }}>hours — daily</b></span>
      </Rise>
    </Stage>
  );
};

// ── Scene 3 · REVEAL ────────────────────────────────────────────────────────
export const SceneReveal: React.FC = () => {
  const chips = ["amazon", "ebay", "walmart", "aliexpress", "etsy", "target", "shopee"];
  return (
    <Stage>
      <Rise delay={2}><Eyebrow>What if it was one API call?</Eyebrow></Rise>
      <Rise delay={9}>
        <div style={{ fontFamily: FONT_DISPLAY, textTransform: "uppercase", fontSize: 150, lineHeight: 0.95, marginTop: 8 }}>
          Competitor<br /><A>Price Advisor</A>
        </div>
      </Rise>
      <Rise delay={22}><Sub>Live competitor-price intelligence — priced per call,<br />built for AI agents and sellers.</Sub></Rise>
      <Rise delay={34} style={{ marginTop: 40, display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", maxWidth: 1200 }}>
        {chips.map((c) => (
          <span key={c} style={{ fontFamily: FONT_MONO, fontSize: 30, border: `1px solid ${C.line}`, color: C.muted, borderRadius: 999, padding: "9px 26px" }}>{c}</span>
        ))}
      </Rise>
    </Stage>
  );
};

// ── Scene 4 · HOW (terminal) ────────────────────────────────────────────────
const LINES: [string, string][] = [
  ["cmd", "$ curl -X POST pricecheck.web.id/ebay \\"],
  ["cmd", "    -d '{\"query\":\"logitech mx master 3s\",\"my_price\":95,\"my_cost\":62}'"],
  ["p402", "← 402 Payment Required · $0.40 · USDT0 on X Layer (eip155:196)"],
  ["note", "  # agent signs & pays via x402 — no signup, no API key"],
  ["ok", "← 200 OK · settled on-chain"],
  ["json", "  { leader: \"$70.98 by noelfelipe\", offers: 17, yourRank: \"10/18\","],
  ["json", "    recommendation: \"Win\", price: 70.97, nextActions: [...] }"],
];
const LCOLOR: Record<string, string> = { cmd: C.text, p402: C.accent, note: C.muted, ok: C.win, json: "#B7C3D9" };
export const SceneHow: React.FC = () => {
  const frame = useCurrentFrame();
  const start = 24;
  const cps = 1.1; // chars per frame
  const revealed = Math.max(0, (frame - start) * cps);
  let budget = revealed;
  const shown = LINES.map(([cls, text]) => {
    const take = Math.max(0, Math.min(text.length, Math.floor(budget)));
    budget -= text.length + 6; // gap between lines
    return [cls, text.slice(0, take), take > 0] as [string, string, boolean];
  });
  const caretOn = Math.floor(frame / 15) % 2 === 0;
  return (
    <Stage>
      <Rise delay={2}><H1 size={92}>One call. <A>Machine-payable.</A></H1></Rise>
      <Rise delay={9} style={{ marginTop: 30 }}>
        <div style={{ width: 1360, background: C.panel2, border: `1px solid ${C.line}`, borderRadius: 22, textAlign: "left", fontFamily: FONT_MONO, fontSize: 34, lineHeight: 1.55, padding: "36px 44px", minHeight: 340, boxSizing: "border-box" }}>
          <div style={{ display: "flex", gap: 13, marginBottom: 26 }}>
            {[0, 1, 2].map((i) => <span key={i} style={{ width: 20, height: 20, borderRadius: "50%", background: C.line }} />)}
          </div>
          {shown.map(([cls, text, on], i) => on ? (
            <div key={i} style={{ color: LCOLOR[cls], whiteSpace: "pre-wrap" }}>{text}
              {i === shown.filter((x) => x[2]).length - 1 && caretOn ? <span style={{ color: C.accent }}>▍</span> : null}
            </div>
          ) : null)}
        </div>
      </Rise>
      <Rise delay={16}><Sub>Your agent pays <B>$0.40 in USDT0 on X Layer</B> via x402 — no signup, no API key — and gets an answer in seconds.</Sub></Rise>
    </Stage>
  );
};

// ── Scene 5 · STRATEGIES ────────────────────────────────────────────────────
export const SceneStrategies: React.FC = () => {
  const strats: [string, string, string, "win" | "floor" | "", boolean][] = [
    ["Win", "$70.97", "Undercut the leader by 1¢ and take the top spot.", "win", true],
    ["Match", "$70.98", "Stay competitive without starting a price war.", "", false],
    ["Premium Hold", "$135.49", "Hold high — lean on rating, shipping and returns.", "", false],
    ["Margin Floor", "$62.00", "Your cost. Never price below it — no loss-making “wins”.", "floor", false],
  ];
  return (
    <Stage>
      <Rise delay={2}><H1 size={100}>Not one number.<br />A <A>strategy menu.</A></H1></Rise>
      <Rise delay={12} style={{ marginTop: 44 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 26, width: 1520 }}>
          {strats.map(([n, v, d, kind, rec], i) => (
            <div key={i} style={{
              background: C.panel, border: `1px solid ${kind === "win" ? C.win : C.line}`, borderRadius: 20,
              padding: 34, textAlign: "left", position: "relative",
            }}>
              {rec ? <div style={{ position: "absolute", top: -18, right: 22, background: C.win, color: C.stage, fontSize: 22, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", borderRadius: 999, padding: "6px 18px" }}>Recommended</div> : null}
              <div style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 27 }}>{n}</div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 78, marginTop: 12, color: kind === "win" ? C.win : kind === "floor" ? C.lose : C.text, ...tnum }}>{v}</div>
              <div style={{ color: C.muted, fontSize: 27, lineHeight: 1.4, marginTop: 12 }}>{d}</div>
            </div>
          ))}
        </div>
      </Rise>
      <Rise delay={40}><Sub>Computed from <B>17 live offers</B> — with your margin as a hard floor.</Sub></Rise>
    </Stage>
  );
};

// ── Scene 6 · BEST PRICE SCAN ───────────────────────────────────────────────
export const SceneScan: React.FC = () => {
  const rows: [string, string, boolean][] = [
    ["ebay.com", "$70.98", true], ["amazon.com", "$71.49", false], ["aliexpress.com", "$72.40", false],
    ["shopee.co.id", "$73.10*", false], ["walmart.com", "$74.99", false], ["target.com", "$79.99", false], ["etsy.com", "$84.00", false],
  ];
  return (
    <Stage>
      <Rise delay={2}><H1 size={100}>One product. Every marketplace.<br /><A>One call.</A></H1></Rise>
      <Rise delay={12} style={{ marginTop: 40 }}>
        <div style={{ width: 1120, display: "flex", flexDirection: "column", gap: 14 }}>
          {rows.map(([m, p, best], i) => (
            <Rise key={m} delay={14 + i * 5}>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                background: best ? `linear-gradient(90deg, rgba(242,130,12,.14), ${C.panel})` : C.panel,
                border: `1px solid ${best ? C.accent : C.line}`, borderRadius: 16, padding: "18px 34px", fontSize: 38,
              }}>
                <span style={{ fontFamily: FONT_MONO, color: best ? C.accent : C.muted }}>{m}</span>
                {best ? <span style={{ fontSize: 26, letterSpacing: "0.18em", textTransform: "uppercase", color: C.accent, fontWeight: 700 }}>Cheapest</span> : null}
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: 50, color: best ? C.accent : C.text, ...tnum }}>{p}</span>
              </div>
            </Rise>
          ))}
        </div>
      </Rise>
      <Rise delay={58}><Sub>Best Price Scan · <B>$1.50</B> · fans out in parallel — one slow marketplace never sinks the scan.<br /><span style={{ fontSize: 26 }}>*converted from Rp at disclosed ranking-only rates</span></Sub></Rise>
    </Stage>
  );
};

// ── Scene 7 · WHY ───────────────────────────────────────────────────────────
export const SceneWhy: React.FC = () => {
  const pillars: [string, React.ReactNode][] = [
    ["x402-native", <><B>Pay per call.</B> No subscription, no key management — settled on-chain on X Layer in USDT0.</>],
    ["Agent-ready", <>Every answer ships <B>nextActions</B> — composable hints so an AI agent keeps the flow going alone.</>],
    ["Honest evidence", <>Every figure cites <B>live listings</B>, with caveats stated — never a black-box number.</>],
  ];
  return (
    <Stage>
      <Rise delay={2}><H1 size={100}>Built for the <A>agent economy.</A></H1></Rise>
      <Rise delay={12} style={{ marginTop: 50 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 30, width: 1520 }}>
          {pillars.map(([t, body], i) => (
            <Rise key={i} delay={16 + i * 6}>
              <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 20, padding: 42, textAlign: "left", height: "100%", boxSizing: "border-box" }}>
                <div style={{ fontFamily: FONT_DISPLAY, textTransform: "uppercase", fontSize: 48, color: C.accent }}>{t}</div>
                <p style={{ color: C.muted, fontSize: 31, lineHeight: 1.5, marginTop: 16 }}>{body}</p>
              </div>
            </Rise>
          ))}
        </div>
      </Rise>
    </Stage>
  );
};

// ── Scene 8 · OUTRO ─────────────────────────────────────────────────────────
export const SceneOutro: React.FC = () => (
  <Stage>
    <Rise delay={3}><div style={{ fontSize: 110, color: C.accent }}>◈</div></Rise>
    <Rise delay={8}><div style={{ fontFamily: FONT_DISPLAY, textTransform: "uppercase", fontSize: 118, lineHeight: 0.95, marginTop: 10 }}>Competitor <A>Price Advisor</A></div></Rise>
    <Rise delay={18}><div style={{ fontFamily: FONT_MONO, fontSize: 58, color: C.accent, marginTop: 24 }}>pricecheck.web.id</div></Rise>
    <Rise delay={28}><Sub>Free preview: <B>POST /preview/*</B> · Paid: <B>$0.40/call</B> · Scan: <B>$1.50</B><br />Built on OKX x402 · X Layer · USDT0</Sub></Rise>
  </Stage>
);
