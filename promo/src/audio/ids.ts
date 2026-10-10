export const SFX_IDS = [
  "boot",
  "stamp",
  "cursor",
  "confirm",
  "deny",
  "type",
  "window",
  "orbPick",
  "slot",
  "trigger",
  "encounter",
  "spawn",
  "scan",
  "record",
  "hit",
  "finding",
  "fixed",
  "gateSlam",
  "reject",
  "prove",
  "fail",
  "gateOpen",
  "rise",
  "wipe",
  "tally",
] as const;

export type SfxId = (typeof SFX_IDS)[number];

const MUSIC_IDS = [
  "well",
  "pulse",
  "menu",
  "battle",
  "proof",
  "build",
  "resolve",
  "report",
  "outro",
] as const;

export type MusicId = (typeof MUSIC_IDS)[number];
