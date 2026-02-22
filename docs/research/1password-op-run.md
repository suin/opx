# 1Password CLI `op run` Command

## Overview

The `op run` command securely loads secrets from your 1Password vault and executes a command in a subprocess, making secrets available as environment variables **only for the duration of that subprocess**. When the subprocess exits, the secrets are no longer in the environment.

## Basic Syntax

```bash
op run [flags] -- <command> [args...]
```

The double dash (`--`) separates `op run` flags from the command to execute.

## How It Works

1. `op run` scans all currently set environment variables (and optionally `.env` files) for **secret references** (`op://` URIs)
2. Authenticates with 1Password (biometric/Touch ID, session token, or service account token)
3. Fetches actual secret values from the vault
4. Spawns a subprocess with resolved values injected as environment variables
5. When the subprocess exits, the environment is destroyed and secrets are gone

Secrets only exist in memory during the subprocess lifetime. They are never written to disk.

## Secret References (`op://`)

Secret references are URIs that point to specific fields in 1Password vaults:

```
op://vault-name/item-name/field-name
op://vault-name/item-name/section-name/field-name
```

### Components

| Component | Description |
|-----------|-------------|
| `vault` | Vault name or unique ID |
| `item` | Item name or unique ID |
| `section` | (Optional) Section within the item |
| `field` | Field name (e.g., `password`, `username`, `credential`) |

### Examples

```
op://Development/Database/password
op://Development/PagerDuty/Admin/email
op://dev/Stripe/publishable-key
op://Production/AWS/access-key-id
```

### Using UUIDs for Stability

Recommended in automation contexts -- immune to item renames:

```
op://abc123def/xyz789ghi/password
```

### Dynamic Environment Switching

```
op://$APP_ENV/mysql/password
```

Set `APP_ENV=dev` or `APP_ENV=prod` to target different vaults.

### Query Parameters

```
op://vault/item/field?attr=otp           # Generate OTP code
op://vault/item/field?attr=type          # Get field type
op://vault/item/field?ssh-format=openssh # SSH key in OpenSSH format
```

## Usage Examples

### With Exported Environment Variables

```bash
export DATABASE_URL="op://Development/Database/connection-string"
export API_KEY="op://Development/Stripe/secret-key"
op run -- bun run index.ts
```

### With `.env` File

```bash
op run --env-file=.env -- bun run index.ts
```

### Multiple `.env` Files

```bash
op run --env-file=base.env --env-file=prod.env -- bun run index.ts
```

When the same variable exists in multiple files, the **last file takes precedence**.

## Using with `.env` Files

Replace plaintext secrets with secret references:

**Before (insecure):**
```
DATABASE_URL=postgres://user:s3cret@db.example.com:5432/mydb
API_KEY=sk_live_abc123xyz
```

**After (safe to commit):**
```
DATABASE_URL=op://Development/Database/connection-string
API_KEY=op://Development/Stripe/secret-key
ENVIRONMENT=production
```

### `.env` File Rules

- `KEY=VALUE` format, one per line
- Lines starting with `#` are comments
- Empty lines are skipped
- Values can be enclosed in single or double quotes
- `$VAR_NAME` is expanded from the shell environment

### Version Control

Because `.env` files with only `op://` references contain no plaintext secrets, they are safe to commit:

```gitignore
.env*
!.env           # Only contains op:// references, safe to commit
```

## Flags and Options

### `op run` Specific Flags

| Flag | Description |
|------|-------------|
| `--env-file=<path>` | Path to an environment file to scan for secret references. Can be specified multiple times. |
| `--no-masking` | Disable concealing of secrets printed to stdout/stderr. |
| `--environments=<id>` | Load variables from a 1Password Environment by its ID. |

### Global Flags

| Flag | Description |
|------|-------------|
| `--account <shorthand>` | Use the account with this shorthand/sign-in address/ID. |
| `--config <directory>` | Use this configuration directory. |
| `--debug` | Enable debug mode for verbose output. |
| `--format <type>` | Output format: `human` or `json`. |
| `--no-color` | Disable color output. |
| `--session <token>` | Authenticate with this session token. |

### Environment Variables

| Variable | Description |
|----------|-------------|
| `OP_SERVICE_ACCOUNT_TOKEN` | Authenticate with a service account token (CI/CD). |
| `OP_RUN_NO_MASKING` | Toggle masking off (alternative to `--no-masking`). |
| `OP_DEBUG` | Enable debug mode. |

## Output Masking

By default, `op run` conceals secrets printed to stdout/stderr, replacing them with `<concealed by 1Password>`.

```bash
# Default: secrets are masked
op run --env-file=.env -- printenv API_KEY
# Output: <concealed by 1Password>

# Unmasked
op run --no-masking --env-file=.env -- printenv API_KEY
# Output: sk_live_abc123xyz
```

### Side Effect of Masking

When masking is enabled, **stdout and stderr are no longer TTYs**. This can cause:

- Loss of colored output from subprocesses
- Changed behavior in programs that detect TTY (e.g., interactive prompts)

Use `--no-masking` if you need TTY behavior.

## Environment Variable Precedence

From highest to lowest:

1. **1Password Environments** (`--environments` flag)
2. **Environment files** (`--env-file`)
3. **Shell environment variables**

## Common Patterns

### Local Development

```bash
# .env (committed to git)
DATABASE_URL=op://Development/Database/url
REDIS_URL=op://Development/Redis/url
API_KEY=op://Development/API/key

# Start the app
op run --env-file=.env -- bun --hot index.ts
```

### CI/CD with Service Accounts

```bash
# In CI pipeline (e.g., GitHub Actions)
export OP_SERVICE_ACCOUNT_TOKEN=${{ secrets.OP_SERVICE_ACCOUNT_TOKEN }}
op run --env-file=.env -- bun test
```

### Environment-Specific Configurations

```bash
# base.env (shared)
LOG_LEVEL=info
PORT=3000

# dev.env
DATABASE_URL=op://Development/Database/url

# prod.env
DATABASE_URL=op://Production/Database/url

# Usage
op run --env-file=base.env --env-file=dev.env -- bun run index.ts
op run --env-file=base.env --env-file=prod.env -- bun run index.ts
```

### Dynamic Vault Selection

```bash
# .env
DATABASE_URL=op://$APP_ENV/mysql/password

# Usage
APP_ENV=staging op run --env-file=.env -- bun run index.ts
APP_ENV=production op run --env-file=.env -- bun run index.ts
```

## Error Handling and Troubleshooting

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "unexpected response from 1Password app" | Desktop app is locked | Unlock the 1Password app |
| "connecting to desktop app: connection reset" | CLI can't connect to app | Enable "Connect with 1Password CLI" in Settings > Developer |
| Secret reference not found | Vault/item/field name mismatch | Verify with `op item get <item> --vault <vault>` |
| Shell expands `$VAR` too early | Variable expansion order | Export the variable first, or use single quotes |

### Debugging

```bash
# Inspect resolved environment variables
op run --env-file=.env -- env

# Verbose logging
OP_DEBUG=true op run --env-file=.env -- bun run index.ts

# Verify a single reference
op read "op://vault/item/field"

# Check item fields
op item get <item-name> --vault <vault-name>
```

### Shell Variable Expansion Caveat

```bash
# WRONG: $APP_ENV is empty
op run --env-file=.env -- bun run index.ts

# RIGHT: export first
export APP_ENV=production
op run --env-file=.env -- bun run index.ts
```

## Best Practices

- Replace all plaintext secrets in `.env` files with `op://` references
- Commit `.env` files that only contain `op://` references to version control
- Use item UUIDs in CI/CD and automation for stability against renames
- Use service accounts (not personal accounts) in shared/automated environments
- Scope service accounts to only the vaults they need
- Use `--no-masking` only when debugging or when TTY output is required

## Sources

- [op run command reference](https://developer.1password.com/docs/cli/reference/commands/run/)
- [Load secrets into the environment](https://developer.1password.com/docs/cli/secrets-environment-variables/)
- [Use secret references with 1Password CLI](https://developer.1password.com/docs/cli/secret-references/)
- [Secret reference syntax](https://developer.1password.com/docs/cli/secret-reference-syntax/)
- [1Password CLI environment variables](https://developer.1password.com/docs/cli/environment-variables/)
