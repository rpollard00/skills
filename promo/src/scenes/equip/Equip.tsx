import { Fragment } from "react";
import { CATALOG, playbookLabel, skillLabel, type SkillKind } from "../../catalog";
import { TASK } from "../../film/task";
import {
  Box,
  ChromeHeader,
  clamp01,
  framesSince,
  GLYPH_HEIGHT,
  Label,
  LabelBar,
  labelWidth,
  Menu,
  Orb,
  PixelText,
  pixelTextWidth,
  useTheme,
} from "../../kit";
import { KIND_RAMPS } from "../../theme";
import { useSceneClock, type CuePath, type SceneFC } from "../../useSceneClock";
import { flightPose, flightTrail } from "./flight";
import { bagLayout, BODY, centerOf, cornerOf, LEGEND, LINK, ORB, PANES, slabLayout, SOCKET } from "./layout";
import { Bands, DitherDisc, PickMark, Socket } from "./parts";

const FLIGHT_CUES = ["slot.first", "slot.second", "slot.third"] as const satisfies readonly CuePath<"equip">[];

const POP = { enter: [7, 11], land: [SOCKET, ORB + 2] } as const;
const SPOT_FRAMES = 3;
const RING = { to: 31, thick: 4 } as const;
const NUMERAL_SCALE = 8;
const COUNTER = { x: 8, scale: 4, gap: 6 } as const;
const DIM_SPREAD = 0.5;

export const Equip: SceneFC<"equip"> = ({ scene }) => {
  const clock = useSceneClock(scene);
  const theme = useTheme();
  const frames = (beats: number): number => framesSince(beats, clock.framesPerBeat);
  const { props } = scene;
  const { skills } = CATALOG;
  const total = skills.length;
  const bag = bagLayout(total, props.columns);
  const slab = slabLayout(props.slots);

  const flights = FLIGHT_CUES.flatMap((path, slot) => {
    const name = TASK.loadout[slot];
    const place = slab.slots[slot];
    if (name === undefined || place === undefined) return [];
    const index = skills.findIndex((skill) => skill.name === name);
    const skill = skills[index];
    if (skill === undefined) throw new Error(`The loadout skill "${name}" is not in the catalog.`);
    const cue = clock.cue(path);
    return [
      {
        slot,
        index,
        kind: skill.kind,
        label: skillLabel(name),
        since: cue.since,
        span: cue.span,
        from: centerOf(bag.cell(index), bag.orb),
        to: centerOf(place.socket, SOCKET),
      },
    ];
  });
  const landed = flights.filter((flight) => flight.since >= flight.span);
  const left = new Set(flights.filter((flight) => flight.since >= 0).map((flight) => flight.index));

  const fill = clock.cue("bag.fill");
  const fillFrames = Math.max(1, frames(fill.span));
  const fillFrame = frames(fill.since);
  const counted = fill.since < 0 ? 0 : Math.min(total, Math.ceil((total * (fillFrame + 1)) / fillFrames));
  const enterFrame = (index: number): number => Math.ceil(((index + 1) * fillFrames) / total) - 1;

  const legend = clock.cue("bag.legend");
  const spotAt = (framesAgo: number): SkillKind | null => {
    const row = legend.hits.findIndex((since) => {
      const then = since - framesAgo / clock.framesPerBeat;
      return then >= 0 && then < legend.span;
    });
    return props.legend[row]?.kind ?? null;
  };
  const recentSpots = Array.from({ length: SPOT_FRAMES }, (_, framesAgo) => spotAt(framesAgo));
  const spotDim = (kind: SkillKind): number =>
    recentSpots.filter((spot) => spot !== null && spot !== kind).length / SPOT_FRAMES;

  const sweep = clock.cue("triggers.dim").progress;
  const sweepDim = (column: number): number =>
    clamp01(sweep * (1 + DIM_SPREAD) - (DIM_SPREAD * column) / Math.max(1, props.columns - 1));

  const rings = clock.cue("triggers.rings");
  const open = Math.max(1, props.slots - flights.length);
  const waits = (slot: number): boolean =>
    slot >= flights.length && rings.since >= ((slot - flights.length) * rings.span) / Math.max(1, open - 1);

  const numeral = String(counted).padStart(String(total).length, "0");
  const numeralScale = Math.max(
    1,
    Math.min(NUMERAL_SCALE, Math.floor(bag.side.w / pixelTextWidth(numeral)), Math.floor(bag.side.h / GLYPH_HEIGHT)),
  );
  const loaded = clock.label("slot.loaded");
  const counterY = slab.rect.y + slab.rect.h + Math.floor((BODY.left.y + BODY.left.h - slab.rect.y - slab.rect.h - GLYPH_HEIGHT * COUNTER.scale) / 2);

  const countWidth = Math.max(...props.legend.map((row) => String(CATALOG.kindCounts[row.kind]).length));

  const bands = clock.cue("triggers.bands");

  const slabParts = (
    <>
      <Box x={slab.rect.x} y={slab.rect.y} w={slab.rect.w} h={slab.rect.h} fill={theme.chrome} />
      <LabelBar x={slab.rect.x} y={slab.rect.y} w={slab.rect.w} chip={clock.label("bag.plateId")} caption={playbookLabel(TASK.playbook)} />
      {slab.slots.map((place, slot) => {
        const flight = landed.find((candidate) => candidate.slot === slot);
        const waiting = flight === undefined && waits(slot);
        const size = flight === undefined ? ORB : (POP.land[frames(flight.since - flight.span)] ?? ORB);
        const orbAt = cornerOf(centerOf(place.socket, SOCKET), size);
        return (
          <Fragment key={slot}>
            {place.joinsBelow ? (
              <Box x={place.socket.x + LINK.inset} y={place.socket.y + SOCKET} w={LINK.w} h={LINK.h} fill={theme.mutedOnChrome} />
            ) : null}
            <Socket at={place.socket} state={flight !== undefined ? "loaded" : waiting ? "waiting" : "empty"} />
            {flight === undefined ? null : <Orb x={orbAt.x} y={orbAt.y} kind={flight.kind} size={size} />}
            {flight === undefined ? null : <Label x={place.label.x} y={place.label.y} h={SOCKET} text={flight.label} color={theme.onChrome} />}
            {waiting ? (
              <Label x={place.label.x} y={place.label.y} h={SOCKET} text={clock.label("triggers.onTrigger")} color={theme.mutedOnChrome} />
            ) : null}
          </Fragment>
        );
      })}
      {clock.sinceShot("slot") < 0 ? null : (
        <>
          <Label x={BODY.left.x + COUNTER.x} y={counterY} h={GLYPH_HEIGHT * COUNTER.scale} text={loaded} />
          <PixelText
            x={BODY.left.x + COUNTER.x + labelWidth(loaded) + COUNTER.gap}
            y={counterY}
            text={`${landed.length}/${total}`}
            scale={COUNTER.scale}
          />
        </>
      )}
    </>
  );

  const bagParts = (
    <>
      {skills.map((skill, index) => {
        const age = fillFrame - enterFrame(index);
        if (fill.since < 0 || age < 0 || left.has(index)) return null;
        const size = Math.min(bag.orb, POP.enter[age] ?? bag.orb);
        const at = cornerOf(centerOf(bag.cell(index), bag.orb), size);
        return (
          <Orb
            key={skill.name}
            x={at.x}
            y={at.y}
            kind={skill.kind}
            size={size}
            dim={Math.max(spotDim(skill.kind), sweepDim(bag.column(index)))}
          />
        );
      })}
      {counted === 0 ? null : (
        <PixelText
          x={bag.side.x + Math.round((bag.side.w - pixelTextWidth(numeral, numeralScale)) / 2)}
          y={bag.side.y + Math.round((bag.side.h - GLYPH_HEIGHT * numeralScale) / 2)}
          text={numeral}
          scale={numeralScale}
        />
      )}
      {props.legend.map((row, line) => {
        if ((legend.hits[line] ?? -1) < 0) return null;
        const y = bag.legend.y + line * LEGEND.pitch;
        const count = String(CATALOG.kindCounts[row.kind]).padStart(countWidth);
        return (
          <Fragment key={row.kind}>
            <Orb x={bag.legend.x} y={y} kind={row.kind} size={LEGEND.orb} />
            <Label x={bag.legend.x + LEGEND.orb + LEGEND.gap} y={y} h={LEGEND.orb} text={`${count} ${row.text}`} />
          </Fragment>
        );
      })}
    </>
  );

  return (
    <>
      <Bands count={props.bands} step={bands.since < 0 ? 0 : frames(bands.since) + 1} steps={frames(bands.span)} behind={theme.chrome}>
        <Menu
          age={frames(clock.cue("bag.open").since)}
          card={clock.card}
          cardAge={clock.card === null ? 0 : frames(clock.card.age)}
          left={{ rect: PANES.left, title: clock.label("bag.playbookTitle"), over: slabParts }}
          right={{ rect: PANES.right, title: clock.label("bag.skillsTitle"), over: bagParts }}
        />
        {flights.map((flight) => {
          const marked = flight.since >= -props.pickLead && flight.since < 0;
          const flying = flight.since >= 0 && flight.since < flight.span;
          const ring = (flight.since - flight.span) / props.landing;
          const ramp = KIND_RAMPS[flight.kind];
          const path = { from: flight.from, to: flight.to, u: flight.since / flight.span, size: bag.orb };
          const pose = flightPose(path);
          const at = cornerOf(pose.center, pose.size);
          return (
            <Fragment key={flight.slot}>
              {marked ? <PickMark center={flight.from} /> : null}
              {flying
                ? flightTrail(path).map((ghost, step) => (
                    <DitherDisc key={step} center={ghost.center} size={ghost.size} level={ghost.level} color={ramp[step < 2 ? 2 : 1]} />
                  ))
                : null}
              {flying ? <Orb x={at.x} y={at.y} kind={flight.kind} size={pose.size} /> : null}
              {ring >= 0 && ring < 1 ? (
                <DitherDisc
                  center={flight.to}
                  size={Math.round(SOCKET + (RING.to - SOCKET) * ring)}
                  hole={Math.round(SOCKET + (RING.to - SOCKET) * ring) - RING.thick}
                  level={1 - ring}
                  color={ramp[3]}
                />
              ) : null}
            </Fragment>
          );
        })}
      </Bands>
      <ChromeHeader />
    </>
  );
};
