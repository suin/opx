export async function run(
  envFile: string,
  args: Array<string>
): Promise<number> {
  if (!Bun.which("op")) {
    console.error(
      "Error: 1Password CLI (op) is not installed.",
      "\nInstall it from: https://developer.1password.com/docs/cli/get-started/"
    );
    return 1;
  }

  const proc = Bun.spawn(
    ["op", "run", `--env-file=${envFile}`, "--", ...args],
    {
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    }
  );

  await proc.exited;
  return proc.exitCode ?? 1;
}
