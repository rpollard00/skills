export const SPIKE = {
  id: "Spike",
  durationInSeconds: 5,
  // Screen pixels per virtual pixel. Must divide the composition width and height.
  pixelScale: 4,
  // Relative to public/. Written by `npm run audio`.
  audioFile: "audio/spike-pad.wav",
} as const;
