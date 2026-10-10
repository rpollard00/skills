import { Console, Effect } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import { isComplete, renderReport } from "./index/report";
import { SkillIndex, type JudgmentsLocked } from "./index/skill-index";
import { failWith, ReportedFailure } from "./reported-failure";
import { Answer, CONDITIONAL_ANSWERS, type IndexUnavailable } from "./shared/model";

/** "`handoff`, `runs`, and `requires`". */
const asListOfCodeNames = (names: readonly string[]): string => {
  const quoted = names.map((name) => `\`${name}\``);
  return quoted.length < 2 ? quoted.join("") : `${quoted.slice(0, -1).join(", ")}, and ${quoted.at(-1) ?? ""}`;
};

const unavailable = (error: IndexUnavailable): Effect.Effect<never, ReportedFailure> =>
  failWith(`The index is not available (${error.reason}). ${error.detail}`);

const locked = (error: JudgmentsLocked): Effect.Effect<never, ReportedFailure> =>
  failWith(`The lock file ${error.lockFile} exists, so a different command is writing the answers. No file changed. If no \`judge\` command is running, remove the lock file.`);

const index = Command.make(
  "index",
  {
    prune: Flag.Boolean("prune").pipe(Flag.withDescription("Remove each judgment that answers no question"), Flag.withDefault(false)),
    judged: Flag.Boolean("judged").pipe(Flag.withDescription("Also list each answered ticket, with the command that revises it"), Flag.withDefault(false)),
  },
  ({ prune, judged }) =>
    SkillIndex.use((skills) => skills.refresh({ prune })).pipe(
      Effect.flatMap((report) => Console.log(renderReport(report, { judged }))),
      Effect.catchTags({ IndexUnavailable: unavailable, JudgmentsLocked: locked }),
    ),
).pipe(Command.withDescription("Scan skills/, write index/scan.json, and print the open tickets"));

const judge = Command.make(
  "judge",
  {
    ticket: Argument.String("ticket").pipe(Argument.withDescription("The id of an open ticket, or of an answered ticket to revise")),
    kind: Argument.Literals("kind", Answer.literals).pipe(Argument.withDescription("The answer")),
    conditional: Flag.Boolean("conditional").pipe(
      Flag.withDescription(`A condition guards the reference. Legal only with ${asListOfCodeNames(CONDITIONAL_ANSWERS)}`),
      Flag.withDefault(false),
    ),
  },
  (verdict) =>
    SkillIndex.use((skills) => skills.judge(verdict)).pipe(
      Effect.flatMap((report) => Console.log(renderReport(report))),
      Effect.catchTags({
        IndexUnavailable: unavailable,
        JudgmentsLocked: locked,
        TicketNotCurrent: (error) =>
          failWith(`Ticket ${error.ticket} is not current. No file changed. The text changed after the report, or the id is wrong. Run \`npm run index\` to print the current tickets.`),
        TicketAmbiguous: (error) =>
          failWith(
            [
              `Ticket ${error.ticket} is the start of more than one id. No file changed. Use one of these ids:`,
              ...error.candidates.map((candidate) => `  ${candidate.key}  ${candidate.from} > ${candidate.to}`),
            ].join("\n"),
          ),
        ConditionalNotAllowed: (error) =>
          failWith(`\`--conditional\` is not legal with \`${error.kind}\`. It is legal only with ${asListOfCodeNames(error.allowed)}. No file changed.`),
      }),
    ),
).pipe(Command.withDescription("Record the answer to one ticket in index/judgments.json"));

const check = Command.make("check", {}, () =>
  SkillIndex.use((skills) => skills.check).pipe(
    Effect.tap((report) => Console.log(renderReport(report))),
    Effect.catchTag("IndexUnavailable", unavailable),
    Effect.flatMap((report) => (isComplete(report.state) ? Effect.void : Effect.fail(new ReportedFailure()))),
  ),
).pipe(Command.withDescription("Exit 0 only when the index is complete and current"));

/** The commands need a `SkillIndex`. `src/cli.ts` gives them the one for this repository. */
export const explorerCommand = Command.make("skill-explorer").pipe(Command.withSubcommands([index, judge, check]));
