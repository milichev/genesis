# Install & publish (Agent Skills)

Distribution is **git or a local folder** plus the [skills CLI](https://github.com/vercel-labs/skills). There is no separate “publish” step.

## skills.sh is not an upload portal

[skills.sh](https://www.skills.sh/) is a **leaderboard** driven by install telemetry. It ranks skills as people install them with `npx skills add …`. There is **no** Publish button, registry upload, or publish API—put the skill where others can clone or path-install it, then document the install command.

## Discovery layout

The CLI looks for **`SKILL.md` at the skill root** (this repo layout). It also accepts known containers (`skills/`, `.agents/skills/`, etc.) inside a repo. For `wiki-stats`, the folder that contains `SKILL.md` is the install target.

## Local install (default e2e for this sprint)

Use an **absolute path** to the skill directory on your machine. Replace the prefix if your clone lives elsewhere:

```bash
npx skills add ~/Dev/genesis/ai-school/test-case/wiki-stats -g -a cursor -y
```

| Flag        | Meaning                                        |
| ----------- | ---------------------------------------------- |
| `-g`        | Install into the user’s global skills location |
| `-a cursor` | Target Cursor                                  |
| `-y`        | Non-interactive confirm                        |

After install, the skills CLI copies into **`~/.agents/skills/wiki-stats`** (global, Cursor target). You should see `wiki-stats` under `~/.agents/skills/`.

**Verify the skill end-to-end:**

1. Confirm `~/.agents/skills/wiki-stats/SKILL.md` exists (or list `~/.agents/skills/`).
2. From the **installed copy’s directory** (or the source tree you linked), run once: `npm install`, then `npx wiki-stats run --topic "…" --langs pl,cs --months 24` (or `node scripts/cli.js run …`).

Pushing to a specific public GitHub remote is **out of scope** for the stabilization sprint unless you already have a URL ready—local path install is the default check.

## GitHub install

When the skill lives in a **public** repository:

```bash
npx skills add <owner>/<repo> -g -a cursor -y
```

If the skill is **not** at the repository root (e.g. monorepo), use the tree URL to the folder that contains `SKILL.md`:

```bash
npx skills add https://github.com/<owner>/<repo>/tree/main/ai-school/test-case/wiki-stats -g -a cursor -y
```

Adjust branch (`main` vs `master`) and path to match your layout.

## Optional badge

Some repos add a [skills.sh badge](https://www.skills.sh/) showing install rank. It is **optional**—ranking still comes from installs, not from badge placement.

## npm vs skills CLI

- **`npx skills add …`** — registers the skill for Cursor (Agent Skills).
- **`npm install` in the skill root** — installs Node dependencies for the `wiki-stats` CLI. Do both: skills install for the agent, npm install before running commands.
