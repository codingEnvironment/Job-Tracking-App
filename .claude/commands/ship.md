---
description: Summarize this session's work, formatted to match the type of work done (code, docs, config, research, or mixed).
---

Summarize this session's work concisely. The format must adapt to what was actually done.

First, classify the primary work type by inspecting what was touched in the session:
- **code** — files under `server/src/`, `client/src/`, or similar source directories
- **docs** — `CLAUDE.md`, `README.md`, or other `.md` files
- **config** — `.claude/settings.json`, `.env`, `package.json`, build configs, hook scripts
- **research** — mostly Read/Grep/WebFetch with no substantive writes; the user wanted understanding, not changes
- **mixed** — two or more of the above contributed materially (don't pick this lazily; only when one slice doesn't dominate)

Then output a summary in the format for that type.

### code
- **What changed** — bulleted list. Each bullet is `[file.ts:line](relative/path.ts:line) — one short sentence on the change.` Group related edits under one bullet when possible.
- **Why** — one sentence anchored to the user's actual request. Not "to improve the code" — say the concrete problem this resolves.
- **Decisions worth remembering** — non-obvious trade-offs, alternatives ruled out, gotchas surfaced. Skip the section entirely if nothing notable.
- **Follow-ups** — manual actions the user still needs to do (restart server, edit `.env`, reload `/hooks`, test in browser). Skip if none.

### docs
- **Sections touched** — `file.md § Section Name` → one-line on what's new or changed.
- **What drove this** — the bug, confusion, or feature that made the doc change necessary.

### config
- **Files changed** — short list with one-line effect each.
- **Behaviour change** — what runs differently now.
- **Action required** — restarts, reloads (`/hooks`, server restart), env updates.

### research
- **Question** — what we set out to learn (one line).
- **Sources consulted** — files read, docs fetched, web searches.
- **Findings** — 3–5 bullets max, leading with the answer.
- **What this unblocks** — what the user can now decide or do.

### mixed
Combine the relevant slices above, lead with whichever was the largest share of the work. Keep total length ≤ 25 lines.

Rules:
- Use clickable markdown file links: `[name.ts:42](relative/path/name.ts:42)`.
- Drop any section that would be empty — don't write "None." headers.
- If nothing substantive happened (a question answered with no edits, or a single trivial change), output one or two plain sentences instead of using a template. Don't pad.
- Keep total length tight. A good `/ship` is something the user can scan in 10 seconds and copy into a commit message or standup update.
- No emojis.
