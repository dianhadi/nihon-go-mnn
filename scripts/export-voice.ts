// pnpm export-voice lesson-XX [--plain]
// Writes out/<lesson>/elevenlabs.txt: the script to paste into ElevenLabs.
// Default format prefixes each line with the speaker ("ミラー: ...") to help assign voices;
// --plain writes the lines only, for pasting where a prefix would be spoken.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { OUT_DIR, parseLessonArg, readCharacters, readStory } from "./lib/content";

const lessonId = parseLessonArg(process.argv[2]);
const plain = process.argv.includes("--plain");
const story = readStory(lessonId);
const characters = new Map(readCharacters().map((c) => [c.id, c]));
const nameOf = (id: string) => characters.get(id)?.name.ja ?? id;

const speakers = [...new Set(story.scenes.flatMap((s) => s.lines.map((l) => l.speaker)))];
const header = [
  `# ${lessonId}: ${story.title.ja} (${story.title.en})`,
  "# Voices:",
  ...speakers.map((id) => `#   ${nameOf(id)} (${id}): ${characters.get(id)?.voice ?? "not set"}`),
  "",
];
const body = story.scenes.flatMap((scene) => scene.lines.map((l) => (plain ? l.ja : `${nameOf(l.speaker)}: ${l.ja}`)));

const outDir = path.join(OUT_DIR, lessonId);
mkdirSync(outDir, { recursive: true });
const file = path.join(outDir, plain ? "elevenlabs-plain.txt" : "elevenlabs.txt");
writeFileSync(file, `${plain ? "" : header.join("\n") + "\n"}${body.join("\n\n")}\n`);
console.log(`Wrote ${path.relative(process.cwd(), file)} (${body.length} lines, ${speakers.length} speakers)`);
console.log(`Save the generated audio as public/audio/${lessonId}.mp3, then run: pnpm align ${lessonId}`);
