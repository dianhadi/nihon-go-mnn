export const VIDEO = { width: 1920, height: 1080, fps: 30 } as const;

// Japanese subtitles come from story.yaml; every other language from i18n/<lang>.yaml.
export const SUBTITLE_LANGS = ["ja", "en", "id", "bn", "my", "ne"] as const;
export type SubtitleLang = (typeof SUBTITLE_LANGS)[number];
export const TRANSLATION_LANGS = SUBTITLE_LANGS.filter((l) => l !== "ja");

// Provisional values; see "Open decisions" in AGENTS.md.
export const TIMING = {
  introSec: 1,
  outroSec: 2,
  sceneFadeSec: 0.5,
  // Used only while a lesson has no timings.json yet.
  estimate: { secPerChar: 0.16, minLineSec: 1.2, gapSec: 0.4 },
} as const;

// Mean absolute sample amplitude thresholds for mouth shapes.
export const LIP_SYNC = { halfThreshold: 0.02, openThreshold: 0.06 } as const;

// Art canvas sizes (px). Backgrounds are drawn at 2x the video size.
export const BACKGROUND_CANVAS = { width: 3840, height: 2160 } as const;
export const CHARACTER_SCREEN_HEIGHT = 820;

export const DEFAULT_EXPRESSION = "neutral";
