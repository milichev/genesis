---
name: wiki-stats demo prep
overview: "Screen-share demo prep: install skill, five prompts (A–E), ~10–12 min script, pre-warm, and backup path if the agent stalls."
todos:
  - id: sync-demo-md
    content: Mirror install/publish + checklist from this plan into DEMO.md when executing
    status: pending
  - id: fix-agents-p3-link
    content: Point AGENTS.md Phase 3 row at 3-wiki-stats_qa_f849d237.plan.md
    status: pending
  - id: dry-run
    content: Off-camera dry run A→C with cache warm; note output/ paths to open live
    status: pending
isProject: false
---

# Demo prep — wiki-stats (plan 4)

Canonical narrative + prompts: `[ai-school/test-case/DEMO.md](../ai-school/test-case/DEMO.md)`  
Learnings: `[ai-school/test-case/LEARNINGS.md](../ai-school/test-case/LEARNINGS.md)`  
Prior plan: `[3-wiki-stats_qa_f849d237.plan.md](3-wiki-stats_qa_f849d237.plan.md)` (QA / Phase 3)  
Install detail: `[wiki-stats/references/publish.md](../ai-school/test-case/wiki-stats/references/publish.md)`

---

## Install / “publish” (say this live)

**There is no Publish button.** [skills.sh](https://www.skills.sh/) = install leaderboard only. Distribution = path or git + skills CLI.

**Local (demo default):**

```bash
npx skills add ~/Dev/genesis/ai-school/test-case/wiki-stats -g -a cursor -y
```

- Lands in `~/.agents/skills/wiki-stats`
- Then in skill root (source or installed copy): `npm install` so `npx wiki-stats` works
- Verify: `ls ~/.agents/skills/wiki-stats/SKILL.md` + `npm test` in skill root

**GitHub (if public later):**

```bash
npx skills add <owner>/<repo> -g -a cursor -y
# monorepo:
npx skills add https://github.com/milichev/genesis/tree/main/ai-school/test-case/wiki-stats -g -a cursor -y
```

**Two installs, don’t conflate:** `skills add` = agent discovers skill; `npm install` = CLI deps.

---

## Winning prompts (short)

- **A** PL vs CS intermittent fasting, 24m — no alert, core brief
- **B** five langs estimate → `Brief` then run — CLI owns wait
- **C** `нірвана` + `--pivot uk` — non-Latin
- **D** astronomy / uk trust — caveats
- **E** missing langlink honesty

Full paste text: [DEMO.md](../ai-school/test-case/DEMO.md).

## Script beats

1. Install one-liner + “no publish API” (30s)
2. Problem + CLI/strategist
3. `npm test` + Prompt A artifacts
4. Prompt B alert
5. Prompt C pivot
6. Data-gap honesty
7. Roadmap `next-move` ([roadmap.md](../ai-school/test-case/wiki-stats/references/roadmap.md))

Pre-warm `estimate`/`run` off-camera. Prefer opening a **known** `output/…/brief.md` if network is slow.

---

## Anything missing? (checklist)


| Gap                    | Why                                             | Action                                                            |
| ---------------------- | ----------------------------------------------- | ----------------------------------------------------------------- |
| **Backup path**        | Agent/Haiku may stall or skip `estimate`        | Keep terminal ready; run CLI yourself and narrate from `brief.md` |
| **Model**              | Assignment wants cheap tool-using model         | Decide live: Cursor agent model vs CLI-only; say which            |
| **UA / network**       | Cold AQS needs identifying UA + net             | Confirm `WIKI_STATS_UA` / default UA; don’t demo offline          |
| **AGENTS.md link**     | Still points at old `wiki-stats_phase_3_…` name | Fix to `3-wiki-stats_qa_f849d237.plan.md`                         |
| **DEMO.md sync**       | Install section lives here only until mirrored  | Copy install block into DEMO.md on execute                        |
| **Output paths**       | Hunting `output/` mid-pitch burns time          | Note 1–2 paths after pre-warm                                     |
| **Optional 10s aside** | `ua` / bad `--pivot`                            | Validation story — skip if timeboxed                              |
| **Public GitHub**      | Not required for local demo                     | Only if evaluator must `skills add` from URL                      |


Not missing for pitch: PDF, FSM code, Wikidata — those stay roadmap.