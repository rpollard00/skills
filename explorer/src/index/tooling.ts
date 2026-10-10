import type { Block } from "../shared/markdown";
import type { DocPath, Tooling } from "../shared/model";
import { byCodeUnit, sortedBy } from "../shared/order";

/** One file of a skill directory. `blocks` is null for a file that is not markdown. */
interface ToolingFile {
  readonly path: DocPath;
  readonly pathInSkill: string;
  readonly text: string | null;
  readonly executable: boolean;
  readonly blocks: readonly Block[] | null;
}

const SHELL_TAGS: ReadonlySet<string> = new Set(["bash", "sh", "shell", "zsh"]);

const HUMAN_README = "README.md";

const INTERPRETERS: ReadonlyMap<string, string> = new Map([
  ["sh", "sh"], ["bash", "bash"], ["zsh", "zsh"], ["py", "python"], ["js", "node"], ["mjs", "node"], ["cjs", "node"],
]);

const basename = (path: string): string => path.slice(path.lastIndexOf("/") + 1);

const interpreterOf = (file: ToolingFile): string => {
  const shebang = /^#!\s*(\S+)(.*)$/.exec(file.text?.split("\n", 1)[0] ?? "");
  if (shebang === null) return INTERPRETERS.get(file.pathInSkill.slice(file.pathInSkill.lastIndexOf(".") + 1)) ?? "unknown";
  const program = basename(shebang[1] ?? "");
  if (program !== "env") return program;
  return (shebang[2] ?? "").trim().split(/\s+/).find((word) => word !== "" && !word.startsWith("-")) ?? "env";
};

const isScript = (file: ToolingFile): boolean =>
  file.executable || (file.text ?? "").startsWith("#!") || file.pathInSkill.startsWith("scripts/");

const commandWords = (lines: readonly string[]): string[] => {
  const words: string[] = [];
  let continued = false;
  for (const line of lines) {
    const trimmed = line.trim().replace(/^\$\s+/, "");
    const isContinuation = continued;
    continued = trimmed.endsWith("\\");
    if (isContinuation || trimmed === "" || trimmed.startsWith("#")) continue;
    const word = trimmed.split(/\s+/).find((token) => !/^[A-Za-z_][A-Za-z0-9_]*=/.test(token));
    if (word !== undefined) words.push(word);
  }
  return words;
};

/** Scripts come from the directory listing. Commands come from shell fences. Inline code spans are not read. */
export const toolingOf = (files: readonly ToolingFile[]): Tooling => {
  const scripts = files.filter(isScript);
  const scriptNames = new Set(scripts.map((script) => basename(script.pathInSkill)));
  const scriptUses = new Map<string, number>();
  const commandUses = new Map<string, number>();

  for (const file of files) {
    if (file.blocks === null || file.pathInSkill === HUMAN_README) continue;
    for (const block of file.blocks) {
      if (block.kind !== "fence" || !SHELL_TAGS.has(block.info)) continue;
      for (const word of commandWords(block.lines)) {
        const counts = scriptNames.has(basename(word)) ? scriptUses : commandUses;
        const key = counts === scriptUses ? basename(word) : word;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }

  const mentions = (name: string): { file: DocPath; line: number }[] =>
    sortedBy(
      files.filter((file) => file.blocks !== null),
      (file) => file.path,
    ).flatMap((file) =>
      (file.text ?? "").split("\n").flatMap((line, index) => (line.includes(name) ? [{ file: file.path, line: index + 1 }] : [])),
    );

  return {
    scripts: sortedBy(scripts, (script) => script.path).map((script) => ({
      path: script.path,
      interpreter: interpreterOf(script),
      uses: scriptUses.get(basename(script.pathInSkill)) ?? 0,
      invokedAt: mentions(basename(script.pathInSkill)),
    })),
    commands: [...commandUses]
      .sort(([left], [right]) => byCodeUnit(left, right))
      .map(([name, uses]) => ({ name, uses })),
  };
};
