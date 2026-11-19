import { getWaveformPortion, useWindowedAudioData } from "@remotion/media-utils";
import { createContext, useContext } from "react";
import { random, useCurrentFrame, useVideoConfig } from "remotion";

// Loudness of the voice track at the current frame (mean absolute amplitude).
// Only the character whose line is active uses it, so one value for the whole video is enough.
const SpeechLevelContext = createContext(0);

export const useSpeechLevel = () => useContext(SpeechLevelContext);

const FromAudio: React.FC<{ src: string; audioStartSec: number; children: React.ReactNode }> = ({
  src,
  audioStartSec,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const audioFrame = frame - Math.round(audioStartSec * fps);
  const { audioData, dataOffsetInSeconds } = useWindowedAudioData({
    src,
    frame: Math.max(0, audioFrame),
    fps,
    windowInSeconds: 10,
  });
  const level =
    audioData && audioFrame >= 0
      ? (getWaveformPortion({
          audioData,
          startTimeInSeconds: audioFrame / fps,
          durationInSeconds: 1 / fps,
          numberOfSamples: 1,
          dataOffsetInSeconds,
          normalize: false,
        })[0]?.amplitude ?? 0)
      : 0;
  return <SpeechLevelContext.Provider value={level}>{children}</SpeechLevelContext.Provider>;
};

// Without audio (before the lesson is voiced), flap the mouth pseudo-randomly.
const Simulated: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const level = 0.1 * random(`mouth-${Math.floor(frame / 3)}`);
  return <SpeechLevelContext.Provider value={level}>{children}</SpeechLevelContext.Provider>;
};

export const SpeechLevelProvider: React.FC<{
  src: string | null;
  audioStartSec: number;
  children: React.ReactNode;
}> = ({ src, audioStartSec, children }) =>
  src ? (
    <FromAudio src={src} audioStartSec={audioStartSec}>
      {children}
    </FromAudio>
  ) : (
    <Simulated>{children}</Simulated>
  );
