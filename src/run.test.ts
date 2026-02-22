import { afterEach, expect, spyOn, test } from "bun:test";
import { run } from "./run";

afterEach(() => {
  // @ts-expect-error -- restoring spy
  Bun.which.mockRestore?.();
});

test("errors when op is not found", async () => {
  const spy = spyOn(Bun, "which").mockReturnValue(null);
  // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional noop mock
  const errorSpy = spyOn(console, "error").mockImplementation(() => {});

  const exitCode = await run("/tmp/.env", ["echo", "hello"]);

  expect(exitCode).toBe(1);
  expect(spy).toHaveBeenCalledWith("op");
  expect(errorSpy.mock.calls[0]?.[0]).toContain("1Password CLI");

  errorSpy.mockRestore();
});
