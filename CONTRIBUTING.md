# Contributing to VPP

Thank you for contributing to VPP! This guide covers branching, commits, PRs, and dev workflow.

---

## Quick Start

```bash
# Clone repo
git clone <repo-url>
cd vpp

# Install dependencies
pnpm install

# Start dev servers
pnpm dev
```

---

## Branch Naming

Use prefix-based naming:

| Type      | Format                          | Example                              |
|-----------|---------------------------------|--------------------------------------|
| Feature   | `feature/phase-N-description`   | `feature/phase-1-user-auth`          |
| Fix       | `fix/description`               | `fix/login-crash-on-expiry`          |
| Chore     | `chore/description`             | `chore/update-dependencies`          |
| Docs      | `docs/description`              | `docs/add-r2-setup-guide`            |
| Refactor  | `refactor/description`          | `refactor/extract-upload-service`    |

---

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type        | When to use                          |
|-------------|--------------------------------------|
| `feat`      | New feature                          |
| `fix`       | Bug fix                              |
| `docs`      | Documentation only                   |
| `style`     | Formatting, no code change           |
| `refactor`  | Code restructuring, no behavior change |
| `perf`      | Performance improvement              |
| `test`      | Adding or updating tests             |
| `chore`     | Build, config, tooling               |

### Examples

```
feat(auth): add OAuth login with Google
fix(render): handle missing video codec gracefully
docs(r2): add Cloudflare R2 setup guide
chore(deps): bump pocketbase to 0.23.0
test(upload): add file size validation tests
```

### Scope

Use lowercase, hyphenated: `auth`, `render`, `upload`, `ui`, `api`, `pb`, `frontend`.

---

## Pull Requests

### Requirements

- [ ] Branch created from `develop`
- [ ] Descriptive title using conventional commit format
- [ ] PR description includes:
  - What changed
  - Why the change was made
  - How to test
- [ ] All tests pass (`pnpm test`)
- [ ] No linting errors (`pnpm lint`)
- [ ] Code formatted (`pnpm format`)
- [ ] At least 1 review approval before merge

### PR Template

```markdown
## What
<!-- Brief description of changes -->

## Why
<!-- Motivation / context -->

## How to Test
<!-- Steps to verify -->

## Screenshots (if UI)
<!-- Before / after -->
```

---

## Dev Workflow

### Install Dependencies

```bash
pnpm install
```

### Development Mode

```bash
# Start all dev servers (frontend + PocketBase)
pnpm dev
```

### Build

```bash
# Production build
pnpm build
```

### Lint & Format

```bash
# Check for lint errors
pnpm lint

# Fix auto-fixable issues
pnpm lint --fix

# Format code with Prettier
pnpm format

# Check formatting without changes
pnpm format:check
```

### Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch
```

---

## Code Style

### ESLint

- Configured in `eslint.config.js` (or `.eslintrc.*`)
- Enforces: no unused vars, consistent returns, safe type checks
- Run: `pnpm lint`

### Prettier

- Configured in `.prettierrc` (or `prettier.config.js`)
- Rules:
  - Semi: true
  - Single quote: true
  - Trailing comma: all
  - Print width: 100
  - Tab width: 2
- Run: `pnpm format`

### Pre-commit Hook (recommended)

```bash
# Install husky (if not already set up)
pnpm add -D husky
npx husky init

# Add pre-commit hook
cat > .husky/pre-commit << 'EOF'
#!/usr/bin/env sh
pnpm lint
pnpm format:check
EOF
```

---

## Project Structure

```
vpp/
├── frontend/          # SvelteKit / Vite frontend
├── pb/                # PocketBase server + migrations
├── scripts/           # Build, deploy, utility scripts
├── docs/              # Documentation
├── plans/             # Project plans and specs
├── phase1-*/          # Phase-specific output directories
├── .env.example       # Environment template (copy to .env)
├── package.json       # Root package (workspaces)
└── .gitignore         # Git ignore rules
```

---

## Getting Help

- Check `PROJECT_PLAN.md` for overall architecture
- Check `AGENTS.md` for agent-specific documentation
- Check `docs/` for setup guides
- Open an issue for bugs or feature requests
