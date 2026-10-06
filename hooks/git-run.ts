export type GitShell = {
  run: (argv: string[]) => Promise<{ exitCode: number; stdout: string }>;
  report: (error: unknown) => void;
};

export async function gitText(
  shell: GitShell,
  dir: string,
  args: string[],
): Promise<string | null> {
  try {
    const { exitCode, stdout } = await shell.run(["git", "-C", dir, ...args]);
    return exitCode === 0 ? stdout.trimEnd() : null;
  } catch (error) {
    shell.report(error);
    return null;
  }
}
