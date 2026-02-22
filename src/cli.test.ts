import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CLI = join(import.meta.dir, "cli.ts");

test("--help exits with code 0", async () => {
  const proc = Bun.spawn(["bun", CLI, "--help"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  await proc.exited;
  const stdout = await new Response(proc.stdout).text();

  expect(proc.exitCode).toBe(0);
  expect(stdout).toContain("opx");
  expect(stdout).toContain("Usage:");
});

test("-h exits with code 0", async () => {
  const proc = Bun.spawn(["bun", CLI, "-h"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  await proc.exited;

  expect(proc.exitCode).toBe(0);
});

test("--version prints version", async () => {
  const proc = Bun.spawn(["bun", CLI, "--version"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  await proc.exited;
  const stdout = await new Response(proc.stdout).text();

  expect(proc.exitCode).toBe(0);
  expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
});

test("no args exits with code 1", async () => {
  const proc = Bun.spawn(["bun", CLI], {
    stdout: "pipe",
    stderr: "pipe",
  });
  await proc.exited;
  const stderr = await new Response(proc.stderr).text();

  expect(proc.exitCode).toBe(1);
  expect(stderr).toContain("Usage:");
});

test("missing .env shows error", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "opx-cli-test-"));
  try {
    const proc = Bun.spawn(["bun", CLI, "echo", "hello"], {
      cwd: tempDir,
      stdout: "pipe",
      stderr: "pipe",
    });
    await proc.exited;
    const stderr = await new Response(proc.stderr).text();

    expect(proc.exitCode).toBe(1);
    expect(stderr).toContain("No .env file found");
  } finally {
    await rm(tempDir, { recursive: true });
  }
});
