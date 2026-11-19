# nihon-go-mnn

Illustrated short story videos based on the **会話 (kaiwa)** of *Minna no Nihongo Shokyu II* (lessons 26–50), built with [Remotion](https://www.remotion.dev/).

Each lesson's kaiwa is expanded into an original 3–5 minute story, voiced with ElevenLabs, and rendered as a 16:9 video for YouTube. There is no dialogue text on screen. Subtitles are shipped as separate `.srt` files (Japanese, English, Indonesian, Bengali, Burmese, and Nepali) so viewers can choose to listen with or without them.

The videos are stories, not lessons: no explanations, quizzes, or grammar notes. Just Japanese at the right level, in context.

## How it works

```
book photos + original kaiwa (local only)
        │
        ▼
expanded story script (story.yaml)  ──►  translations (i18n/{en,id,bn,my,ne}.yaml)
        │
        ▼
pnpm export-voice  ──►  paste into ElevenLabs  ──►  one audio file per lesson
        │
        ▼
pnpm align (local Whisper)  ──►  timings.json (per-line timestamps)
        │
        ▼
Remotion renders scenes + reusable characters, timed by timings.json
        │
        ├──► out/lesson-XX.mp4
        └──► subtitles/{ja,en,id,bn,my,ne}.srt
```

- **Data-driven:** one generic composition renders every lesson from its data.
- **Reusable cast:** the same characters appear in lessons 26–50. Each one is built once as a component with poses, expressions, and lip movement.
- **Layered 2D anime art:** characters are PNG layers (body, eyes, mouth, brows, hair) animated in Remotion, with blinking and lip-sync from the audio. Backgrounds are layered for parallax.
- **Original artwork:** all illustrations are drawn for this project. Book images are only used as private reference.

## Requirements

- Node.js (LTS)
- pnpm
- An ElevenLabs account (audio is generated manually there; no API key needed)
- cmake (`brew install cmake`), used to build whisper.cpp on the first `pnpm align` run. The Whisper model (~1.6 GB) is downloaded into `.cache/` at the same time.

## Getting started

```bash
pnpm install
pnpm dev                 # open Remotion Studio
pnpm export-voice lesson-26  # script to paste into ElevenLabs
pnpm align lesson-26     # per-line timings from the audio file
pnpm validate            # check content files and timings
pnpm srt lesson-26       # generate subtitle files
pnpm render lesson-26    # render to out/lesson-26.mp4
```

## Adding a lesson

1. Put book photos and the original kaiwa in `source/lesson-XX/`. This folder is gitignored and never committed.
2. Write the expanded story in `content/lessons/lesson-XX/story.yaml`.
3. Make sure every character and location in the story has art in `public/characters/` and `public/backgrounds/`. Placeholders are rendered until it does.
4. Add translations in `content/lessons/lesson-XX/i18n/<lang>.yaml` for `en`, `id`, `bn`, `my`, and `ne`.
5. Run `pnpm export-voice lesson-XX`, paste `out/lesson-XX/elevenlabs.txt` into ElevenLabs, generate the audio, and save it as `public/audio/lesson-XX.mp3`. Short pauses between lines help alignment.
6. Run `pnpm align lesson-XX` to create `timings.json`.
7. Run `pnpm validate`, then preview with `pnpm dev`.
8. Run `pnpm srt lesson-XX` and `pnpm render lesson-XX`.

Audio files are not committed to git (too large). Keep your own backup of each lesson's ElevenLabs export; `timings.json` is committed.

## Project structure

See [AGENTS.md](AGENTS.md) for the full layout, content schema, and conventions. It is written for AI coding agents, but it is also the most detailed technical reference for people.

## Copyright note

*Minna no Nihongo* is published by 3A Corporation. This repository does not contain or distribute the book's text, audio, or illustrations. Stories, artwork, and audio here are original works inspired by the lessons' themes.
