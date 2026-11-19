import { Composition } from "remotion";
import { calculateLessonMetadata, LessonVideo } from "./compositions/LessonVideo";
import { VIDEO } from "./config";
import { getLessonIds } from "./engine/bundle-content";

export const RemotionRoot: React.FC = () => (
  <>
    {getLessonIds().map((lessonId) => (
      <Composition
        key={lessonId}
        id={lessonId}
        component={LessonVideo}
        width={VIDEO.width}
        height={VIDEO.height}
        fps={VIDEO.fps}
        durationInFrames={1}
        defaultProps={{ lessonId, hasAudio: false }}
        calculateMetadata={calculateLessonMetadata}
      />
    ))}
  </>
);
