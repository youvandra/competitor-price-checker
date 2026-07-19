import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate } from "remotion";
import { C, SCENE_FRAMES } from "./theme";
import {
  SceneHook, ScenePain, SceneReveal, SceneHow,
  SceneStrategies, SceneScan, SceneWhy, SceneOutro,
} from "./scenes";

const FADE = 9;

// Fades a scene in over the first FADE frames and out over the last, so cuts
// between sequences read as soft dissolves rather than hard jumps.
const Fade: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, FADE, dur - FADE, dur],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

export const Video: React.FC = () => {
  const scenes = [
    SceneHook, ScenePain, SceneReveal, SceneHow,
    SceneStrategies, SceneScan, SceneWhy, SceneOutro,
  ];
  let from = 0;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {scenes.map((Scene, i) => {
        const dur = SCENE_FRAMES[i];
        const seq = (
          <Sequence key={i} from={from} durationInFrames={dur}>
            <Fade dur={dur}><Scene /></Fade>
          </Sequence>
        );
        from += dur;
        return seq;
      })}
    </AbsoluteFill>
  );
};
