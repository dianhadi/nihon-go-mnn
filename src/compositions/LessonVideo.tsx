import { useMemo } from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig, type CalculateMetadataFunction } from "remotion";
import { VIDEO } from "../config";
import { getStory, getTimings } from "../engine/bundle-content";
import { audioStaticPath } from "../engine/paths";
import { SpeechLevelProvider } from "../engine/speech-level";
import { buildTimeline, toFrame } from "../engine/timeline";
import { SceneView } from "../scenes/SceneView";

export type LessonVideoProps = {
  lessonId: string;
  // Set by calculateMetadata; the audio is gitignored and may not be present.
  hasAudio: boolean;
};

const audioExists = async (lessonId: string) => {
  try {
    const res = await fetch(staticFile(audioStaticPath(lessonId)), { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
};

export const calculateLessonMetadata: CalculateMetadataFunction<LessonVideoProps> = async ({ props }) => {
  const timeline = buildTimeline(getStory(props.lessonId), getTimings(props.lessonId));
  return {
    durationInFrames: Math.max(1, toFrame(timeline.durationSec, VIDEO.fps)),
    props: { ...props, hasAudio: await audioExists(props.lessonId) },
  };
};

export const LessonVideo: React.FC<LessonVideoProps> = ({ lessonId, hasAudio }) => {
  const { fps } = useVideoConfig();
  const timeline = useMemo(() => buildTimeline(getStory(lessonId), getTimings(lessonId)), [lessonId]);
  const audioSrc = hasAudio ? staticFile(audioStaticPath(lessonId)) : null;

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <SpeechLevelProvider src={audioSrc} audioStartSec={timeline.audioStartSec}>
        {timeline.scenes.map((ts) => {
          const from = toFrame(ts.startSec, fps);
          return (
            <Sequence key={ts.scene.id} from={from} durationInFrames={toFrame(ts.endSec, fps) - from} name={ts.scene.id}>
              <SceneView timedScene={ts} lines={timeline.lines} />
            </Sequence>
          );
        })}
      </SpeechLevelProvider>
      {audioSrc ? (
        <Sequence from={toFrame(timeline.audioStartSec, fps)} name="voice">
          <Audio src={audioSrc} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};
