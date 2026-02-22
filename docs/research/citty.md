# citty -- Elegant CLI Builder

## Overview

**citty** is a lightweight, zero-dependency CLI builder library from the [UnJS](https://unjs.io/) ecosystem. It is used internally by Nuxt CLI, unbuild, and other UnJS tools.

- **Repository**: [github.com/unjs/citty](https://github.com/unjs/citty)
- **npm**: [npmjs.com/package/citty](https://www.npmjs.com/package/citty)
- **Latest version**: 0.2.1
- **License**: MIT
- **Weekly downloads**: ~14.6 million

### Key Features

- Zero dependencies -- uses Node.js native `util.parseArgs` internally
- Fast and lightweight argument parsing with automatic typecast
- Nested sub-commands support
- Lazy and async commands via dynamic `import()`
- Pluggable `setup`/`cleanup` lifecycle hooks
- Auto-generated usage and help
- Full TypeScript support with type-safe argument inference

## Installation

```bash
bun add citty
```

## Core API

| Export | Description |
|---|---|
| `defineCommand(config)` | Type-safe helper for defining CLI commands |
| `runMain(command, opts?)` | Runs a command with usage/help support and graceful error handling |
| `createMain(command)` | Returns a reusable function wrapping `runMain` |
| `runCommand(command, opts?)` | Parses args and runs command/sub-commands (no automatic error handling) |
| `parseArgs(rawArgs, argsDef)` | Parses raw input arguments and applies defaults |
| `renderUsage(command)` | Returns a formatted usage string |
| `showUsage(command)` | Renders usage and prints to console |

```ts
import {
  defineCommand,
  runMain,
  createMain,
  runCommand,
  parseArgs,
  renderUsage,
  showUsage,
} from "citty";
```

## Argument Types

citty supports four argument types:

| Type | Description |
|---|---|
| `"string"` | String-valued option (e.g., `--name foo`) |
| `"boolean"` | Boolean flag (e.g., `--verbose`, `--no-verbose`) |
| `"enum"` | String constrained to a set of choices (requires `options` array) |
| `"positional"` | Positional argument (no `--` prefix needed) |

### Argument Definition Properties

```ts
{
  type?: "boolean" | "string" | "enum" | "positional";
  description?: string;       // Help text
  valueHint?: string;         // Hint shown in usage (e.g., "DIR", "PORT")
  alias?: string | string[];  // Short aliases (e.g., "v" for --verbose)
  default?: any;              // Default value
  required?: boolean;         // Whether the argument is required
  options?: string[];         // Valid values (only for "enum" type)
  negativeDescription?: string; // Description for --no-X (only for "boolean")
}
```

## Command Definition

```ts
interface CommandDef<T extends ArgsDef> {
  meta?: Resolvable<{
    name?: string;
    version?: string;
    description?: string;
    hidden?: boolean;
  }>;
  args?: Resolvable<ArgsDef>;
  subCommands?: Resolvable<Record<string, CommandDef>>;
  setup?: (context: CommandContext<T>) => any | Promise<any>;
  cleanup?: (context: CommandContext<T>) => any | Promise<any>;
  run?: (context: CommandContext<T>) => any | Promise<any>;
}
```

### CommandContext

```ts
interface CommandContext<T extends ArgsDef> {
  rawArgs: string[];          // Raw unparsed arguments
  args: ParsedArgs<T>;       // Parsed and typed arguments
  cmd: CommandDef<T>;         // The current command definition
  subCommand?: CommandDef<T>; // The resolved subcommand, if any
  data?: any;                 // Shared data between setup/run/cleanup
}
```

### Resolvable Pattern

Almost every property accepts `Resolvable<T>`:

```ts
type Resolvable<T> = T | Promise<T> | (() => T) | (() => Promise<T>);
```

This enables lazy loading and dynamic configuration.

## Examples

### Basic Command

```ts
import { defineCommand, runMain } from "citty";

const main = defineCommand({
  meta: {
    name: "hello",
    version: "1.0.0",
    description: "My Awesome CLI App",
  },
  args: {
    name: {
      type: "positional",
      description: "Your name",
      required: true,
    },
    friendly: {
      type: "boolean",
      description: "Use friendly greeting",
    },
  },
  run({ args }) {
    console.log(`${args.friendly ? "Hi" : "Greetings"} ${args.name}!`);
  },
});

runMain(main);
```

```
$ bun cli.ts World --friendly
Hi World!

$ bun cli.ts --help
My Awesome CLI App (v1.0.0)

USAGE hello [OPTIONS] <name>

ARGUMENTS
  name    Your name

OPTIONS
  --friendly    Use friendly greeting
```

### String and Enum Arguments

```ts
import { defineCommand, runMain } from "citty";

const main = defineCommand({
  meta: {
    name: "build",
    version: "1.0.0",
    description: "Build the project",
  },
  args: {
    dir: {
      type: "string",
      description: "Project root directory",
      valueHint: "DIR",
      default: ".",
    },
    mode: {
      type: "enum",
      description: "Build mode",
      options: ["development", "production", "staging"],
      default: "production",
    },
    minify: {
      type: "boolean",
      description: "Minify output",
      alias: "m",
      default: true,
    },
    sourcemap: {
      type: "boolean",
      description: "Generate sourcemaps",
      alias: "s",
      negativeDescription: "Disable sourcemap generation",
    },
  },
  run({ args }) {
    console.log("Building project...");
    console.log(`  Directory: ${args.dir}`);
    console.log(`  Mode: ${args.mode}`);
    console.log(`  Minify: ${args.minify}`);
    console.log(`  Sourcemap: ${args.sourcemap}`);
  },
});

runMain(main);
```

### Subcommands

```ts
import { defineCommand, runMain } from "citty";

const devCommand = defineCommand({
  meta: {
    name: "dev",
    description: "Start development server",
  },
  args: {
    port: {
      type: "string",
      description: "Port to listen on",
      valueHint: "PORT",
      default: "3000",
    },
    host: {
      type: "string",
      description: "Host to bind to",
      default: "localhost",
    },
  },
  run({ args }) {
    console.log(`Starting dev server at http://${args.host}:${args.port}`);
  },
});

const buildCommand = defineCommand({
  meta: {
    name: "build",
    description: "Build for production",
  },
  args: {
    outDir: {
      type: "string",
      description: "Output directory",
      valueHint: "DIR",
      default: "dist",
    },
  },
  run({ args }) {
    console.log(`Building to ${args.outDir}...`);
  },
});

const main = defineCommand({
  meta: {
    name: "my-tool",
    version: "1.0.0",
    description: "My awesome development tool",
  },
  subCommands: {
    dev: devCommand,
    build: buildCommand,
  },
});

runMain(main);
```

### Subcommand Aliases

Map multiple keys to the same command:

```ts
const main = defineCommand({
  meta: { name: "pkg", description: "Package manager" },
  subCommands: {
    install: installCommand,
    i: installCommand,          // alias
    remove: removeCommand,
    rm: removeCommand,          // alias
  },
});
```

### Lazy-Loaded Subcommands

```ts
const main = defineCommand({
  meta: {
    name: "my-cli",
    version: "1.0.0",
    description: "CLI with lazy-loaded commands",
  },
  subCommands: {
    dev: () => import("./commands/dev").then((m) => m.default),
    build: () => import("./commands/build").then((m) => m.default),
    deploy: () => import("./commands/deploy").then((m) => m.default),
  },
});

runMain(main);
```

### Setup and Cleanup Lifecycle Hooks

The `cleanup` hook runs even if `run` throws an error (via `finally`).

```ts
import { defineCommand, runMain } from "citty";

const main = defineCommand({
  meta: {
    name: "migrate",
    description: "Run database migrations",
  },
  args: {
    database: {
      type: "string",
      description: "Database connection string",
      required: true,
    },
  },
  async setup({ args, data }) {
    console.log("Connecting to database...");
    data.db = await connectToDatabase(args.database);
  },
  async run({ args, data }) {
    console.log("Running migrations...");
    await data.db.migrate();
  },
  async cleanup({ data }) {
    console.log("Closing database connection...");
    await data.db?.close();
  },
});

runMain(main);
```

### Using `createMain` for Reusable CLI Entry Points

```ts
import { defineCommand, createMain } from "citty";

const myCommand = defineCommand({
  meta: { name: "tool", version: "1.0.0" },
  run() {
    console.log("Running tool...");
  },
});

const cli = createMain(myCommand);

// Execute with default process.argv
await cli();

// Or with custom args (useful for testing)
await cli({ rawArgs: ["--help"] });
```

### Using `parseArgs` Directly

```ts
import { parseArgs } from "citty";

const argsDef = {
  name: { type: "string", default: "world" },
  verbose: { type: "boolean", alias: "v" },
} as const;

const parsed = parseArgs(["--name", "Alice", "-v"], argsDef);
// parsed.name === "Alice"
// parsed.verbose === true
```

## Built-in Flag Handling

`runMain` automatically handles:

- **`--help` / `-h`**: Displays usage information and exits
- **`--version`**: Prints the version from `meta.version` and exits
- **Errors**: Catches exceptions, shows usage + error message, exits with code 1

## How Subcommand Resolution Works

1. Parses the raw arguments
2. Finds the first non-flag argument
3. Looks it up in the `subCommands` map
4. If found, resolves the subcommand (may be lazy/async)
5. Recursively calls `runCommand` on the subcommand with remaining arguments
6. If no subcommand matched, the parent command's `run` function is executed

## Design Philosophy

1. **Zero dependencies** -- relies only on `util.parseArgs` (Node.js 18.3+)
2. **Type-safe by design** -- `defineCommand` provides full TypeScript inference
3. **Resolvable pattern** -- lazy loading and dynamic configuration everywhere
4. **Composable** -- commands are standalone objects that can be nested arbitrarily
5. **Convention over configuration** -- auto help, auto version, smart type coercion

## Comparison with Alternatives

| Feature | citty | commander | yargs |
|---|---|---|---|
| Zero dependencies | Yes | Yes | No |
| TypeScript-first | Yes | Partial | Partial |
| Lazy commands | Yes (Resolvable) | No | No |
| setup/cleanup hooks | Yes | No | No |
| Auto help/version | Yes | Yes | Yes |
| Based on `util.parseArgs` | Yes | No | No |
| Bundle size | Very small | Small | Medium |

## Sources

- [GitHub - unjs/citty](https://github.com/unjs/citty)
- [citty - npm](https://www.npmjs.com/package/citty)
- [citty README](https://github.com/unjs/citty/blob/main/README.md)
- [citty - UnJS Packages](https://unjs.io/packages/citty/)
