// Content loader for Node scripts. The Remotion bundle uses src/engine/bundle-content.ts instead.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  charactersFileSchema,
  lessonIdSchema,
  parseWith,
  parseYamlWith,
  storySchema,
  timingsSchema,
  translationSchema,
  type Character,
  type Story,
  type Timings,
  type Translation,
} from "../../src/schema/content";

export const ROOT = path.resolve(import.meta.dirname, "../..");
export const PUBLIC_DIR = path.join(ROOT, "public");
export const LESSONS_DIR = path.join(ROOT, "content/lessons");
export const CACHE_DIR = path.join(ROOT, ".cache");
export const OUT_DIR = path.join(ROOT, "out");

export const lessonDir = (lessonId: string) => path.join(LESSONS_DIR, lessonId);
export const timingsPath = (lessonId: string) => path.join(lessonDir(lessonId), "timings.json");
export const publicPath = (staticPath: string) => path.join(PUBLIC_DIR, staticPath);

export const listLessons = (): string[] =>
  existsSync(LESSONS_DIR)
    ? readdirSync(LESSONS_DIR)
        .filter((d) => existsSync(path.join(LESSONS_DIR, d, "story.yaml")))
        .sort()
    : [];

// Accepts "lesson-26" or "26".
export const parseLessonArg = (arg: string | undefined): string => {
  if (!arg) {
    console.error("Usage: pnpm <command> lesson-XX");
    process.exit(1);
  }
  const id = /^\d+$/.test(arg) ? `lesson-${arg}` : arg;
  const result = lessonIdSchema.safeParse(id);
  if (!result.success) {
    console.error(`Invalid lesson "${arg}". Expected lesson-26 … lesson-50.`);
    process.exit(1);
  }
  if (!existsSync(path.join(lessonDir(id), "story.yaml"))) {
    console.error(`No story found at content/lessons/${id}/story.yaml`);
    process.exit(1);
  }
  return id;
};

export const readCharacters = (): Character[] =>
  parseYamlWith(
    charactersFileSchema,
    readFileSync(path.join(ROOT, "content/characters.yaml"), "utf8"),
    "content/characters.yaml",
  ).characters;

export const readStory = (lessonId: string): Story =>
  parseYamlWith(storySchema, readFileSync(path.join(lessonDir(lessonId), "story.yaml"), "utf8"), `${lessonId}/story.yaml`);

export const readTimings = (lessonId: string): Timings | null => {
  const file = timingsPath(lessonId);
  return existsSync(file)
    ? parseWith(timingsSchema, JSON.parse(readFileSync(file, "utf8")), `${lessonId}/timings.json`)
    : null;
};

export const readTranslation = (lessonId: string, lang: string): Translation | null => {
  const file = path.join(lessonDir(lessonId), "i18n", `${lang}.yaml`);
  return existsSync(file) ? parseYamlWith(translationSchema, readFileSync(file, "utf8"), `${lessonId}/i18n/${lang}.yaml`) : null;
};

export const sha256 = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
export const fileHash = (file: string) => sha256(readFileSync(file));
export const linesHash = (lines: Timings["lines"]) => sha256(JSON.stringify(lines));
