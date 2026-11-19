import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { BACKGROUND_CANVAS } from "../config";
import { getBackgroundRig } from "../engine/bundle-content";
import { backgroundLayerPath } from "../engine/paths";
import { PlaceholderBackground } from "../placeholders/PlaceholderBackground";

// Slow push-in over the scene; nearer layers move more for parallax.
const PARALLAX = { far: 0.02, mid: 0.035, near: 0.05 } as const;

export const useStage = (location: string) => {
  const { width, height } = useVideoConfig();
  const rig = getBackgroundRig(location);
  const scale = width / BACKGROUND_CANVAS.width;
  return {
    rig,
    floorY: rig ? rig.floorY * scale : height * 0.92,
    slots: rig ? rig.slots.map((s) => s * scale) : null,
  };
};

export const Background: React.FC<{ location: string }> = ({ location }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const { rig, floorY } = useStage(location);
  if (!rig) return <PlaceholderBackground location={location} floorY={floorY} />;

  const progress = interpolate(frame, [0, durationInFrames], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      {rig.layers.map((layer) => (
        <Img
          key={layer}
          src={staticFile(backgroundLayerPath(location, layer))}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${1 + PARALLAX[layer] * progress})`,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};
