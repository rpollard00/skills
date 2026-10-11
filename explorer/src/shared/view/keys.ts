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
