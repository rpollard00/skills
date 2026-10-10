import type { SfxId } from "./audio/ids";
import type { SkillName } from "./catalog";
import type { ConditionId, Task } from "./film/task";
import type { SceneOf } from "./timeline";

export const ACTOR_IDS = ["mako", "explorer", "implementer", "reviewer"] as const;
export type ActorId = (typeof ACTOR_IDS)[number];
export type DelegateId = Exclude<ActorId, "mako">;

const COMMAND_IDS = ["how", "architect", "conditions", "build", "review", "verify", "report"] as const;
export type CommandId = (typeof COMMAND_IDS)[number];

/** `at` is beats after the turn starts, in quarter-beat steps. `over` is a length in beats. */
export type Effect =
  | { readonly kind: "cursor"; readonly at: number; readonly command: CommandId }
  | { readonly kind: "tick"; readonly at: number; readonly command: CommandId }
  | { readonly kind: "spawn"; readonly at: number; readonly actor: DelegateId }
  /** The member that the picture shows in front. A hit and a claim also put their actor in front. */
  | { readonly kind: "act"; readonly at: number; readonly actor: ActorId }
  | { readonly kind: "context"; readonly at: number; readonly actor: ActorId; readonly to: number; readonly over: number }
  | { readonly kind: "work"; readonly at: number; readonly to: number; readonly over: number }
  | { readonly kind: "load"; readonly at: number; readonly skill: SkillName }
  | { readonly kind: "record"; readonly at: number; readonly condition: ConditionId }
  | { readonly kind: "hit"; readonly at: number; readonly actor: ActorId }
  | { readonly kind: "finding"; readonly at: number }
  | { readonly kind: "fixed"; readonly at: number }
  | { readonly kind: "claim"; readonly at: number; readonly actor: ActorId }
  | { readonly kind: "reject"; readonly at: number }
  | { readonly kind: "check"; readonly at: number; readonly condition: ConditionId; readonly outcome: "proven" | "failed" };

/** An effect with its resolved time. `beat` is from the scene start. `frame` is from the film start. */
export interface TimedEffect {
  readonly effect: Effect;
  readonly beat: number;
  readonly frame: number;
}

export const effectSfx = (effect: Effect): SfxId | null => {
  switch (effect.kind) {
    case "cursor":
      return "cursor";
    case "tick":
      return "confirm";
    case "spawn":
      return "spawn";
    case "load":
      return "slot";
    case "record":
      return "record";
    case "hit":
      return "hit";
    case "finding":
      return "finding";
    case "fixed":
      return "fixed";
    case "reject":
      return "gateSlam";
    case "check":
      return effect.outcome === "proven" ? "prove" : "fail";
    case "act":
    case "context":
    case "work":
    case "claim":
      return null;
    default: {
      const _exhaustive: never = effect;
      return _exhaustive;
    }
  }
};

/** `since` is always a beat from the scene start. */
export type ConditionState =
  | { readonly kind: "unrecorded" }
  | { readonly kind: "open"; readonly since: number }
  | { readonly kind: "failed"; readonly since: number }
  | { readonly kind: "proven"; readonly since: number };

export type Member =
  | { readonly kind: "absent" }
  | { readonly kind: "present"; readonly since: number; readonly context: number };

export interface BattleState {
  readonly cursor: CommandId | null;
  /** Commands with a tick, in tick order. */
  readonly done: readonly CommandId[];
  readonly party: Readonly<Record<ActorId, Member>>;
  /** The member in front. Mako owns the checklist, the conditions, the checks, and the rejection. */
  readonly acting: { readonly actor: ActorId; readonly since: number; readonly previous: ActorId | null };
  /** The equip loadout (since 0), then each skill that a trigger loaded. */
  readonly loaded: readonly { readonly skill: SkillName; readonly since: number }[];
  /** 0 to 1. */
  readonly work: number;
  readonly conditions: readonly { readonly id: ConditionId; readonly text: string; readonly state: ConditionState }[];
  readonly recorded: number;
  readonly proven: number;
  readonly finding:
    | { readonly kind: "none" }
    | { readonly kind: "open"; readonly since: number }
    | { readonly kind: "fixed"; readonly since: number };
  readonly claim:
    | { readonly kind: "none" }
    | { readonly kind: "made"; readonly since: number; readonly actor: ActorId }
    | { readonly kind: "rejected"; readonly since: number; readonly actor: ActorId };
  /** Beats of each hit on the gate. */
  readonly hits: readonly { readonly actor: ActorId; readonly beat: number }[];
  /** Derived. Open only when at least one condition is recorded and every recorded condition is proven. */
  readonly gate: { readonly kind: "sealed" } | { readonly kind: "open"; readonly since: number };
}

interface Ramp {
  readonly from: number;
  readonly to: number;
  readonly start: number;
  readonly over: number;
}

const FLAT: Ramp = { from: 0, to: 0, start: 0, over: 0 };

const rampAt = (ramp: Ramp, beat: number): number => {
  if (ramp.over <= 0) return ramp.to;
  const progress = Math.min(1, Math.max(0, (beat - ramp.start) / ramp.over));
  return ramp.from + (ramp.to - ramp.from) * progress;
};

const deriveGate = (conditions: ReadonlyMap<ConditionId, ConditionState>): BattleState["gate"] => {
  let since = 0;
  let recorded = 0;
  for (const state of conditions.values()) {
    if (state.kind === "unrecorded") continue;
    recorded += 1;
    if (state.kind !== "proven") return { kind: "sealed" };
    since = Math.max(since, state.since);
  }
  return recorded === 0 ? { kind: "sealed" } : { kind: "open", since };
};

/** Folds every effect at or before `beat`. Call it new for each frame; it keeps no state. */
export const battleAt = ({
  task,
  scene,
  beat,
}: {
  readonly task: Task;
  readonly scene: SceneOf<"battle">;
  /** Beats from the scene start. `Infinity` gives the final state. */
  readonly beat: number;
}): BattleState => {
  let cursor: CommandId | null = null;
  const done: CommandId[] = [];
  const present = new Map<ActorId, number>([["mako", 0]]);
  const context = new Map<ActorId, Ramp>();
  const loaded: { skill: SkillName; since: number }[] = task.loadout.map((skill) => ({ skill, since: 0 }));
  let work = FLAT;
  const conditions = new Map<ConditionId, ConditionState>(
    task.conditions.map((condition) => [condition.id, { kind: "unrecorded" }]),
  );
  let finding: BattleState["finding"] = { kind: "none" };
  let claim: BattleState["claim"] = { kind: "none" };
  let acting: BattleState["acting"] = { actor: "mako", since: 0, previous: null };
  const front = (actor: ActorId, since: number): void => {
    if (acting.actor !== actor) acting = { actor, since, previous: acting.actor };
  };
  const hits: { actor: ActorId; beat: number }[] = [];

  const effects = scene.shots
    .flatMap((shot) => shot.effects)
    .filter((timed) => timed.beat <= beat)
    .sort((a, b) => a.beat - b.beat);

  for (const { effect, beat: at } of effects) {
    switch (effect.kind) {
      case "cursor":
        cursor = effect.command;
        front("mako", at);
        break;
      case "act":
        front(effect.actor, at);
        break;
      case "tick":
        if (!done.includes(effect.command)) done.push(effect.command);
        break;
      case "spawn":
        present.set(effect.actor, at);
        break;
      case "context":
        context.set(effect.actor, {
          from: rampAt(context.get(effect.actor) ?? FLAT, at),
          to: effect.to,
          start: at,
          over: effect.over,
        });
        break;
      case "work":
        work = { from: rampAt(work, at), to: effect.to, start: at, over: effect.over };
        break;
      case "load":
        if (!loaded.some((entry) => entry.skill === effect.skill)) loaded.push({ skill: effect.skill, since: at });
        break;
      case "record":
        conditions.set(effect.condition, { kind: "open", since: at });
        front("mako", at);
        break;
      case "hit":
        hits.push({ actor: effect.actor, beat: at });
        front(effect.actor, at);
        break;
      case "finding":
        finding = { kind: "open", since: at };
        break;
      case "fixed":
        finding = { kind: "fixed", since: at };
        break;
      case "claim":
        claim = { kind: "made", since: at, actor: effect.actor };
        front(effect.actor, at);
        break;
      case "reject":
        if (claim.kind !== "none") claim = { kind: "rejected", since: at, actor: claim.actor };
        front("mako", at);
        break;
      case "check":
        if (conditions.get(effect.condition)?.kind !== "unrecorded") {
          conditions.set(effect.condition, { kind: effect.outcome, since: at });
        }
        front("mako", at);
        break;
      default: {
        const _exhaustive: never = effect;
        return _exhaustive;
      }
    }
  }

  const member = (actor: ActorId): Member => {
    const since = present.get(actor);
    return since === undefined
      ? { kind: "absent" }
      : { kind: "present", since, context: rampAt(context.get(actor) ?? FLAT, beat) };
  };
  const states = [...conditions.values()];

  return {
    cursor,
    done,
    party: {
      mako: member("mako"),
      explorer: member("explorer"),
      implementer: member("implementer"),
      reviewer: member("reviewer"),
    },
    acting,
    loaded,
    work: rampAt(work, beat),
    conditions: task.conditions.map((condition) => ({
      id: condition.id,
      text: condition.text,
      state: conditions.get(condition.id) ?? { kind: "unrecorded" },
    })),
    recorded: states.filter((state) => state.kind !== "unrecorded").length,
    proven: states.filter((state) => state.kind === "proven").length,
    finding,
    claim,
    hits,
    gate: deriveGate(conditions),
  };
};

/** Every effect of one kind in the scene, in time order. For motion that starts before its effect lands. */
export const effectsOfKind = <K extends Effect["kind"]>(
  scene: SceneOf<"battle">,
  kind: K,
): readonly { readonly effect: Extract<Effect, { readonly kind: K }>; readonly beat: number }[] =>
  scene.shots
    .flatMap((shot) => shot.effects)
    .flatMap(({ effect, beat }) => (isKind(effect, kind) ? [{ effect, beat }] : []))
    .sort((a, b) => a.beat - b.beat);

const isKind = <K extends Effect["kind"]>(effect: Effect, kind: K): effect is Extract<Effect, { readonly kind: K }> =>
  effect.kind === kind;

/** Rule 7 of `npm run check`. Empty when the battle data is sound. */
export const battleProblems = ({
  task,
  scene,
}: {
  readonly task: Task;
  readonly scene: SceneOf<"battle">;
}): { readonly where: string; readonly message: string }[] => {
  const problems: { where: string; message: string }[] = [];
  const effects = scene.shots
    .flatMap((shot) => shot.effects.map((timed) => ({ ...timed, turn: shot.id })))
    .sort((a, b) => a.beat - b.beat);

  const firstClaim = effects.find((timed) => timed.effect.kind === "claim");
  for (const { effect, beat, turn } of effects) {
    if (effect.kind === "act" || effect.kind === "hit" || effect.kind === "claim") {
      if (battleAt({ task, scene, beat }).party[effect.actor].kind === "absent") {
        problems.push({ where: `battle.${turn}`, message: `"${effect.kind}" at beat ${beat} names "${effect.actor}", who is not in the party yet.` });
      }
    }
    if (effect.kind === "reject" && (firstClaim === undefined || firstClaim.beat >= beat)) {
      problems.push({ where: `battle.${turn}`, message: `"reject" at beat ${beat} does not come after a "claim".` });
    }
    if (effect.kind === "check") {
      const recorded = effects.some(
        (other) => other.effect.kind === "record" && other.effect.condition === effect.condition && other.beat <= beat,
      );
      if (!recorded) {
        problems.push({ where: `battle.${turn}`, message: `"check" at beat ${beat} names the condition "${effect.condition}" before it is recorded.` });
      }
    }
  }

  const end = battleAt({ task, scene, beat: Number.POSITIVE_INFINITY });
  if (end.gate.kind === "sealed") {
    problems.push({ where: "battle", message: `The gate is sealed at the end (${end.proven} of ${end.conditions.length} conditions proven).` });
  } else {
    const gateSince = end.gate.since;
    for (const shot of scene.shots) {
      for (const cue of shot.cues) {
        const early = cue.sfx === "gateOpen" && cue.hits.some((hit) => hit.beat < gateSince);
        if (early) problems.push({ where: `battle.${shot.id}.${cue.name}`, message: `The "gateOpen" sound plays before the gate opens at beat ${gateSince}.` });
      }
    }
  }
  return problems;
};
