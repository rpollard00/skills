/**
 * Orders two strings by UTF-16 code unit, as `<` does. The result is the same on every machine.
 * `localeCompare` depends on the locale of the machine, so nothing that is written to disk may use it.
 */
export const byCodeUnit = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);

export const sortedBy = <T>(items: Iterable<T>, key: (item: T) => string): T[] =>
  [...items].sort((left, right) => byCodeUnit(key(left), key(right)));
