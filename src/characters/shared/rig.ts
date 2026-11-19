import { random } from "remotion";
import { LIP_SYNC } from "../../config";

export type EyeState = "open" | "half" | "closed";
export type MouthState = "closed" | "half" | "open";
export type Facing = "left" | "right";

const BLINK_WINDOW_SEC = 4;
const BLINK_FRAMES: EyeState[] = ["half", "closed", "closed", "half"];

// One blink per 4 s window, at a seeded random offset inside the window.
export const eyeStateAt = (frame: number, fps: number, seed: string): EyeState => {
  const windowFrames = BLINK_WINDOW_SEC * fps;
  const window = Math.floor(frame / windowFrames);
  const offset = Math.floor(random(`${seed}-blink-${window}`) * (windowFrames - BLINK_FRAMES.length));
  const local = frame - window * windowFrames - offset;
  return BLINK_FRAMES[local] ?? "open";
};

export const mouthStateFor = (talking: boolean, level: number): MouthState => {
  if (!talking || level < LIP_SYNC.halfThreshold) return "closed";
  return level < LIP_SYNC.openThreshold ? "half" : "open";
};

// Subtle idle breathing: vertical scale around the feet.
export const breathingScale = (frame: number, fps: number, seed: string) => {
  const phase = random(`${seed}-breath`) * Math.PI * 2;
  return 1 + 0.006 * Math.sin((frame / fps) * ((Math.PI * 2) / 3.5) + phase);
};

// Small upward bob while speaking, following loudness.
export const talkBob = (talking: boolean, level: number) => (talking ? -Math.min(level, 0.15) * 40 : 0);
