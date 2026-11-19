import { TIMING } from "../config";
import type { Line, Scene, Story, Timings } from "../schema/content";

export type TimedLine = { line: Line; sceneId: string; startSec: number; endSec: number };
export type TimedScene = { scene: Scene; startSec: number; endSec: number };

// All times are seconds from the start of the video (intro included).
export type Timeline = {
  lines: TimedLine[];
  scenes: TimedScene[];
  audioStartSec: number;
  durationSec: number;
  estimated: boolean;
};

const estimateLineTimes = (lines: Line[]) => {
  const { secPerChar, minLineSec, gapSec } = TIMING.estimate;
  let t = 0;
  return lines.map((line) => {
    const duration = Math.max(minLineSec, [...line.ja].length * secPerChar);
    const span = { startSec: t, endSec: t + duration };
    t += duration + gapSec + (line.pause ?? 0);
    return span;
  });
};

const alignedLineTimes = (lines: Line[], timings: Timings) => {
  const byId = new Map(timings.lines.map((l) => [l.id, l]));
  return lines.map((line) => {
    const t = byId.get(line.id);
    if (!t) {
      throw new Error(`timings.json has no entry for ${line.id}; re-run pnpm align`);
    }
    return { startSec: t.startSec, endSec: t.endSec };
  });
};

export const buildTimeline = (story: Story, timings: Timings | null): Timeline => {
  const flat = story.scenes.flatMap((scene) => scene.lines.map((line) => ({ line, sceneId: scene.id })));
  const spans = timings
    ? alignedLineTimes(flat.map((f) => f.line), timings)
    : estimateLineTimes(flat.map((f) => f.line));

  const intro = TIMING.introSec;
  const lines: TimedLine[] = flat.map((f, i) => ({
    ...f,
    startSec: intro + spans[i]!.startSec,
    endSec: intro + spans[i]!.endSec,
  }));

  const lastLineEnd = lines.at(-1)?.endSec ?? intro;
  const audioEnd = timings ? intro + timings.durationSec : lastLineEnd;
  const durationSec = Math.max(audioEnd, lastLineEnd) + TIMING.outroSec;

  // Scene boundaries sit halfway between the last line of one scene and the first line of the next.
  const firstStart = (sceneId: string) => lines.find((l) => l.sceneId === sceneId)!.startSec;
  const lastEnd = (sceneId: string) => lines.findLast((l) => l.sceneId === sceneId)!.endSec;
  const boundaries = story.scenes.map((scene, i) => {
    if (i === 0) return 0;
    const prev = story.scenes[i - 1]!;
    return (lastEnd(prev.id) + firstStart(scene.id)) / 2;
  });
  const scenes: TimedScene[] = story.scenes.map((scene, i) => ({
    scene,
    startSec: boundaries[i]!,
    endSec: boundaries[i + 1] ?? durationSec,
  }));

  return { lines, scenes, audioStartSec: intro, durationSec, estimated: !timings };
};

export const toFrame = (sec: number, fps: number) => Math.round(sec * fps);
