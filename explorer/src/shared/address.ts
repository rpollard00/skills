export const HOST = "127.0.0.1";
/** `PORT` and `DEV_PORT` are defaults: the variables `EXPLORER_PORT` and `EXPLORER_DEV_PORT` replace them. */
export const PORT = 4747;
export const DEV_PORT = 4748;

/** A server of this project to start. `npm start` and `npm run serve` listen on one port. `npm run dev` listens on its own port and sends each API request to a second one. */
type Start =
  | { readonly script: "npm start" | "npm run serve"; readonly port: number }
  | { readonly script: "npm run dev"; readonly apiPort: number; readonly devPort: number };

/** The command that starts a server. It has a variable only for a port that is not the default of that port, so a person can copy the command as it is. */
export const commandFor = (start: Start): string => {
  const ports: readonly (readonly [name: string, port: number, usual: number])[] =
    start.script === "npm run dev" ? [["EXPLORER_PORT", start.apiPort, PORT], ["EXPLORER_DEV_PORT", start.devPort, DEV_PORT]] : [["EXPLORER_PORT", start.port, PORT]];
  return [...ports.flatMap(([name, port, usual]) => (port === usual ? [] : [`${name}=${port}`])), start.script].join(" ");
};

export type PortChoice = { readonly kind: "ok"; readonly port: number } | { readonly kind: "invalid"; readonly message: string };

/** The port that a variable gives, or the default when the variable is absent or empty. */
export const portFrom = (variable: { readonly name: string; readonly value: string | undefined; readonly fallback: number }): PortChoice => {
  if (variable.value === undefined || variable.value === "") return { kind: "ok", port: variable.fallback };
  const port = Number(variable.value);
  return Number.isInteger(port) && port >= 1 && port <= 65535
    ? { kind: "ok", port }
    : { kind: "invalid", message: `${variable.name} must be a port number from 1 to 65535. Its value is "${variable.value}".` };
};
