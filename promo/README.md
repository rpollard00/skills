# Mako promo

A 97.6 s film made with Remotion, React Three Fiber, and synthesized audio. The contract is `.artifacts/mako-promo/treatment.md` in the repository root.

All copy and timing are in `src/film/`. All colors are in `src/theme.ts`. The skill and playbook names are generated from `../skills`.

## Part 1: for a maintainer

### Commands

Run all commands in `promo/`.

| Command | Result |
| --- | --- |
| `npm run sync` | Writes `src/catalog.generated.ts` from `../skills`. Fails if the counts differ from the count sentence in `../README.md`. |
| `npm run check` | Runs the 8 rules of treatment section 6. Prints every failure and exits 1. |
| `npm run storyboard` | Prints each shot: start, length, card, words, seconds needed, source. |
| `npm run stills` | Writes one PNG for each card to `out/stills/`, and `out/stills/contact-sheet.png`. Add `-- --all` for every shot. About 10 s. |
| `npm run audio` | Writes `public/audio/music.wav`, `sfx.wav`, and `manifest.json` from the same timeline as the picture. About 10 s. |
| `npm run audio -- --verify` | Does the same, then measures the written files: format, level of each music section, and the position and level of each effect. Exits 1 if a measure fails. |
| `npm run studio` | Opens Remotion Studio on port 3123. |
| `npm run typecheck` | Runs `tsc`. |
| `npm run render` | Runs sync, typecheck, check, and audio, then renders `out/mako-promo.mp4`: 1920x1080, 30 fps, H.264 with AAC audio. The full run takes a little more than 2 minutes on the build machine. |

To render the picture with no audio and no audio check:

```bash
npx remotion render MakoPromo out/animatic.mp4 --props='{"audio":false}'
```

If the render stops with `Audio is stale. Run: npm run audio`, the film data changed after the last audio run. Run `npm run audio`.

`npm run check` does not run `tsc`. Run `npm run typecheck` after each edit to `src/film/`.

### (a) Change a card

1. Open `src/film/<scene>.ts`. Find the shot. Edit `card.lines`.
2. If the card states a product fact, set `source: quote("<file>", "<text>")`. The file path starts at the repository root. The text must occur in the file.
3. Run `npm run check`. It fails if the card has more than 12 words, more than 2 lines, more than 30 characters in a line, less than 0.5 s for each word, or a quote that is not in its file.
4. Run `npm run stills` and look at the card.

Use `{skills}`, `{playbooks}`, `{engineering}`, `{principles}`, or `{craft}` for a count. Do not type a count. A change of copy does not make the audio stale.

### (b) Retime or reorder

- Length of a shot: edit `beats` of the shot in `src/film/<scene>.ts`. One beat is 0.4 s. Each scene must stay a whole number of 4-beat bars.
- Time of an event: edit `at` of the cue or effect. `at` counts beats from the start of its shot, in steps of 0.25.
- Order of shots: move the shot in the `shots` object. The key order is the running order.
- Order of scenes: move the scene in `scenes` in `src/film/index.ts`.
- Tempo: edit `framesPerBeat` in `src/film/index.ts`. It must be a multiple of 4. With the 244 beats of today, only 12 gives a film of 75 s to 100 s. For another tempo, change shot lengths in the same edit. `npm run check` lists what does not fit.

Then run `npm run storyboard`, `npm run check`, and `npm run render`. Starts are running sums, so no other number changes. The audio follows because `npm run render` writes it again. Until then, a still or a render with audio stops with `Audio is stale`.

Two pairs of scenes depend on their order:

- The report scene starts from the green cover that ends the battle, and it reads the final battle state. Keep `battle` before `report`.
- The night camera of the Well is one path from the start of `title` to the end of `goal` (`src/scenes/well/path.ts`). Keep `goal` directly after `title`.

### (c) A skill is added to the repository

1. Edit the count sentence in `../README.md`. A count can be digits or a word such as `six`.
2. If the skill is a design, version-control, or writing skill, add its name to `CRAFT_SKILLS` in `src/catalog.ts`. A name that starts with `principle-` is a principle. All other names are engineering skills.
3. Run `npm run sync`. It fails until the counts in `../README.md` agree with `../skills`.
4. Run `npm run check`, then `npm run render`.

A new playbook in `../skills/mako/playbooks/` needs steps 1, 3, and 4 only.

The cards, the orb grid, the legend, the `LOADED` counter, and the plate number of the playbook follow the new counts. No scene file changes.

### (d) Swap the accent

Edit `accent` and `accentText` of `THEMES.dark` or `THEMES.paper` in `src/theme.ts`. Run `npm run check`: text on the accent must be at least 4.5:1. Run `npm run stills`. Every scene takes the accent from the theme, so no other file changes, and the audio does not become stale.

## Part 2: for a change to a scene

### The scene files

Each scene kind has `src/film/<kind>.ts` (its copy and times) and `src/scenes/<kind>/` (its component, its local parts, and `contract.ts`).

| Directory in `src/scenes/` | Content |
| --- | --- |
| `title/`, `goal/`, `end/` | One component each. All three draw the Well. |
| `well/` | The Well: the 3D picture, the night and day looks, the camera path, and the interface parts that the three scenes share. It is not a scene kind. |
| `playbooks/` | The list with its cursor and scroll (`list.ts`) and the plate of each playbook (`plate.ts`, a port of neorp `renderPlate`). |
| `equip/` | The slots, the orb grid, and the flight of an orb to its slot (`flight.ts`). |
| `battle/` | The label bar and the two windows (`Hud.tsx`), the events of each turn (`Events.tsx`, `Claim.tsx`, `Open.tsx`), and the 3D gate (`stage/`). `timing.ts` has lengths of motion. The time of each event is in `src/film/battle.ts`. |
| `report/` | The ascent, the sheet, the stamp, and the row of loaded orbs. |

`src/scenes/index.ts` is the registry of the seven components.

A scene component has the type `SceneFC<"<kind>">`. `Film.tsx` renders it inside a `Frame` of the scene's theme and a `Sequence` of the scene's length, so it draws directly on the 480x270 grid.

To add a cue or a label, add its name to `contract.ts` and its value to `src/film/<kind>.ts`. Each one without the other is a compile error. Keep `contract.ts` free of React imports.

Add a color to `src/theme.ts` only. `npm run check` rejects a hex value in another file.

### `useSceneClock(scene)`

```ts
import { useSceneClock, type SceneFC } from "../../useSceneClock";

const clock = useSceneClock(scene);
```

| Member | Meaning |
| --- | --- |
| `clock.shot` | Id of the shot on screen. A union of the shot ids of your contract. |
| `clock.beat` | Beats since the scene start. Has a fraction. |
| `clock.sinceShot("mark")` | Beats since that shot started. Negative before it. |
| `clock.cue("mark.confirm")` | State of a cue: `since` (beats since the first hit, negative before it), `progress` (0 to 1 across `span`), `span`, `hits` (beats since each hit of a repeated cue), `fired` (hits so far). |
| `clock.label("mark.kicker")` | Text of a label, with count tokens replaced. |
| `clock.card` | The card of the shot on screen, or `null`: `lines`, `source`, `age` in beats. |
| `clock.frame` | Frame since the scene start. |
| `clock.filmFrame` | Frame since the film start. Use it for motion that continues across a cut. |
| `clock.fps`, `clock.framesPerBeat` | For a length in frames or seconds. |

Data that is not a label is in `scene.props`. Its type is `props` of your contract. Other data:

- `TASK` from `src/film/task.ts`: the example goal, playbook, loadout, conditions, and report values.
- `CATALOG`, `ENTRY_POINTS`, `kindOf`, `skillLabel`, `playbookLabel`, `playbookNumber` from `src/catalog.ts`.
- `battleAt({ task: TASK, scene, beat: clock.beat })` from `src/battle.ts`: the battle state at a beat. It has the cursor, ticks, party, context levels, the member in front (`acting`: `actor`, `since`, `previous`), loaded skills, work, conditions, the finding, the claim, hits, and the gate. `FINAL_BATTLE` from `src/film` is the state after the last effect.

A battle turn has effects and cues. An effect changes the battle state, and its sound comes from its kind. A cue is a named time for the picture.

The `act` effect puts a member in front and has no sound. A `cursor` and a `reject` put Mako in front. A `hit` and a `claim` put their actor in front. `npm run check` fails if an `act`, a `hit`, or a `claim` names a member that is not in the party yet.

### Kit (`src/kit`)

Positions and sizes are in cells. One cell is 4 px. A fraction rounds to a whole cell. A part takes its theme from the nearest `Frame`.

| Part | Use |
| --- | --- |
| `Frame`, `Box`, `cells` | The root, a rectangle with an optional flat fill, and cells to px. |
| `useTheme`, `ThemeScope` | The tokens of the current theme. A different theme for a part of the frame. |
| `ChromeHeader` | The chrome field in rows 0 to 10 with the wordmark tile and a 12-row dither edge. |
| `LabelBar` | The 9-row plate label bar: accent chip, caption, note. Optional dither edge. |
| `Window`, `windowBody` | Chrome title bar, dither edge, flat body, 1-cell border. Children position against the body. |
| `MessageWindow` | One card with its source file. `MESSAGE_COLS` x `MESSAGE_ROWS` cells. |
| `Reveal`, `OPEN_FRAMES` | Opens a part by whole rows from one row, as a window opens. `open` is 0 to 1. `stepped(age, OPEN_FRAMES)` gives the usual 4 frames. |
| `Menu`, `MESSAGE`, `paneBody` | The frame of a menu screen: two windows that open over the message window at `MESSAGE`. The playbooks and equip scenes use it. `paneBody` gives the body of a window in frame cells. |
| `Row`, `ROW_CURSOR` | A list line. `selected` gives the full-row accent cursor. `done` gives a tick. `ROW_CURSOR` is the square of that cursor, in cells from the corner of the row. |
| `Gauge` | A level: solid for the filled part, checker for the empty part. |
| `Chip` | A tag. Tones: `accent`, `proven`, `chrome`, `quiet`. |
| `Checker` | A checkerboard of 2-cell squares. It means "not proven". |
| `DitherField` | An ordered dither of one color. `level` is a number or a function of the cell. |
| `DitherEdge` | A 12-row linear dither, up or down. |
| `Cover` | A full-frame Bayer cover in a named color, from an edge or the center. |
| `Cells`, `cellPath` | Your own pixel art: one flat-color path from a function of the cell. |
| `PixelText`, `pixelTextWidth` | The 5x7 pixel font: A to Z, 0 to 9, `/ . : -`, space, and lowercase `m a k o`. Another character throws. |
| `Wordmark`, `wordmarkSize` | The `mako` tile. |
| `Orb` | A skill orb in the ramp and center mark of its kind. `dim` drops cells one ramp step. |
| `Label`, `labelWidth` | Mono label text. One character is exactly 5 cells wide, so `labelWidth` gives the width. |
| `Display` | Heavy wide uppercase text, 52 px by default. It drops the font's kerning for ten pairs, such as `W.`, where the kerning makes the ink touch. |
| `bayer8`, `clamp`, `clamp01`, `lerp`, `mod`, `step`, `progress`, `quantize`, `framesSince`, `stepped`, `fullOnLastFrame`, `ease*`, `mulberry32`, `fnv1a`, `coverLevel` | Pure helpers. `framesSince` gives beats as whole frames. `fullOnLastFrame` is `stepped` with no floor and no clamp. |

Keep text below the 12-row dither edge of a window in the paper theme. Ink on chrome dots is not legible.

See every part in both themes:

```bash
npx remotion still src/dev/kit.tsx Kit out/kit/dark.png --frame=0 --bundle-cache=false
npx remotion still src/dev/kit.tsx Kit out/kit/paper.png --frame=1 --bundle-cache=false
```

### WebGL (`src/gl`)

| Part | Use |
| --- | --- |
| `PixelStage` | A canvas with one texel for each cell, shown 4x with no smoothing. Transparent where a fragment discards. Use one in a scene. |
| `RampMaterial` | The one material. Your fragment code defines `void shade(out float t, out float a)`. The shared code writes one flat color of `ramp`, or discards by ordered dither. |
| `stageCamera` | A camera as plain matrices for this frame: `viewProjection`, `right`, `up`. Pass them as uniforms. |
| `mixVec`, `strip` | A point between two world points. The positions and indices of a strip from (0, 0) to (1, 1). |
| `Ribbons` | Instanced energy ribbons: `count`, `radius`, `height`, `seed`, `time`, `camera`, `width`. |
| `GLSL_BAYER8`, `GLSL_HASH`, `GLSL_NOISE`, `GLSL_RAMP`, `FULLSCREEN_VERTEX` | Shader chunks. `RampMaterial` adds the first four to each fragment shader. |

Set `frustumCulled={false}` on each mesh. The stage does not use the React Three Fiber camera.

### Stills of one scene

Each scene has an entry in `src/dev/` that registers only that scene as the composition `Scene`, with no audio. It works when the code of another scene is broken. The frame counts from the scene start.

```bash
npx remotion still src/dev/<kind>.tsx Scene out/<kind>/<name>.png --frame=<frame> --bundle-cache=false
```

`--bundle-cache=false` is necessary. Several workers render at the same time, and a shared cache mixes their bundles. Write only below `out/<kind>/`.

To prove that a region of a still is pixel art (each 4x4 block is one flat color from `theme.ts`):

```bash
npx tsx scripts/pixel-check.ts out/<kind>/<name>.png "gate=160,40,160,120"
```

The region is `name=x,y,w,h` in cells.

### Determinism rules

Remotion renders frames in any order. A frame must depend on its frame number only. `npm run check` rejects most violations.

- Take all time from `useSceneClock` or `useCurrentFrame()`.
- Do not use `Math.random`, `Date.now`, `performance.now`, `useState`, `useEffect`, `useFrame`, a CSS `transition`, or a CSS `animation`.
- Do not read the `useFrame` clock, the React Three Fiber `clock`, or a three.js `Clock` or `Timer`. They follow wall time, not the frame number. `npm run check` rejects `new Clock(`, `new Timer(`, `.clock`, `getElapsedTime`, `getElapsed`, `elapsedTime`, and `getDelta`. It matches text, so `props.clock` fails also for a scene clock. Destructure a scene clock.
- `npm run check` reads the source text as it is. A banned name in a comment also fails.
- Pass shader values through `RampMaterial` `uniforms`. A mutated uniforms object does not reach the shader.
- Make random values with `mulberry32(seed)` in `useMemo`.
- Compute state as a fold over the events at or before the frame, as `battleAt` does. Do not keep state between frames.
- Do not use a CSS `background-image` or `mask-image`. Remotion does not wait for them to load. Use `Cells` or `DitherField`.
- Use flat color only: no gradient, opacity, blur, shadow, or rounded corner. A fade is a `DitherField`.

### Audio

`src/audio/` is Node only and is never in the bundle. `scripts/audio.ts` reads `audioView(TIMELINE)` from `src/timeline.ts`, which gives the tempo, the music sections, every sound hit, and `audioHash`. It deletes the manifest, writes the two WAV files, and then writes `{ "audioHash": "<hash>" }` to `AUDIO_FILES.manifest`. The film compares that hash with its own timeline.

Each hit has `sfx`, `frame`, `ordinal`, `count`, and `spanFrames`. `spanFrames` is the span of the cue in frames, and 0 for a cue with no span and for a battle effect. An effect that runs for a length, such as typing, fills it. The effects of one kind in one battle turn share `count`, and their `ordinal` rises, as the hits of one repeated cue do.

| File in `src/audio/` | Content |
| --- | --- |
| `ids.ts` | The fixed sound effect and music section ids. Film data uses only these. |
| `score.ts` | The audio view to two stems. |
| `sections.ts`, `arrangement.ts`, `instruments.ts`, `harmony.ts` | The music: one function for each section id, its mixer, the voices, and the scale. |
| `sfx.ts` | One recipe for each sound effect id. |
| `dsp.ts` | Signal primitives and the WAV writer. |
| `analyze.ts`, `spectrum.ts` | The measures of `npm run audio -- --verify`. |
| `audition.ts`, `fixture.ts` | `npx tsx src/audio/audition.ts` writes each effect and a mix to `out/audio/` from a hand-made view, for listening. |

A shot can name a voiceover file with `vo`. `Film.tsx` plays it and lowers the music to 35% for that shot.

## Known limits

- A full render is not always bit-identical on this machine. Between two renders of the same source, one frame can differ by a few cells (one cell is 4 px). The probable cause is GPU rasterization, but this is not proven: one of the frames that differed was DOM text. One frame that is rendered twice has always matched. A software GL renderer (`Config.setChromiumOpenGlRenderer("swangle")` in `remotion.config.ts`) can remove the difference. Nobody has tested this on the full film. It is slower: about 17 frames per second in the pipeline test.
- The film has no voiceover. A shot can name a voiceover file with `vo`, and the music lowers while it plays.
- The battle draws exactly three acceptance conditions, one for each level of the gate. Two types hold the number. In `src/film/task.ts`, `conditions` is a tuple of three. In `src/scenes/battle/world.ts`, `levels` of `GATE` must be equal to the number of conditions. `npm run typecheck` fails when a condition is added or removed. `npm run render` runs the typecheck first, so it stops too. `npm run check` alone does not run `tsc`.
- Nobody has listened to the audio. All audio checks are measurements.
