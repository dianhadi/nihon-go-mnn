// pnpm srt lesson-XX
// Writes subtitles/<lang>.srt for every language, using the same timeline as the video.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { SUBTITLE_LANGS } from "../src/config";
import { buildTimeline } from "../src/engine/timeline";
import { lessonDir, parseLessonArg, readStory, readTimings, readTranslation } from "./lib/content";

const lessonId = parseLessonArg(process.argv[2]);
const story = readStory(lessonId);
const timings = readTimings(lessonId);
if (!timings) {
  console.error(`${lessonId} has no timings.json. Run pnpm align ${lessonId} first.`);
  process.exit(1);
}
const timeline = buildTimeline(story, timings);

const stamp = (sec: number) => {
  const ms = Math.round(sec * 1000);
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(Math.floor(ms / 3_600_000))}:${pad(Math.floor(ms / 60_000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`;
};

const outDir = path.join(lessonDir(lessonId), "subtitles");
mkdirSync(outDir, { recursive: true });

for (const lang of SUBTITLE_LANGS) {
  const translation = lang === "ja" ? null : readTranslation(lessonId, lang);
  if (lang !== "ja" && !translation) {
    console.warn(`skip  ${lang}: no i18n/${lang}.yaml`);
    continue;
  }
  const missing: string[] = [];
  const cues = timeline.lines.flatMap(({ line, startSec, endSec }) => {
    const text = lang === "ja" ? line.ja : translation?.[line.id];
    if (!text) {
      missing.push(line.id);
      return [];
    }
    return [{ startSec, endSec, text }];
  });
  const srt = cues.map((c, i) => `${i + 1}\n${stamp(c.startSec)} --> ${stamp(c.endSec)}\n${c.text}\n`).join("\n");
  writeFileSync(path.join(outDir, `${lang}.srt`), srt, "utf8");
  console.log(`wrote ${lang}.srt (${cues.length} cues)${missing.length ? `, missing: ${missing.join(", ")}` : ""}`);
}
