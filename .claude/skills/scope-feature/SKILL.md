---
name: scope-feature
description: Scope a feature before building it. Use this whenever the user wants to add, implement, or build something new — even if they don't say "scope". Triggers on "I want to add X", "can we add X", "let's build X", "add a feature", "/scope-feature". Always use this skill before starting any new feature work; it prevents wasted implementation effort by catching unclear requirements and edge cases upfront.
---

Ask all of these in one message — don't drip them one by one:

1. **What** — What does this do in one sentence?
2. **Trigger** — What user action starts it?
3. **Happy path** — Exact steps from trigger to success.
4. **Edge cases** — What can go wrong? (empty states, errors, duplicates, conflicts)
5. **Out of scope** — What is explicitly NOT part of this version?
6. **Data** — New fields on Job / User / Kit, or a new collection?
7. **Architecture** — Does it touch auth, SSE streaming, AI generation, or drag-and-drop order? These have sharp edges in CLAUDE.md.

Wait for answers. Then output a plan in this exact format — no prose:

## Plan: [feature name]

**Files to touch**
- `path/to/file` — what changes

**Data model** *(omit if no changes)*
- `ModelName` — field or schema additions

**API** *(omit if no changes)*
- `METHOD /route` — what it does

**UI** *(omit if no changes)*
- `ComponentName` — what changes

**Out of scope**
- bullet list

Then stop. Do not write any code until the user explicitly approves (e.g. "yes", "build it", "looks good", "approved").
