const VERSION = process.env.VERSION ?? "0.0.0-dev";

const targets = [
  "bun-darwin-arm64",
  "bun-darwin-x64",
  "bun-linux-x64",
  "bun-linux-arm64",
] as const;

for (const target of targets) {
  const outname = `opx-${target.replace("bun-", "")}`;
  console.log(`Building ${outname}...`);

  const proc = Bun.spawn(
    [
      "bun",
      "build",
      "--compile",
      "--target",
      target,
      `--define=VERSION=${JSON.stringify(VERSION)}`,
      "--outfile",
      `./dist/${outname}`,
      "./src/cli.ts",
    ],
    {
      stdout: "inherit",
      stderr: "inherit",
    }
  );

  await proc.exited;
  if (proc.exitCode !== 0) {
    console.error(`Failed to build ${outname}`);
    process.exit(1);
  }
}

console.log("All builds completed.");
