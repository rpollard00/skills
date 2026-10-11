export const HOST = "127.0.0.1";
/** `PORT` and `DEV_PORT` are defaults: the variables `EXPLORER_PORT` and `EXPLORER_DEV_PORT` replace them. */
export const PORT = 4747;
export const DEV_PORT = 4748;

/** With this argument the server stops when its input ends. The dev server holds that input, so its API cannot stay after it. */
export const STOP_WHEN_INPUT_ENDS = "--stop-when-input-ends";

export type PortChoice = { readonly kind: "ok"; readonly port: number } | { readonly kind: "invalid"; readonly message: string };

/** The port that a variable gives, or the default when the variable is absent or empty. */
export const portFrom = (variable: { readonly name: string; readonly value: string | undefined; readonly fallback: number }): PortChoice => {
  if (variable.value === undefined || variable.value === "") return { kind: "ok", port: variable.fallback };
  const port = Number(variable.value);
  return Number.isInteger(port) && port >= 1 && port <= 65535
    ? { kind: "ok", port }
    : { kind: "invalid", message: `${variable.name} must be a port number from 1 to 65535. Its value is "${variable.value}".` };
};
