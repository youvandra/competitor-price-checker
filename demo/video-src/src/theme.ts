// Palette + type tokens for the Competitor Price Checker demo video.
// Dark trading-terminal ground, single amber accent, green/red for win/lose.
export const C = {
  bg: "#05070C",
  stage: "#0B0F17",
  panel: "#131A28",
  panel2: "#0F1520",
  line: "#232D40",
  text: "#F2EFE6",
  muted: "#8B94A6",
  accent: "#F2820C",
  win: "#3DD68C",
  lose: "#E5484D",
};

// System faces — no external font files needed, so rendering never blocks on a
// download. A heavy condensed face carries the display headlines.
export const FONT_DISPLAY =
  '"Arial Narrow", "Helvetica Neue Condensed", "Avenir Next Condensed", Impact, sans-serif';
export const FONT_BODY =
  '"Avenir Next", "Helvetica Neue", Helvetica, Arial, sans-serif';
export const FONT_MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

export const FPS = 30;

// Scene lengths in seconds -> frames. Order matches Video.tsx.
export const SCENES_SEC = [9.5, 13, 8.5, 16.5, 12, 12, 10.5, 9];
export const sec = (s: number) => Math.round(s * FPS);
export const SCENE_FRAMES = SCENES_SEC.map(sec);
export const TOTAL_FRAMES = SCENE_FRAMES.reduce((a, b) => a + b, 0);
