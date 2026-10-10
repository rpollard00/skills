import { Console, Effect, Runtime, Schema } from "effect";

/** The process ends with exit code 1. The message is already printed, so the runtime must not log the error again. */
export class ReportedFailure extends Schema.TaggedError<ReportedFailure>()("ReportedFailure", {}) {
  override readonly [Runtime.errorReported] = false;
  override readonly [Runtime.errorExitCode] = 1;
}

export const failWith = (message: string): Effect.Effect<never, ReportedFailure> =>
  Console.error(message).pipe(Effect.andThen(new ReportedFailure()));
