import { dirname, join } from "node:path";

export async function findEnvFile(from: string): Promise<string | null> {
  let dir = from;
  while (true) {
    const candidate = join(dir, ".env");
    if (await Bun.file(candidate).exists()) {
      return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
}
