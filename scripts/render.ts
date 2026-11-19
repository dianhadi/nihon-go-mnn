// pnpm render lesson-XX [extra remotion render flags]
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { audioStaticPath } from "../src/engine/paths";
import { OUT_DIR, parseLessonArg, publicPath, readTimings } from "./lib/content";

const lessonId = parseLessonArg(process.argv[2]);
if (!readTimings(lessonId)) {
  console.error(`${lessonId} has no timings.json. Run pnpm align ${lessonId} first.`);
  process.exit(1);
}
if (!existsSync(publicPath(audioStaticPath(lessonId)))) {
  console.error(`Missing public/${audioStaticPath(lessonId)}.`);
  process.exit(1);
}

const out = path.join(OUT_DIR, `${lessonId}.mp4`);
const result = spawnSync("pnpm", ["exec", "remotion", "render", lessonId, out, ...process.argv.slice(3)], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);
