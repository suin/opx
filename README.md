# opx

![opx](social-preview.svg)

Thin wrapper around [`op run`](https://developer.1password.com/docs/cli/reference/commands/run/) that auto-finds the nearest `.env` file.

## Why

Running `op run --env-file=.env -- <command>` across multiple projects is tedious. `opx` reduces this to:

```sh
opx npm run dev
# equivalent to: op run --env-file=/path/to/.env -- npm run dev
```

## Install

### Devbox

```sh
devbox add github:suin/nixpkgs#opx
```

### Bun

```sh
bun add -g @suin/opx
```

### mise

```sh
mise use -g github:suin/opx
```

### curl (standalone binary)

```sh
curl -fsSL https://raw.githubusercontent.com/suin/install/main/install.sh | bash -s -- opx
```

## Requirements

- [1Password](https://1password.com/) account
- [1Password desktop app](https://1password.com/downloads)
- [1Password CLI (`op`)](https://developer.1password.com/docs/cli/get-started/)

## Getting Started

If you're new to 1Password CLI, this section walks you through the entire setup from scratch.

### 1. Install 1Password CLI

Follow the [official installation guide](https://developer.1password.com/docs/cli/get-started/) for your platform.

Verify the installation:

```sh
op --version
```

### 2. Connect the CLI to the 1Password App

The CLI authenticates through the 1Password desktop app (biometric unlock). Enable this in the desktop app:

**1Password > Settings > Developer > "Connect with 1Password CLI"** (check the box)

### 3. Store Your Secrets in 1Password

Open the 1Password desktop app and create a vault and items for your project's secrets. For example:

| Vault         | Item       | Field           | Value                                      |
| ------------- | ---------- | --------------- | ------------------------------------------ |
| `Development` | `Database` | `url`           | `postgres://user:pass@localhost:5432/mydb` |
| `Development` | `Stripe`   | `secret-key`    | `sk_test_abc123`                           |
| `Development` | `AWS`      | `access-key-id` | `AKIA...`                                  |

Each secret can then be referenced using the `op://` URI format:

```
op://vault-name/item-name/field-name
```

For example, the database URL above becomes `op://Development/Database/url`.

> **Tip:** You don't have to type `op://` references by hand. In the 1Password desktop app, right-click on any field and select **"Copy Secret Reference"** to copy the `op://` URI to your clipboard.
>
> **Tip:** You can verify a reference works by running `op read "op://Development/Database/url"`.

### 4. Create a `.env` File in Your Project

Instead of writing plaintext secrets, use `op://` references:

```sh
# .env
DATABASE_URL=op://Development/Database/url
STRIPE_SECRET_KEY=op://Development/Stripe/secret-key
AWS_ACCESS_KEY_ID=op://Development/AWS/access-key-id

# Non-secret values can stay as plain text
PORT=3000
LOG_LEVEL=debug
```

Place this `.env` file in your project root (or any ancestor directory — `opx` walks up the directory tree to find the nearest one).

Since the file contains no actual secrets, it is **safe to commit to version control**:

```gitignore
# .gitignore
# No need to ignore .env — it only has op:// references, not real secrets
```

### 5. Run Your Command with `opx`

```sh
opx npm run dev
```

That's it. `opx` finds the `.env` file, and 1Password resolves all `op://` references into real values, injecting them as environment variables **only for the duration of that command**. When the process exits, the secrets are gone from the environment.

### How It Works

```
opx npm run dev
 ↓
Finds nearest .env file
 ↓
Runs: op run --env-file=.env -- npm run dev
 ↓
1Password CLI:
  1. Reads .env, finds op:// references
  2. Authenticates via desktop app (biometric/Touch ID)
  3. Fetches secrets from vault
  4. Injects them as env vars into the subprocess
  5. Masks secrets in stdout/stderr output
 ↓
npm run dev runs with secrets available as env vars
 ↓
Process exits → secrets destroyed
```

## Usage

```sh
opx <command> [args...]
```

### Examples

```sh
opx npm run dev
opx node server.js
opx docker compose up
```

### Options

- `--help`, `-h` — Show usage
- `--version` — Show version

## Troubleshooting

| Problem                                       | Cause                                        | Solution                                                                 |
| --------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------ |
| `op: command not found`                       | 1Password CLI not installed                  | [Install the CLI](https://developer.1password.com/docs/cli/get-started/) |
| `unexpected response from 1Password app`      | Desktop app is locked                        | Unlock the 1Password app                                                 |
| `connecting to desktop app: connection reset` | CLI can't connect to app                     | Enable "Connect with 1Password CLI" in 1Password > Settings > Developer  |
| `secret reference not found`                  | Vault, item, or field name mismatch          | Check names with `op item get <item> --vault <vault>`                    |
| `.env file not found`                         | No `.env` in current or ancestor directories | Create a `.env` file in your project root                                |
