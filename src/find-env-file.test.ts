import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findEnvFile } from "./find-env-file";

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "opx-test-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true });
});

test("finds .env in current directory", async () => {
  const envPath = join(tempDir, ".env");
  await Bun.write(envPath, "KEY=value\n");

  const result = await findEnvFile(tempDir);
  expect(result).toBe(envPath);
});

test("finds .env in ancestor directory", async () => {
  const envPath = join(tempDir, ".env");
  await Bun.write(envPath, "KEY=value\n");

  const nested = join(tempDir, "a", "b", "c");
  await Bun.write(join(nested, ".keep"), "");

  const result = await findEnvFile(nested);
  expect(result).toBe(envPath);
});

test("returns null when no .env exists", async () => {
  const nested = join(tempDir, "empty", "dir");
  await Bun.write(join(nested, ".keep"), "");

  const result = await findEnvFile(nested);
  expect(result).toBeNull();
});

test("nearest .env wins", async () => {
  const parentEnv = join(tempDir, ".env");
  await Bun.write(parentEnv, "PARENT=true\n");

  const childDir = join(tempDir, "child");
  const childEnv = join(childDir, ".env");
  await Bun.write(childEnv, "CHILD=true\n");

  const result = await findEnvFile(childDir);
  expect(result).toBe(childEnv);
});
