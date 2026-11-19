// pnpm align lesson-XX [--force] [--model large-v3-turbo]
// Transcribes public/audio/<lesson>.mp3 locally with whisper.cpp and matches the transcript
// to story.yaml line by line, writing content/lessons/<lesson>/timings.json.
import { downloadWhisperModel, installWhisperCpp, transcribe, type WhisperModel } from "@remotion/install-whisper-cpp";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { audioStaticPath } from "../src/engine/paths";
import { allLines, type Timings } from "../src/schema/content";
import {
  CACHE_DIR,
  fileHash,
  linesHash,
  parseLessonArg,
  publicPath,
  readStory,
  readTimings,
  timingsPath,
} from "./lib/content";

const WHISPER_VERSION = "1.7.6";
const WHISPER_DIR = path.join(CACHE_DIR, "whisper.cpp");
const LOW_CONFIDENCE = 0.6;

const args = process.argv.slice(2);
const lessonId = parseLessonArg(args[0]);
const force = args.includes("--force");
const modelArg = args[args.indexOf("--model") + 1];
const model = (args.includes("--model") && modelArg ? modelArg : "large-v3-turbo") as WhisperModel;

const audio = publicPath(audioStaticPath(lessonId));
if (!existsSync(audio)) {
  console.error(`Missing public/${audioStaticPath(lessonId)}. Generate it in ElevenLabs first.`);
  process.exit(1);
}

const existing = readTimings(lessonId);
if (existing && linesHash(existing.lines) !== existing.linesHash && !force) {
  console.error("timings.json has manual edits. Re-run with --force to overwrite them.");
  process.exit(1);
}

// --- Normalization -----------------------------------------------------------

// Compare on hiragana without punctuation or spaces, so kana/katakana and punctuation
// differences between the script and the transcript do not break the match.
const normalizeChar = (ch: string) => {
  const c = ch.normalize("NFKC").toLowerCase();
  if (/[\s\p{P}\p{S}]/u.test(c)) return "";
  const code = c.charCodeAt(0);
  return code >= 0x30a1 && code <= 0x30f6 ? String.fromCharCode(code - 0x60) : c;
};

// --- Audio → 16 kHz mono WAV ------------------------------------------------

const wavDir = path.join(CACHE_DIR, "align");
mkdirSync(wavDir, { recursive: true });
const wav = path.join(wavDir, `${lessonId}.wav`);
const ffmpeg = spawnSync("pnpm", ["exec", "remotion", "ffmpeg", "-y", "-i", audio, "-ar", "16000", "-ac", "1", wav], {
  stdio: ["ignore", "ignore", "inherit"],
});
if (ffmpeg.status !== 0) process.exit(1);

const wavDurationSec = (file: string) => {
  const buf = readFileSync(file);
  const byteRate = buf.readUInt32LE(28);
  for (let i = 12; i + 8 <= buf.length; ) {
    const id = buf.toString("ascii", i, i + 4);
    const size = buf.readUInt32LE(i + 4);
    if (id === "data") return size / byteRate;
    i += 8 + size + (size % 2);
  }
  throw new Error("WAV has no data chunk");
};

// --- Transcribe ---------------------------------------------------------------

if (spawnSync("cmake", ["--version"]).status !== 0 && !existsSync(WHISPER_DIR)) {
  console.error("whisper.cpp needs cmake to build. Install it with: brew install cmake");
  process.exit(1);
}
await installWhisperCpp({ to: WHISPER_DIR, version: WHISPER_VERSION, printOutput: false });
await downloadWhisperModel({ model, folder: WHISPER_DIR, printOutput: true });

console.log(`Transcribing ${lessonId} with ${model}…`);
const { transcription } = await transcribe({
  inputPath: wav,
  whisperPath: WHISPER_DIR,
  whisperCppVersion: WHISPER_VERSION,
  model,
  modelFolder: WHISPER_DIR,
  tokenLevelTimestamps: true,
  language: "ja",
  printOutput: false,
});
writeFileSync(path.join(wavDir, `${lessonId}.transcript.json`), JSON.stringify(transcription, null, 2));

// Spread each token's time span across its characters.
const heard: { ch: string; startSec: number; endSec: number }[] = [];
for (const token of transcription.flatMap((t) => t.tokens)) {
  if (token.text.startsWith("[_")) continue;
  const chars = [...token.text].map(normalizeChar).filter(Boolean);
  const from = token.offsets.from / 1000;
  const step = (token.offsets.to / 1000 - from) / Math.max(chars.length, 1);
  chars.forEach((ch, i) => heard.push({ ch, startSec: from + i * step, endSec: from + (i + 1) * step }));
}

// --- Align script characters to heard characters (edit distance) -------------

const lines = allLines(readStory(lessonId));
const script: { ch: string; line: number }[] = lines.flatMap((l, i) =>
  [...l.ja].map(normalizeChar).filter(Boolean).map((ch) => ({ ch, line: i })),
);

const n = script.length;
const m = heard.length;
const cost = new Uint32Array((n + 1) * (m + 1));
const at = (i: number, j: number) => i * (m + 1) + j;
for (let i = 0; i <= n; i++) cost[at(i, 0)] = i;
for (let j = 0; j <= m; j++) cost[at(0, j)] = j;
for (let i = 1; i <= n; i++) {
  for (let j = 1; j <= m; j++) {
    const sub = cost[at(i - 1, j - 1)]! + (script[i - 1]!.ch === heard[j - 1]!.ch ? 0 : 1);
    cost[at(i, j)] = Math.min(sub, cost[at(i - 1, j)]! + 1, cost[at(i, j - 1)]! + 1);
  }
}

// Walk back, recording which heard character each script character landed on.
const matchedTo = new Array<number | null>(n).fill(null);
const exact = new Array<boolean>(n).fill(false);
for (let i = n, j = m; i > 0 || j > 0; ) {
  if (i > 0 && j > 0) {
    const same = script[i - 1]!.ch === heard[j - 1]!.ch;
    if (cost[at(i, j)] === cost[at(i - 1, j - 1)]! + (same ? 0 : 1)) {
      matchedTo[i - 1] = j - 1;
      exact[i - 1] = same;
      i--;
      j--;
      continue;
    }
  }
  if (i > 0 && cost[at(i, j)] === cost[at(i - 1, j)]! + 1) i--;
  else j--;
}

// --- Per-line spans -----------------------------------------------------------

const durationSec = wavDurationSec(wav);
const spans = lines.map((line, li) => {
  const idx = script.map((s, i) => (s.line === li ? i : -1)).filter((i) => i >= 0);
  const hits = idx.map((i) => matchedTo[i]).filter((j): j is number => j !== null);
  const confidence = idx.length ? idx.filter((i) => exact[i]).length / idx.length : 0;
  return {
    id: line.id,
    startSec: hits.length ? heard[Math.min(...hits)]!.startSec : NaN,
    endSec: hits.length ? heard[Math.max(...hits)]!.endSec : NaN,
    confidence,
  };
});

// Lines with no match get the gap between their neighbours; then keep spans ordered and non-overlapping.
const round = (s: number) => Math.round(s * 1000) / 1000;
const result: Timings["lines"] = spans.map((s, i) => {
  const prevEnd = spans.slice(0, i).findLast((p) => !isNaN(p.endSec))?.endSec ?? 0;
  const nextStart = spans.slice(i + 1).find((p) => !isNaN(p.startSec))?.startSec ?? durationSec;
  const startSec = isNaN(s.startSec) ? prevEnd : Math.max(s.startSec, prevEnd);
  const endSec = isNaN(s.endSec) ? nextStart : Math.min(Math.max(s.endSec, startSec + 0.2), nextStart);
  return { id: s.id, startSec: round(startSec), endSec: round(Math.max(endSec, startSec + 0.05)), confidence: round(s.confidence) };
});

const timings: Timings = {
  audio: audioStaticPath(lessonId),
  audioHash: fileHash(audio),
  linesHash: linesHash(result),
  durationSec: round(durationSec),
  lines: result,
};
writeFileSync(timingsPath(lessonId), `${JSON.stringify(timings, null, 2)}\n`);
console.log(`Wrote content/lessons/${lessonId}/timings.json (${result.length} lines, ${durationSec.toFixed(1)}s)`);

const weak = result.filter((l) => (l.confidence ?? 0) < LOW_CONFIDENCE);
if (weak.length) {
  console.warn(`\nLow-confidence lines (check these in pnpm dev):`);
  for (const l of weak) console.warn(`  ${l.id}  ${l.startSec}s–${l.endSec}s  confidence ${l.confidence}`);
}
