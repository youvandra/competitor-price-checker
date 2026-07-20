// Palette + type tokens for the Competitor Price Advisor demo video.
// Deep trading-terminal ground, brand-orange accent, green/red for win/lose.
import { loadFont as loadDisplay } from "@remotion/google-fonts/Sora";
import { loadFont as loadBody } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

// Bundled + self-hosted by Remotion at build time — render never depends on a
// runtime system font, so type is pixel-identical every time.
const { fontFamily: DISPLAY } = loadDisplay();
const { fontFamily: BODY } = loadBody();
const { fontFamily: MONO } = loadMono();

export const FONT_DISPLAY = DISPLAY;
export const FONT_BODY = BODY;
export const FONT_MONO = MONO;

export const C = {
  bg: "#05070C",
  stage: "#0A0E16",
  stage2: "#0E131E",
  panel: "#141B29",
  panel2: "#0F1622",
  line: "#232D40",
  line2: "#31405C",
  text: "#F4F1E9",
  muted: "#93A0B4",
  faint: "#5C6880",
  accent: "#F2820C",
  accent2: "#FBB454",
  win: "#37D689",
  lose: "#F0555B",
};

export const FPS = 30;

// Scene lengths in seconds -> frames. Order matches Video.tsx.
export const SCENES_SEC = [13, 11, 6.5, 12.5, 11, 8.5, 8.5, 8];
export const sec = (s: number) => Math.round(s * FPS);
export const SCENE_FRAMES = SCENES_SEC.map(sec);
export const TOTAL_FRAMES = SCENE_FRAMES.reduce((a, b) => a + b, 0);
