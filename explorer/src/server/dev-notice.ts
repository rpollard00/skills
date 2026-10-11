// `vite.config.ts` loads this file, and Vite asks for the extension in each import that its configuration loads.
import { commandFor, DEV_PORT, PORT, portFrom } from "../shared/address.ts";

export interface Variables {
  readonly [name: string]: string | undefined;
}

/** What `npm run dev` takes from its environment. */
interface DevNotice {
  /** The dev server sends each API request to this port. */
  readonly apiPort: number;
  readonly devPort: number;
  /** Vitest loads `vite.config.ts` and has a server of its own. It sets a variable before it loads that file. The dev server makes no request then. */
  readonly isUnderVitest: boolean;
  /** The one line that `npm run dev` prints about the API. Its command is the command that the page of the dev server gives. */
  readonly line: (answers: boolean) => string;
}

const portOf = (variables: Variables, name: string, fallback: number): number => {
  const choice = portFrom({ name, value: variables[name], fallback });
  if (choice.kind === "invalid") throw new Error(choice.message);
  return choice.port;
};

/** Pure. It throws for a variable that is not a port, with the sentence that the terminal shows. */
export const devNoticeOf = (variables: Variables): DevNotice => {
  const apiPort = portOf(variables, "EXPLORER_PORT", PORT);
  return {
    apiPort,
    devPort: portOf(variables, "EXPLORER_DEV_PORT", DEV_PORT),
    isUnderVitest: variables["VITEST"] !== undefined,
    line: (answers) =>
      answers ? `  The dev server uses the explorer API on port ${apiPort}.` : `  No explorer API answers on port ${apiPort}. Start one in a second terminal: ${commandFor({ script: "npm run serve", port: apiPort })}`,
  };
};
