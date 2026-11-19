import { parse } from "yaml";
import { z } from "zod";

const kebab = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const lessonIdSchema = z
  .string()
  .regex(/^lesson-(2[6-9]|[34]\d|50)$/, "lesson id must be lesson-26 … lesson-50");

export const characterSchema = z.object({
  id: z.string().regex(kebab),
  name: z.object({ ja: z.string(), en: z.string() }),
  // ElevenLabs voice name, for the user's reference only.
  voice: z.string().optional(),
  // Placeholder silhouette color until real art exists.
  color: z.string().optional(),
});

export const charactersFileSchema = z.object({
  characters: z.array(characterSchema).min(1),
});

export const lineSchema = z.object({
  id: z.string().regex(/^L\d{2}-\d{3}[a-z]?$/, "line id must look like L26-001 or L26-001a"),
  speaker: z.string(),
  ja: z.string().min(1),
  expression: z.string().optional(),
  pose: z.string().optional(),
  action: z.string().optional(),
  pause: z.number().nonnegative().optional(),
});

export const sceneSchema = z.object({
  id: z.string().regex(kebab),
  location: z.string().regex(kebab),
  cast: z.array(z.string()).min(1),
  lines: z.array(lineSchema).min(1),
});

export const storySchema = z.object({
  lesson: z.number().int().min(26).max(50),
  title: z.object({ ja: z.string(), en: z.string() }),
  scenes: z.array(sceneSchema).min(1),
});

export const translationSchema = z.record(z.string(), z.string());

export const timingsSchema = z.object({
  audio: z.string(),
  audioHash: z.string(),
  // Hash of `lines` as written by `pnpm align`; differs once someone edits timings by hand.
  linesHash: z.string(),
  durationSec: z.number().positive(),
  lines: z.array(
    z.object({
      id: z.string(),
      startSec: z.number().nonnegative(),
      endSec: z.number().nonnegative(),
      confidence: z.number().min(0).max(1).optional(),
    }),
  ),
});

export const characterRigSchema = z.object({
  canvas: z.object({ width: z.number().positive(), height: z.number().positive() }),
  poses: z.array(z.string()).min(1),
  expressions: z.array(z.string()).min(1),
  hairBack: z.boolean().default(false),
  hairFront: z.boolean().default(false),
  // Face layer offset (canvas px) for poses that move the head.
  faceOffsets: z.record(z.string(), z.object({ x: z.number(), y: z.number() })).default({}),
  extras: z.array(z.string()).default([]),
});

export const backgroundRigSchema = z.object({
  layers: z.array(z.enum(["far", "mid", "near"])).min(1),
  // In background canvas px (3840×2160).
  floorY: z.number(),
  slots: z.array(z.number()).min(1),
});

export type Character = z.infer<typeof characterSchema>;
export type Line = z.infer<typeof lineSchema>;
export type Scene = z.infer<typeof sceneSchema>;
export type Story = z.infer<typeof storySchema>;
export type Translation = z.infer<typeof translationSchema>;
export type Timings = z.infer<typeof timingsSchema>;
export type CharacterRig = z.infer<typeof characterRigSchema>;
export type BackgroundRig = z.infer<typeof backgroundRigSchema>;

export const parseYamlWith = <T extends z.ZodType>(schema: T, raw: string, label: string): z.infer<T> => {
  const result = schema.safeParse(parse(raw));
  if (!result.success) {
    throw new Error(`${label}: ${z.prettifyError(result.error)}`);
  }
  return result.data;
};

export const parseWith = <T extends z.ZodType>(schema: T, data: unknown, label: string): z.infer<T> => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`${label}: ${z.prettifyError(result.error)}`);
  }
  return result.data;
};

export const allLines = (story: Story): Line[] => story.scenes.flatMap((s) => s.lines);

// Cross-file checks the schemas cannot express. Returns error messages.
export const checkStory = (lessonId: string, story: Story, characters: Character[]): string[] => {
  const errors: string[] = [];
  const known = new Set(characters.map((c) => c.id));
  const prefix = `L${story.lesson}-`;
  if (lessonId !== `lesson-${story.lesson}`) {
    errors.push(`story.lesson is ${story.lesson} but folder is ${lessonId}`);
  }
  const seen = new Set<string>();
  for (const scene of story.scenes) {
    for (const id of scene.cast) {
      if (!known.has(id)) errors.push(`scene ${scene.id}: unknown character "${id}"`);
    }
    for (const line of scene.lines) {
      if (seen.has(line.id)) errors.push(`duplicate line id ${line.id}`);
      seen.add(line.id);
      if (!line.id.startsWith(prefix)) errors.push(`line ${line.id} should start with ${prefix}`);
      if (!scene.cast.includes(line.speaker)) {
        errors.push(`line ${line.id}: speaker "${line.speaker}" is not in scene ${scene.id} cast`);
      }
    }
  }
  return errors;
};
