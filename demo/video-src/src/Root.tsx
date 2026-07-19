import React from "react";
import { Composition } from "remotion";
import { Video } from "./Video";
import { FPS, TOTAL_FRAMES } from "./theme";

export const Root: React.FC = () => (
  <Composition
    id="Demo"
    component={Video}
    durationInFrames={TOTAL_FRAMES}
    fps={FPS}
    width={1920}
    height={1080}
  />
);
