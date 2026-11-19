import { AbsoluteFill } from "remotion";

// Shown until public/backgrounds/<location>/ has art.
export const PlaceholderBackground: React.FC<{ location: string; floorY: number }> = ({ location, floorY }) => (
  <AbsoluteFill style={{ background: "linear-gradient(#cfe3f2, #eef4f8)" }}>
    <div style={{ position: "absolute", left: 0, right: 0, top: floorY, bottom: 0, background: "#c9b9a3" }} />
    <div
      style={{
        position: "absolute",
        top: 40,
        left: 60,
        fontFamily: "sans-serif",
        fontSize: 36,
        color: "#0006",
      }}
    >
      background: {location}
    </div>
  </AbsoluteFill>
);
