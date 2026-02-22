#!/usr/bin/env bun
import pkg from "../package.json";
import { findEnvFile } from "./find-env-file";
import { run } from "./run";

const VERSION = pkg.version;

const USAGE = `opx - Thin wrapper around \`op run\`

Usage:
  opx <command> [args...]

Examples:
  opx bun run dev
  opx node server.js
  opx docker compose up

opx automatically finds the nearest .env file and runs:
  op run --env-file=<path> -- <command> [args...]`;

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error(USAGE);
  process.exit(1);
}

if (args[0] === "--help" || args[0] === "-h") {
  console.log(USAGE);
  process.exit(0);
}

if (args[0] === "--version") {
  console.log(VERSION);
  process.exit(0);
}

const envFile = await findEnvFile(process.cwd());
if (!envFile) {
  console.error(
    "Error: No .env file found in current directory or any parent directory."
  );
  process.exit(1);
}

const exitCode = await run(envFile, args);
process.exit(exitCode);
