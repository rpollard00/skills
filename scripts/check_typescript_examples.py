#!/usr/bin/env python3
"""Compile and run the documented duration example; requires TypeScript and Node."""

import argparse
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


PATTERNS = Path(__file__).resolve().parents[1] / "skills/typescript-best-practices/references/patterns.md"
START = "<!-- typescript-example: validated-duration -->"
END = "<!-- /typescript-example: validated-duration -->"
TYPE_CASES = (
    (
        "An unchecked negative duration must not construct a range.",
        "const raw: TimeRange = { start: new Date(0), durationMs: -1 };",
        "const raw: TimeRange = { start: new Date(0), durationMs: parseDurationMs(1) };",
    ),
    (
        "Positive numbers also require boundary validation.",
        "const positive: DurationMs = 1;",
        "const positive: DurationMs = parseDurationMs(1);",
    ),
    (
        "Arithmetic does not preserve the validated brand.",
        "const changed: DurationMs = parseDurationMs(1) - 2;",
        "const changed: DurationMs = parseDurationMs(1);",
    ),
)
RUNTIME_CASES = """
const parsed: DurationMs = parseDurationMs(90_000);
const range: TimeRange = { start: new Date(0), durationMs: parsed };
const milliseconds: number = range.durationMs;
if (milliseconds !== 90_000) throw new Error("Range changed the parsed duration");

const accepted: [string, number][] = [
  ["zero", 0], ["negative zero", -0], ["fraction", 0.5],
  ["positive", 1], ["interval", 90_000], ["maximum finite", Number.MAX_VALUE],
];
for (const [label, input] of accepted) {
  if (!Object.is(parseDurationMs(input), input)) {
    throw new Error(`Parser changed accepted input: ${label}`);
  }
}

const rejected: [string, unknown][] = [
  ["negative", -1], ["negative fraction", -0.5], ["NaN", NaN],
  ["positive infinity", Infinity], ["negative infinity", -Infinity],
  ["numeric string", "1"], ["null", null], ["undefined", undefined],
  ["object", {}], ["boolean", true],
];
for (const [label, input] of rejected) {
  let threw = false;
  try {
    parseDurationMs(input);
  } catch {
    threw = true;
  }
  if (!threw) throw new Error(`Parser accepted invalid input: ${label}`);
}
"""


class CheckError(Exception):
    pass


def extract_duration_example(markdown):
    if markdown.count(START) != 1 or markdown.count(END) != 1:
        raise CheckError("Expected exactly one validated-duration marker pair in patterns.md")
    before, _, remainder = markdown.partition(START)
    body, _, _ = remainder.partition(END)
    match = re.fullmatch(r"\s*```ts\n((?:(?!^```)[\s\S])+)\n```\s*", body, re.MULTILINE)
    if END in before or match is None:
        raise CheckError("The validated-duration markers must enclose exactly one complete ts fence")
    return match[1] + "\n"


def require_tool(command, label, option):
    executable = shutil.which(command)
    if executable is None:
        raise CheckError(f"{label} executable not found: {command}. Install {label} or pass {option} PATH.")
    return executable


def run(command):
    try:
        return subprocess.run(command, capture_output=True, text=True, timeout=30)
    except (OSError, subprocess.TimeoutExpired) as error:
        raise CheckError(f"Could not run {command[0]}: {error}") from error


def check_example(example, tsc, node):
    lines = (example + RUNTIME_CASES).splitlines()
    lines.append("function typeRejectionsOnly(): void {")
    positions = []
    for reason, invalid, valid in TYPE_CASES:
        positions.append((len(lines), len(lines) + 1, valid))
        lines.extend((f"  // @ts-expect-error {reason}", f"  {invalid}"))
    lines.append("}")

    with tempfile.TemporaryDirectory(prefix="typescript-examples-") as temp:
        source = Path(temp) / "duration.ts"

        def compile_lines(content):
            source.write_text("\n".join(content) + "\n", encoding="utf-8")
            return run([
                tsc, "--strict", "--target", "ES2020", "--module", "commonjs",
                "--noEmitOnError", "--pretty", "false", str(source),
            ])

        compiled = compile_lines(lines)
        if compiled.returncode:
            raise CheckError(f"Documented example failed compilation:\n{compiled.stdout}{compiled.stderr}")
        executed = run([node, str(source.with_suffix(".js"))])
        if executed.returncode:
            raise CheckError(f"Documented example failed runtime checks:\n{executed.stdout}{executed.stderr}")

        for directive, statement, valid in positions:
            for probe in ("remove directive", "make statement valid"):
                changed = lines.copy()
                if probe == "remove directive":
                    changed[directive] = ""
                    expected = (str(statement + 1), "2322")
                else:
                    changed[statement] = f"  {valid}"
                    expected = (str(directive + 1), "2578")
                result = compile_lines(changed)
                output = result.stdout + result.stderr
                diagnostics = re.findall(r"\((\d+),\d+\): error TS(\d+):", output)
                if result.returncode == 0 or diagnostics != [expected]:
                    raise CheckError(
                        f"Negative type probe failed ({probe}, line {statement + 1}). "
                        f"Expected only TS{expected[1]} at line {expected[0]}:\n{output}"
                    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tsc", default="tsc", help="TypeScript compiler executable (default: tsc on PATH)")
    parser.add_argument("--node", default="node", help="Node executable (default: node on PATH)")
    args = parser.parse_args()
    try:
        tsc = require_tool(args.tsc, "TypeScript", "--tsc")
        node = require_tool(args.node, "Node", "--node")
        example = extract_duration_example(PATTERNS.read_text(encoding="utf-8"))
        check_example(example, tsc, node)
    except (CheckError, OSError) as error:
        print(error, file=sys.stderr)
        return 1
    print("Validated duration example: runtime cases, type rejections, and six diagnostic probes.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
