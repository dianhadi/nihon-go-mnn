import type { EyeState, Facing, MouthState } from "../characters/shared/rig";

// Silhouette shown until public/characters/<id>/ has art. Only the face is mirrored, so labels stay readable.
export const PlaceholderCharacter: React.FC<{
  label: string;
  expression: string;
  color: string;
  eyes: EyeState;
  mouth: MouthState;
  facing: Facing;
  height: number;
}> = ({ label, expression, color, eyes, mouth, facing, height }) => {
  const eyeHeight = { open: 22, half: 10, closed: 3 }[eyes];
  const mouthHeight = { closed: 4, half: 14, open: 26 }[mouth];
  return (
    <svg viewBox="0 0 400 1000" height={height} style={{ overflow: "visible" }}>
      <rect x={70} y={330} width={260} height={670} rx={110} fill={color} />
      <circle cx={200} cy={200} r={150} fill={color} />
      <g transform={facing === "left" ? "translate(400 0) scale(-1 1)" : undefined}>
        <rect x={225} y={175 - eyeHeight / 2} width={18} height={eyeHeight} rx={6} fill="#222" />
        <rect x={290} y={175 - eyeHeight / 2} width={18} height={eyeHeight} rx={6} fill="#222" />
        <rect x={250} y={255 - mouthHeight / 2} width={50} height={mouthHeight} rx={8} fill="#222" />
      </g>
      <text x={200} y={600} textAnchor="middle" fontSize={44} fontFamily="sans-serif" fill="#fff">
        {label}
      </text>
      <text x={200} y={660} textAnchor="middle" fontSize={30} fontFamily="sans-serif" fill="#fffa">
        {expression}
      </text>
    </svg>
  );
};
