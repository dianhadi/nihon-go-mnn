import { Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { DEFAULT_EXPRESSION } from "../config";
import { getCharacter, getCharacterRig } from "../engine/bundle-content";
import { characterLayerPath } from "../engine/paths";
import { useSpeechLevel } from "../engine/speech-level";
import { PlaceholderCharacter } from "../placeholders/PlaceholderCharacter";
import type { CharacterRig } from "../schema/content";
import { breathingScale, eyeStateAt, mouthStateFor, talkBob, type EyeState, type Facing, type MouthState } from "./shared/rig";

export type CharacterProps = {
  id: string;
  expression?: string;
  pose?: string;
  talking: boolean;
  facing: Facing;
  // Screen position of the character's feet (center bottom), in video px.
  x: number;
  floorY: number;
  height: number;
};

const layersFor = (rig: CharacterRig, pose: string, expression: string, eyes: EyeState, mouth: MouthState) => {
  const p = rig.poses.includes(pose) ? pose : rig.poses[0]!;
  const e = rig.expressions.includes(expression) ? expression : DEFAULT_EXPRESSION;
  const face = rig.faceOffsets[p] ?? { x: 0, y: 0 };
  return [
    ...(rig.hairBack ? [{ layer: "hair-back", offset: face }] : []),
    { layer: `body/${p}`, offset: { x: 0, y: 0 } },
    { layer: `eyes/${e}-${eyes}`, offset: face },
    { layer: `brows/${e}`, offset: face },
    { layer: `mouth/${e}-${mouth}`, offset: face },
    ...(rig.hairFront ? [{ layer: "hair-front", offset: face }] : []),
  ];
};

export const Character: React.FC<CharacterProps> = ({
  id,
  expression = DEFAULT_EXPRESSION,
  pose = "standing",
  talking,
  facing,
  x,
  floorY,
  height,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const level = useSpeechLevel();
  const rig = getCharacterRig(id);

  const eyes = eyeStateAt(frame, fps, id);
  const mouth = mouthStateFor(talking, level);
  const scaleY = breathingScale(frame, fps, id);
  const bob = talkBob(talking, level);
  const width = rig ? (height * rig.canvas.width) / rig.canvas.height : height * 0.4;

  return (
    <div
      style={{
        position: "absolute",
        left: x - width / 2,
        top: floorY - height + bob,
        width,
        height,
        transformOrigin: "50% 100%",
        transform: `scaleX(${rig && facing === "left" ? -1 : 1}) scaleY(${scaleY})`,
      }}
    >
      {rig ? (
        layersFor(rig, pose, expression, eyes, mouth).map(({ layer, offset }) => (
          <Img
            key={layer}
            src={staticFile(characterLayerPath(id, layer))}
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              transform: `translate(${(offset.x / rig.canvas.width) * 100}%, ${(offset.y / rig.canvas.height) * 100}%)`,
            }}
          />
        ))
      ) : (
        <PlaceholderCharacter
          label={getCharacter(id)?.name.en ?? id}
          expression={expression}
          color={getCharacter(id)?.color ?? "#7a8899"}
          eyes={eyes}
          mouth={mouth}
          facing={facing}
          height={height}
        />
      )}
    </div>
  );
};
