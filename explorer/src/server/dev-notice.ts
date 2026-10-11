// `vite.config.ts` loads this file, and Vite asks for the extension in each import that its configuration loads.
import { PORT } from "../shared/address.ts";

/** Vitest loads `vite.config.ts` and has a server of its own. It sets this variable before it loads that file. */
export const isUnderVitest = (variables: { readonly [name: string]: string | undefined }): boolean => variables["VITEST"] !== undefined;

/** The one line that `npm run dev` prints about the API. The command has the variable when the port is not the default port. */
export const apiLineOf = (port: number, answers: boolean): string =>
  answers
    ? `  The dev server uses the explorer API on port ${port}.`
    : `  No explorer API answers on port ${port}. Start one in a second terminal: ${port === PORT ? "" : `EXPLORER_PORT=${port} `}npm run serve`;
