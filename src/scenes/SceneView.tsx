import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { CHARACTER_SCREEN_HEIGHT, DEFAULT_EXPRESSION, TIMING } from "../config";
import { Character } from "../characters/Character";
import type { TimedLine, TimedScene } from "../engine/timeline";
import { Background, useStage } from "./Background";

// Characters keep the expression/pose of their latest line until their next one.
const latestDirection = (lines: TimedLine[], speaker: string, nowSec: number) => {
  const spoken = lines.filter((l) => l.line.speaker === speaker && l.startSec <= nowSec);
  return {
    expression: spoken.findLast((l) => l.line.expression)?.line.expression ?? DEFAULT_EXPRESSION,
    pose: spoken.findLast((l) => l.line.pose)?.line.pose,
  };
};

export const SceneView: React.FC<{ timedScene: TimedScene; lines: TimedLine[] }> = ({ timedScene, lines }) => {
  const frame = useCurrentFrame();
  const { fps, width, durationInFrames } = useVideoConfig();
  const { scene, startSec } = timedScene;
  const nowSec = startSec + frame / fps;
  const { floorY, slots } = useStage(scene.location);

  const sceneLines = lines.filter((l) => l.sceneId === scene.id);
  const active = sceneLines.find((l) => nowSec >= l.startSec && nowSec < l.endSec);

  const fadeFrames = Math.round(TIMING.sceneFadeSec * fps);
  const opacity = interpolate(
    frame,
    [0, fadeFrames, durationInFrames - fadeFrames, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const positions =
    slots?.slice(0, scene.cast.length) ?? scene.cast.map((_, i) => (width * (i + 1)) / (scene.cast.length + 1));

  return (
    <AbsoluteFill style={{ opacity }}>
      <Background location={scene.location} />
      {scene.cast.map((id, i) => {
        const x = positions[i] ?? width / 2;
        return (
          <Character
            key={id}
            id={id}
            {...latestDirection(sceneLines, id, nowSec)}
            talking={active?.line.speaker === id}
            facing={x < width / 2 ? "right" : "left"}
            x={x}
            floorY={floorY}
            height={CHARACTER_SCREEN_HEIGHT}
          />
        );
      })}
    </AbsoluteFill>
  );
};
