# Distributing a Bun Application as a Single Standalone Binary

## Overview

Bun's bundler provides a `--compile` flag that generates a standalone executable from TypeScript or JavaScript. The binary includes the Bun runtime and all dependencies -- no installation of Bun, Node.js, or `node_modules` required on the target machine.

## Basic Usage

### CLI

```bash
bun build ./cli.ts --compile --outfile mycli
./mycli
```

### JavaScript API

```ts
await Bun.build({
  entrypoints: ["./cli.ts"],
  compile: {
    outfile: "./mycli",
  },
});
```

## Cross-Compilation

The `--target` flag compiles for a different OS/architecture without needing the target platform.

### Supported Targets

| `--target` value | OS | Architecture | Libc |
|---|---|---|---|
| `bun-linux-x64` | Linux | x64 | glibc |
| `bun-linux-x64-baseline` | Linux | x64 (pre-2013 CPUs) | glibc |
| `bun-linux-arm64` | Linux | ARM64 | glibc |
| `bun-linux-x64-musl` | Linux | x64 | musl |
| `bun-linux-arm64-musl` | Linux | ARM64 | musl |
| `bun-windows-x64` | Windows | x64 | - |
| `bun-windows-x64-baseline` | Windows | x64 (older CPUs) | - |
| `bun-darwin-x64` | macOS | x64 (Intel) | - |
| `bun-darwin-arm64` | macOS | ARM64 (Apple Silicon) | - |

### Examples

```bash
# Build on macOS, target Linux x64
bun build --compile --target=bun-linux-x64 ./index.ts --outfile myapp

# Build for Windows (automatically adds .exe)
bun build --compile --target=bun-windows-x64 ./index.ts --outfile myapp

# Build for Linux ARM64 (Graviton, Raspberry Pi)
bun build --compile --target=bun-linux-arm64 ./index.ts --outfile myapp

# Build for Alpine Linux (musl libc)
bun build --compile --target=bun-linux-x64-musl ./index.ts --outfile myapp
```

**Note:** If users see "Illegal instruction" errors on older CPUs, use the `-baseline` variant.

## Embedding Assets

### Individual Files

Use `with { type: "file" }` to embed any file:

```ts
import icon from "./icon.png" with { type: "file" };
import { file } from "bun";

const bytes = await file(icon).arrayBuffer();
const text = await file(icon).text();
```

Works with Node.js `fs` APIs too:

```ts
import config from "./config.json" with { type: "file" };
import { readFileSync } from "node:fs";

const data = readFileSync(config, "utf-8");
```

### Directories (Glob Patterns)

```bash
bun build --compile ./index.ts ./public/**/*.png --outfile myapp
```

### SQLite Databases

```ts
import myDb from "./my.db" with { type: "sqlite", embed: "true" };

myDb.query("select * from users LIMIT 1").get();
```

The embedded database is read-write in memory but changes are lost when the process exits.

### N-API Addons

```ts
const addon = require("./addon.node");
```

### Listing Embedded Files

```ts
import { embeddedFiles } from "bun";

for (const blob of embeddedFiles) {
  console.log(`${blob.name} - ${blob.size} bytes`);
}
```

### Controlling Asset Names

Disable content hashes:

```bash
bun build --compile --asset-naming="[name].[ext]" ./index.ts
```

## Output Binary Name

```bash
bun build --compile ./app.ts --outfile myapp
# Creates ./myapp (or myapp.exe for Windows targets)
```

## Size Optimization

### Recommended Production Build

```bash
bun build --compile --minify --sourcemap --bytecode ./app.ts --outfile myapp
```

### Flags

| Flag | Effect | Tradeoff |
|---|---|---|
| `--minify` | Reduces transpiled code size | Slightly longer build |
| `--sourcemap` | Embeds compressed sourcemaps for stack traces | Small size increase |
| `--bytecode` | Pre-compiles to bytecode; ~2x faster startup | 2-4x larger JS payload |

### Granular Minification (JS API)

```ts
await Bun.build({
  entrypoints: ["./index.ts"],
  compile: { outfile: "./myapp" },
  minify: {
    whitespace: true,
    syntax: true,
    identifiers: true,
  },
});
```

### Build-Time Constants

```bash
bun build --compile --define BUILD_VERSION='"1.2.3"' --define NODE_ENV='"production"' src/cli.ts --outfile mycli
```

### Size Benchmarks

| Configuration | Execution Time | File Size |
|---|---|---|
| Baseline (no flags) | 87 ms | 58 MB |
| `--bytecode` | 81 ms | 60 MB |
| `--production` (minify) | 82.4 ms | 55 MB |
| `--bytecode --production` | 79.6 ms | 60 MB |

The base binary is ~55-60 MB because it includes the full Bun runtime.

## Handling Workers

Worker entrypoints must be explicitly added:

```bash
bun build --compile ./index.ts ./my-worker.ts --outfile myapp
```

```ts
new Worker("./my-worker.ts");
```

## Config Loading Behavior

In compiled executables by default:

| Config | Default |
|--------|---------|
| `tsconfig.json` / `package.json` | Disabled (development-only) |
| `.env` / `bunfig.toml` | Enabled (runtime config) |

Override with flags:

```bash
# Enable tsconfig/package.json at runtime
bun build --compile --compile-autoload-tsconfig --compile-autoload-package-json app.ts --outfile myapp

# Disable .env loading
bun build --compile --no-compile-autoload-dotenv app.ts --outfile myapp
```

## Full Example: CLI Tool

```ts
// cli.ts
import { defineCommand, runMain } from "citty";

const main = defineCommand({
  meta: { name: "mycli", version: "1.0.0", description: "My CLI tool" },
  args: {
    name: { type: "positional", description: "Your name", required: true },
  },
  run({ args }) {
    console.log(`Hello, ${args.name}!`);
  },
});

runMain(main);
```

```bash
bun build --compile --minify ./cli.ts --outfile mycli
./mycli World
# Hello, World!
```

## Full Example: Full-Stack Server

```ts
// server.ts
import index from "./index.html";

Bun.serve({
  routes: {
    "/": index,
    "/api/hello": { GET: () => Response.json({ message: "Hello" }) },
  },
});
```

```bash
bun build --compile ./server.ts --outfile myapp
./myapp
```

Bun automatically bundles CSS, JS, and assets referenced in the HTML.

## Complete Production Build (JS API)

```ts
const result = await Bun.build({
  entrypoints: ["./src/cli.ts"],
  compile: {
    target: "bun-linux-x64",
    outfile: "./dist/mycli",
    execArgv: ["--smol"],
    autoloadDotenv: false,
    autoloadBunfig: false,
  },
  minify: true,
  sourcemap: "linked",
  bytecode: true,
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    VERSION: JSON.stringify("1.0.0"),
  },
});

if (result.success) {
  console.log("Build successful:", result.outputs[0].path);
}
```

## Advanced Features

### macOS Code Signing

```bash
codesign --deep --force -vvvv --sign "XXXXXXXXXX" --entitlements entitlements.plist ./myapp
```

### `BUN_BE_BUN` Mode

Make the compiled executable act as the full Bun CLI:

```bash
BUN_BE_BUN=1 ./myapp install   # runs 'bun install'
```

### Runtime Flags Without Recompiling

```bash
BUN_OPTIONS="--cpu-prof" ./myapp
BUN_OPTIONS="--smol --cpu-prof-md" ./myapp
```

### Code Splitting

```bash
bun build --compile --splitting ./src/entry.ts --outdir ./build
```

## Limitations

- **Binary size**: ~55-60 MB minimum (includes full Bun runtime)
- **Single entrypoint**: One main entry (workers/assets can be additional entrypoints)
- **Dynamic imports**: Non-statically-analyzable `import()` expressions won't be bundled
- **Path resolution**: `import.meta.url` may resolve relative to CWD, not binary location
- **Windows metadata** (`--windows-icon`, etc.): Cannot be used when cross-compiling
- **Bytecode**: Version-specific, tied to the Bun version used for compilation
- **Always bundles**: No `--no-bundle` option

## Comparison with Alternatives

| Feature | `bun build --compile` | `deno compile` | `pkg` (Node.js) |
|---|---|---|---|
| Runtime bundled | Bun | Deno | Node.js |
| TypeScript support | Native | Native | Via transpilation |
| Cross-compilation | Yes | Yes | Yes |
| Binary size | ~55-60 MB | ~90-100 MB | ~40-80 MB |
| Asset embedding | Yes (files, SQLite, NAPI) | Limited | Via snapshot |
| Startup time | Fast (~2x with bytecode) | Moderate | Moderate |
| Maintenance | Active (core feature) | Active | Unmaintained |
| Full-stack bundling | Yes (HTML imports) | No | No |

## Sources

- [Single-file executable - Bun Docs](https://bun.com/docs/bundler/executables)
- [Bun Blog](https://bun.com/blog)
- [Optimizing Bun compiled binary - Peterbe.com](https://www.peterbe.com/plog/optimizing-bun-compiled-binary-for-gg2)
- [Bytecode Caching - Bun Docs](https://bun.com/docs/bundler/bytecode)
