// Content loader for the Remotion bundle (browser). Scripts use scripts/lib/content.ts instead.
// require.context lets webpack pick up new lessons and art without a code change.
import charactersRaw from "../../content/characters.yaml";
import {
  backgroundRigSchema,
  characterRigSchema,
  charactersFileSchema,
  parseWith,
  parseYamlWith,
  storySchema,
  timingsSchema,
  type BackgroundRig,
  type Character,
  type CharacterRig,
  type Story,
  type Timings,
} from "../schema/content";

const stories = require.context("../../content/lessons", true, /^\.\/lesson-\d+\/story\.yaml$/);
const timings = require.context("../../content/lessons", true, /^\.\/lesson-\d+\/timings\.json$/);
const characterRigs = require.context("../../public/characters", true, /^\.\/[^/]+\/rig\.json$/);
const backgroundRigs = require.context("../../public/backgrounds", true, /^\.\/[^/]+\/rig\.json$/);

const folderOf = (key: string) => key.split("/")[1]!;
const keyFor = (folder: string, file: string) => `./${folder}/${file}`;

export const getLessonIds = (): string[] => stories.keys().map(folderOf).sort();

export const getStory = (lessonId: string): Story =>
  parseYamlWith(storySchema, stories(keyFor(lessonId, "story.yaml")) as string, `${lessonId}/story.yaml`);

export const getTimings = (lessonId: string): Timings | null => {
  const key = keyFor(lessonId, "timings.json");
  return timings.keys().includes(key) ? parseWith(timingsSchema, timings(key), `${lessonId}/timings.json`) : null;
};

let characters: Character[] | null = null;
export const getCharacters = (): Character[] => {
  characters ??= parseYamlWith(charactersFileSchema, charactersRaw, "content/characters.yaml").characters;
  return characters;
};

export const getCharacter = (id: string): Character | undefined => getCharacters().find((c) => c.id === id);

export const getCharacterRig = (id: string): CharacterRig | null => {
  const key = keyFor(id, "rig.json");
  return characterRigs.keys().includes(key)
    ? parseWith(characterRigSchema, characterRigs(key), `public/characters/${id}/rig.json`)
    : null;
};

export const getBackgroundRig = (location: string): BackgroundRig | null => {
  const key = keyFor(location, "rig.json");
  return backgroundRigs.keys().includes(key)
    ? parseWith(backgroundRigSchema, backgroundRigs(key), `public/backgrounds/${location}/rig.json`)
    : null;
};
