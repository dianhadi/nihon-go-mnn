// pnpm validate [lesson-XX]
// Errors fail the run; warnings (missing art, missing translations, missing audio) do not.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { TRANSLATION_LANGS } from "../src/config";
import { audioStaticPath, backgroundLayerPath, characterLayerPath } from "../src/engine/paths";
import {
  allLines,
  backgroundRigSchema,
  characterRigSchema,
  checkStory,
  parseWith,
  type Character,
} from "../src/schema/content";
import {
  fileHash,
  linesHash,
  listLessons,
  parseLessonArg,
  PUBLIC_DIR,
  publicPath,
  readCharacters,
  readStory,
  readTimings,
  readTranslation,
} from "./lib/content";

const errors: string[] = [];
const warnings: string[] = [];

// Returns undefined when fn throws (the error is recorded), so null can still mean "not present".
const attempt = <T>(label: string, fn: () => T): T | undefined => {
  try {
    return fn();
  } catch (e) {
    errors.push(`${label}: ${(e as Error).message}`);
    return undefined;
  }
};

const rigFolders = (kind: "characters" | "backgrounds") => {
  const dir = path.join(PUBLIC_DIR, kind);
  return existsSync(dir) ? readdirSync(dir).filter((d) => existsSync(path.join(dir, d, "rig.json"))) : [];
};

const validateCharacterArt = (id: string) => {
  const rig = attempt(`characters/${id}`, () =>
    parseWith(characterRigSchema, JSON.parse(readFileSync(publicPath(`characters/${id}/rig.json`), "utf8")), "rig.json"),
  );
  if (!rig) return;
  const layers = [
    ...(rig.hairBack ? ["hair-back"] : []),
    ...(rig.hairFront ? ["hair-front"] : []),
    ...rig.poses.map((p) => `body/${p}`),
    ...rig.expressions.flatMap((e) => [
      `brows/${e}`,
      ...["open", "half", "closed"].map((s) => `eyes/${e}-${s}`),
      ...["closed", "half", "open"].map((s) => `mouth/${e}-${s}`),
    ]),
    ...rig.extras.map((x) => `extras/${x}`),
  ];
  for (const layer of layers) {
    if (!existsSync(publicPath(characterLayerPath(id, layer)))) {
      errors.push(`characters/${id}: missing ${layer}.png`);
    }
  }
  if (!rig.expressions.includes("neutral")) errors.push(`characters/${id}: "neutral" expression is required`);
};

const validateBackgroundArt = (location: string) => {
  const rig = attempt(`backgrounds/${location}`, () =>
    parseWith(backgroundRigSchema, JSON.parse(readFileSync(publicPath(`backgrounds/${location}/rig.json`), "utf8")), "rig.json"),
  );
  for (const layer of rig?.layers ?? []) {
    if (!existsSync(publicPath(backgroundLayerPath(location, layer)))) {
      errors.push(`backgrounds/${location}: missing ${layer}.png`);
    }
  }
};

const validateLesson = (lessonId: string, characters: Character[]) => {
  const story = attempt(lessonId, () => readStory(lessonId));
  if (!story) return;
  errors.push(...checkStory(lessonId, story, characters).map((e) => `${lessonId}: ${e}`));

  const ids = allLines(story).map((l) => l.id);
  const idSet = new Set(ids);

  for (const lang of TRANSLATION_LANGS) {
    const tr = attempt(`${lessonId}/i18n/${lang}`, () => readTranslation(lessonId, lang));
    if (tr === undefined) continue;
    if (!tr) {
      warnings.push(`${lessonId}: no i18n/${lang}.yaml`);
      continue;
    }
    const missing = ids.filter((id) => !tr[id]?.trim());
    if (missing.length) warnings.push(`${lessonId}/${lang}: missing ${missing.join(", ")}`);
    for (const id of Object.keys(tr)) {
      if (!idSet.has(id)) errors.push(`${lessonId}/${lang}: unknown line id ${id}`);
    }
  }

  const audio = publicPath(audioStaticPath(lessonId));
  const timings = attempt(`${lessonId}/timings.json`, () => readTimings(lessonId));
  if (timings === undefined) return;
  if (timings === null) {
    warnings.push(`${lessonId}: no timings.json yet (preview uses estimated timing)`);
    return;
  }
  const timed = timings.lines.map((l) => l.id);
  if (timed.join() !== ids.join()) {
    errors.push(`${lessonId}: timings.json lines do not match story.yaml; re-run pnpm align`);
  }
  timings.lines.forEach((l, i) => {
    if (l.endSec <= l.startSec) errors.push(`${lessonId}: ${l.id} ends before it starts`);
    const prev = timings.lines[i - 1];
    if (prev && l.startSec < prev.startSec) errors.push(`${lessonId}: ${l.id} starts before ${prev.id}`);
  });
  if (!existsSync(audio)) {
    warnings.push(`${lessonId}: audio file public/${audioStaticPath(lessonId)} not found (needed to render)`);
  } else if (fileHash(audio) !== timings.audioHash) {
    errors.push(`${lessonId}: audio changed since timings.json was made; re-run pnpm align`);
  }
  if (linesHash(timings.lines) !== timings.linesHash) {
    warnings.push(`${lessonId}: timings.json has manual edits`);
  }

  const characterArt = new Set(rigFolders("characters"));
  const backgroundArt = new Set(rigFolders("backgrounds"));
  for (const scene of story.scenes) {
    if (!backgroundArt.has(scene.location)) warnings.push(`${lessonId}: no art for location "${scene.location}" (placeholder)`);
    for (const id of scene.cast) {
      if (!characterArt.has(id)) warnings.push(`${lessonId}: no art for character "${id}" (placeholder)`);
    }
  }
};

const characters = attempt("content/characters.yaml", readCharacters) ?? [];
rigFolders("characters").forEach(validateCharacterArt);
rigFolders("backgrounds").forEach(validateBackgroundArt);
const lessons = process.argv[2] ? [parseLessonArg(process.argv[2])] : listLessons();
lessons.forEach((l) => validateLesson(l, characters));

for (const w of new Set(warnings)) console.warn(`warn  ${w}`);
for (const e of errors) console.error(`error ${e}`);
console.log(`\n${lessons.length} lesson(s) checked: ${errors.length} error(s), ${new Set(warnings).size} warning(s).`);
process.exit(errors.length ? 1 : 0);
