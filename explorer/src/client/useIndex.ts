import { useCallback, useEffect, useRef, useState } from "react";
import { toGraph, type Graph } from "../shared/graph";
import { layout, type Placement } from "../shared/layout";
import { fetchIndex } from "./remote";

/** `ready` keeps the last good index. `problem` is the message of a later request that did not succeed. */
export type LoadState =
  | { readonly kind: "loading" }
  | { readonly kind: "failed"; readonly message: string }
  | { readonly kind: "ready"; readonly graph: Graph; readonly placement: Placement; readonly problem: string | null };

/** Loads the live index one time, and again each time the window gets the focus. There is no interval. */
export const useIndex = (): { readonly load: LoadState; readonly retry: () => void } => {
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const seen = useRef<string | null>(null);
  const pending = useRef<AbortController | null>(null);

  const request = useCallback(() => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setLoad((current) => (current.kind === "failed" ? { kind: "loading" } : current));

    fetchIndex(controller.signal).then(
      (result) => {
        if (controller.signal.aborted) return;
        if (result.kind !== "ok") {
          const message = result.kind === "failed" ? result.message : "The server has no index.";
          setLoad((current) => (current.kind === "ready" ? { ...current, problem: message } : { kind: "failed", message }));
          return;
        }
        const text = JSON.stringify(result.value);
        if (text === seen.current) {
          setLoad((current) => (current.kind === "ready" && current.problem !== null ? { ...current, problem: null } : current));
          return;
        }
        seen.current = text;
        const graph = toGraph(result.value);
        setLoad({ kind: "ready", graph, placement: layout(graph), problem: null });
      },
      (cause: unknown) => {
        if (controller.signal.aborted) return;
        const message = `The request stopped: ${String(cause)}`;
        setLoad((current) => (current.kind === "ready" ? { ...current, problem: message } : { kind: "failed", message }));
      },
    );
  }, []);

  useEffect(() => {
    request();
    window.addEventListener("focus", request);
    return () => {
      window.removeEventListener("focus", request);
      pending.current?.abort();
    };
  }, [request]);

  return { load, retry: request };
};
