import type { Place, ViewEvent } from "./state";

export const LOCK_KEY = "l";

/** The part of a key event that a decision needs. `isTyping`: the keyboard focus is in a text field. */
export interface KeyPress {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly altKey: boolean;
  readonly repeat: boolean;
  readonly isTyping: boolean;
}

/** A key that stays down repeats, and each repeat would turn the lock back. Thus only the first event of a press counts. */
export const togglesLock = (press: KeyPress): boolean =>
  press.key.toLowerCase() === LOCK_KEY && !press.repeat && !press.isTyping && !(press.ctrlKey || press.metaKey || press.altKey);

/** What one key event does to the lock. Before the index is there, the stage that a lock holds is not on show, so a press waits. */
export const lockPressOf = (press: KeyPress, isIndexReady: boolean): "toggle" | "hold" | "none" => (!togglesLock(press) ? "none" : isIndexReady ? "toggle" : "hold");

/** What the app does when the index arrives. It shows the place of the address. Then it turns the lock if an odd number of presses waited. */
export const eventsAtArrival = (place: Place, heldLockPresses: number): ViewEvent[] => {
  const turnsTheLock: ViewEvent[] = heldLockPresses % 2 === 1 ? [{ kind: "lockToggled" }] : [];
  return [{ kind: "restored", place }, ...turnsTheLock];
};

/** What the mapping reads of a key event of the browser. `target` is the element that has the keyboard focus. */
export interface PageKeyEvent {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly altKey: boolean;
  readonly repeat: boolean;
  readonly target: unknown;
}

/** The element takes text, so a letter that the user types there is text and not a command. */
export const isTextField = (target: unknown): boolean => {
  if (typeof target !== "object" || target === null) return false;
  const tagName = "tagName" in target ? target.tagName : undefined;
  return tagName === "INPUT" || tagName === "TEXTAREA" || ("isContentEditable" in target && target.isContentEditable === true);
};

export const keyPressOf = (event: PageKeyEvent): KeyPress => ({
  key: event.key,
  ctrlKey: event.ctrlKey,
  metaKey: event.metaKey,
  altKey: event.altKey,
  repeat: event.repeat,
  isTyping: isTextField(event.target),
});

/**
 * The lock key of one page. It is not pure: it counts the presses that wait for the index.
 * `onKey`: what one key event does. Null when the event is not a press of the lock key, so the page gives the event to its other keys.
 * `onArrival`: what the page does when the index arrives. The presses that waited are in it one time.
 */
export interface LockKey {
  readonly onKey: (event: PageKeyEvent, isIndexReady: boolean) => ViewEvent[] | null;
  readonly onArrival: (place: Place) => ViewEvent[];
}

export const lockKey = (): LockKey => {
  let held = 0;
  return {
    onKey: (event, isIndexReady) => {
      const press = lockPressOf(keyPressOf(event), isIndexReady);
      if (press === "none") return null;
      if (press === "hold") held += 1;
      return press === "toggle" ? [{ kind: "lockToggled" }] : [];
    },
    onArrival: (place) => {
      const events = eventsAtArrival(place, held);
      held = 0;
      return events;
    },
  };
};
