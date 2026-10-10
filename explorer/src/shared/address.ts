/**
 * The one address of the server. The server binds to it, the `Host` rule and the Vite proxy use it.
 * This file has no import, so `vite.config.ts` can load it without a bundler.
 */
export const HOST = "127.0.0.1";
export const PORT = 4747;
