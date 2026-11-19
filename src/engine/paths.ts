// Paths relative to public/, shared by the composition and the scripts.
export const audioStaticPath = (lessonId: string) => `audio/${lessonId}.mp3`;
export const characterLayerPath = (id: string, layer: string) => `characters/${id}/${layer}.png`;
export const backgroundLayerPath = (location: string, layer: string) => `backgrounds/${location}/${layer}.png`;
