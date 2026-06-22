# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

npm workspaces monorepo — run from repo root unless noted.

```bash
npm install                 # install both workspaces
npm run dev                 # concurrent: server :4000 + client :5173
npm run dev:server          # tsx watch — server only
npm run dev:client          # vite dev — client only
npm run build               # tsc (server) + vite build (client)
npm run start               # node dist/index.js (built server)

# Single-workspace commands
npm run <script> -w server
npm run <script> -w client
```

No test runner is wired up; no linter is configured. Typecheck via `npx tsc -b --noEmit` inside `client/` or `npx tsc -p tsconfig.json --noEmit` inside `server/`.

## Environment

Copy `.env.example` to `.env` at repo root. The server reads it via dotenv; Vite reads `VITE_*` vars from the same file when run via the root scripts. Required:

- `MONGODB_URI` — MongoDB Atlas connection string
- `JWT_SECRET` — signing key for the session cookie
- `APP_PASSWORD` — the single password that gates the app (no signup)
- `OPENROUTER_API_KEY` — used server-side only; never sent to the client
- `OPENROUTER_KIT_MODELS` — comma-separated cascade of kit-generation models. Tried in order; on 429 (rate limit) or 402 (credit) the request falls through to the next model. Default is intentionally short — `meta-llama/llama-3.3-70b-instruct:free, nvidia/nemotron-3-super-120b-a12b:free` — because each failed attempt costs 1–3s of dead time before streaming starts. Llama 3.3 leads because it's been the stable historical default; Nemotron is the on-quality-fail backup. **Do not extend the default chain "for safety"** — a 4-model chain was tried earlier and the rate-limit cascade added ~10s of pre-stream latency on the unhappy path, which is worse UX than the rare 429 error. If you genuinely need more resilience, switch to hedged parallel requests instead of lengthening the chain. All free models are rate-limited ~20/min ~200/day per provider.
- `OPENROUTER_EXTRACT_MODEL` — lightweight JSON-extraction model used by the paste-JD ingestion path. Defaults to `meta-llama/llama-4-scout:free` (MoE, only 17B active params → fast inference for the 3-field extract job).
- `OPENROUTER_SEARCH_MODEL` — live-web model used by the job search page only. Falls back to `perplexity/sonar`. Must be a model with native web access (Perplexity sonar family, or any model with the `:online` suffix). Try `perplexity/sonar-reasoning` for better grounding if your account has credits.
- `CLIENT_ORIGIN` — must match the client URL for CORS + cookie `sameSite`

Server fails fast at startup if any required var is missing (see `server/src/env.ts`).

## Architecture

Personal single-user job-application pipeline. React board on the front, Express+Mongo on the back, OpenRouter for AI generation. The pieces that require reading multiple files to understand:

### Auth model — single user, single password
There is no signup. `APP_PASSWORD` is compared in plaintext at `/auth/login`; on success the server `ensureSingleUser()`s a fixed `mahesh@local` user document and issues a 30-day JWT cookie (`jt_session`, httpOnly). All `/me`, `/jobs`, `/jobs/:id/kit` routes go through `requireAuth` which sets `req.userId`. Every Mongo query is scoped by `userId`, even though there's only one user — this keeps the door open for multi-user later without rewrites.

### Drag-and-drop ordering uses fractional floats
`Job.order` is a `Number`. To insert a card between neighbors `prev` and `next`, the client computes `(prev.order + next.order) / 2` and PATCHes. New cards land at `(maxOrder + 1000)`. This avoids re-numbering the whole column on every drop. The reorder logic lives in `client/src/pages/BoardPage.tsx` in `onDragEnd` — if you touch it, preserve the "drop on column vs. drop on card" branching (`col:<status>` droppable IDs vs. job `_id`s).

### Kit generation streams via SSE; history is never overwritten
`POST /jobs/:id/kit` (mounted at root in `server/src/index.ts`, defined in `routes/kit.ts`) returns `text/event-stream`. The OpenRouter call uses the streaming endpoint (`server/src/ai/openrouter.ts` → `streamGenerate`), and each delta is forwarded as an SSE `delta` event. When the stream completes, the server persists a new `Kit` document and emits a `done` event with its `_id`. **Every regeneration creates a new Kit row** — the client renders a version dropdown from `GET /jobs/:id/kits`. Do not add an "overwrite latest" path; the user explicitly chose history-on-every-regenerate.

The four kit kinds (`cover` | `bullets` | `questions` | `brief`) and their prompt templates live in `server/src/ai/prompts.ts`. The candidate profile (MERN + AWS) is baked into the system prompt for every kit. To add a new kit kind, update: `KIT_KINDS` in `models/Kit.ts`, the `buildPrompt` switch in `ai/prompts.ts`, and `KIT_TABS` in `client/src/components/JobDrawer.tsx`.

`max_tokens` is capped explicitly in `server/src/ai/openrouter.ts` — 800 default for both `generate()` and `streamGenerate()`. This is required: OpenRouter reserves the cap against your balance up front, so omitting it makes the API reserve the full model context (e.g. 64k for Llama 3.3), which fails with a 402 on free/low-balance accounts even when the actual output is tiny. Don't remove the caps without raising the account balance.

`generate(messages, model, maxTokens = 800)` — `model` is required (no implicit default), `maxTokens` is a parameter, not hardcoded. Callers that need larger output (e.g. search returning 10-15 JSON results) pass their own cap: `generate(msgs, SEARCH_MODEL, 4000)`.

**Kit generation cascades through `env.OPENROUTER_KIT_MODELS`.** `routes/kit.ts` walks the chain in order. If the request body or `user.defaultModel` specifies a model, that's prepended to the chain (and de-duplicated from the rest). On `OpenRouterRetryableError` (status 429 rate-limit or 402 credit) the loop emits an SSE `info` event and moves to the next candidate. This is safe mid-handler because the retryable error is thrown from `streamGenerate` on the initial fetch response — *before* any delta has been yielded — so `full` is still `''` and switching models cannot send mismatched chunks. Non-retryable errors (auth, 5xx, network, malformed payload) break the loop immediately and surface as an SSE `error` event; do not "helpfully" cascade past these or you'll mask real bugs. The persisted `Kit.model` records which model actually produced the output. The cascade only works because the default chain spans four distinct providers — collapsing it to one provider defeats the purpose.

### Kit output renders as markdown
`client/src/components/KitPanel.tsx` wraps output in `<ReactMarkdown>` with a `.kit-prose` scoped class (defined in `client/src/index.css`). Do not revert to `whitespace-pre-wrap` — the AI generates structured markdown (headers, bullets, bold) that needs to be rendered, not displayed raw. The `.kit-prose` styles cover h1-h3, p, ul/ol, strong, code, pre, blockquote, and hr using Linear color tokens.

### Client SSE parser is hand-rolled, not EventSource
`EventSource` doesn't support POST or cookies cleanly, so `streamKit` in `client/src/lib/api.ts` uses `fetch` + a ReadableStream reader and parses `event:`/`data:` lines manually. The buffer is split on `\n\n` between events; partial events are kept in `buf`. If you refactor this, mirror the behavior — the server intentionally sends both `event:` and `data:` lines per chunk.

### Module system
Server is ESM (`"type": "module"`). TS source imports use `.js` extensions even when pointing at `.ts` files (e.g. `import { env } from './env.js'`). This is required for the ESM resolver after `tsc` emits — do not change to extensionless imports. Client is also ESM (Vite default).

### Resume upload extracts text on the server
`POST /me/resume` (in `server/src/routes/me.ts`) accepts a multipart upload via `multer` (memory storage, 5MB cap) and dispatches by extension/mimetype: `unpdf` for PDF, `mammoth` for DOCX, plain UTF-8 for `.txt`/`.md`. Extracted text replaces `User.masterResume`. The Settings page sends to this endpoint, then refreshes the textarea so you can hand-edit if extraction was messy.

**Don't swap PDF parsing back to `pdf-parse`.** That package runs a test fixture on default import (crashes) and its `package.json` `exports` field blocks the `pdf-parse/lib/pdf-parse.js` workaround in modern Node (`ERR_PACKAGE_PATH_NOT_EXPORTED`). `unpdf` (pdfjs-based, designed for serverless Node) is the working choice — use `getDocumentProxy(new Uint8Array(buf))` then `extractText(pdf, { mergePages: true })`.

### Job search uses Perplexity sonar for live web results
`POST /search/jobs` (in `server/src/routes/search.ts`, mounted via `server/src/index.ts`) calls `searchJobs()` from `server/src/ai/search.ts`. It uses `perplexity/sonar` — Perplexity's current live-web model on OpenRouter. **Do not revert to `perplexity/llama-3.1-sonar-small-128k-online`** — that model ID was deprecated and returns a 404.

Filters: `{ location?, remote: boolean, role?, salaryMin?, salaryMax? }`. The route returns 400 if `!remote && !location` — an unfocused global search wastes tokens and returns poor results. Token cap for this call is 4000 (10-15 job results as JSON would be truncated at the default 800).

**Do not use `perplexity/sonar-deep-research` as the search model** — it is paid and OpenRouter upfront-reserves the full 4000-token cap against your credit balance, returning a 402 on free/low-balance accounts. Stick to `perplexity/sonar` (free tier).

**Freshness window is 14 days**, enforced at two layers: the system prompt tells the model to drop any posting older than 14 days from today's date (injected as `${today}` at runtime), and `parseResults()` drops anything where `postedDaysAgo() > MAX_AGE_DAYS` (14). Do not raise `MAX_AGE_DAYS` — the original 60-day value was the root cause of stale results appearing.

`parseResults()` in `search.ts` is defensive: strips markdown fences, finds the `[` … `]` boundaries, JSON.parses, and normalises every field to a string/boolean. Returns `[]` on any parse failure rather than throwing.

The client (`SearchPage.tsx`) guards against missing resume (shows a banner + link to Settings) and missing location (disables the Search button). Results are displayed as `ResultCard` components with source-coloured badges; "Add to Board" calls `api.createJob()` with a formatted JD string and turns green after success.

**Search state lives in `App.tsx`, not `SearchPage`.** Filters, results, and added-URLs are lifted up and passed as props (`filters`, `results`, `addedUrls`, `onFiltersChange`, `onResultsChange`, `onAddedUrlsChange`). This is required so that navigating Board → Search → Board → Search preserves the last result list — `SearchPage` unmounts on route change, so any state held locally would be lost. Do not push this state back into `SearchPage`. Only `me`, `busy`, and `err` are local because they're transient and re-derivable.

**Company name and URL are required fields in the prompt.** The system prompt in `server/src/ai/search.ts` instructs the model to omit any result where `title`, `company`, or `url` cannot be determined — no `"Unknown company"`, no fabricated URLs. `parseResults()` then enforces this with a second-pass filter (`!j.title || !j.company || /^unknown|^various|^n\/a$/i`). If you tweak the prompt or the filter, preserve both layers — missing-company and missing-link results were real user-visible problems.

**Added-state for search results is index-based, not URL-based.** `searchAddedIndexes: Set<number>` in `App.tsx` tracks which cards in the current result array have been pushed to the board. Earlier versions keyed by `job.url || job.title`, which collapsed when two cards shared a title and both had blank URLs (one click marked both green). The set is reset whenever a new search runs — indexes are only meaningful within the current result array.

**Search → Board hand-off passes structured metadata, doesn't re-extract.** When `addToBoard()` calls `api.createJob()`, it sends `{ title, company, location }` as explicit fields alongside `jdText`. The `POST /jobs` route accepts these optional fields and skips the LLM extraction step entirely when they're present (see `hasClientMeta` branch in `routes/jobs.ts`). The extraction path still runs for paste-ingested JDs from BoardPage where we don't have clean metadata. This avoids a round-trip where clean data was packed into prose and then re-parsed back out — often failing and producing "Untitled role / Unknown company" cards.

### Job ingestion uses AI for metadata extraction, not scraping
When the user pastes a JD, `POST /jobs` calls OpenRouter once with a JSON-only system prompt (`server/src/ai/extract.ts`) to pull `{title, company, location}`. URL scraping was deliberately not built — paste-only ingestion was the chosen approach (LinkedIn/Indeed block bots). The `sourceUrl` field exists for record-keeping only; nothing fetches it.

### Data shapes
- `User` — one document, holds `masterResume` and `defaultModel`. The resume is the personalization fuel for every kit.
- `Job` — `userId`, status enum, fractional `order`, `jdText`, optional `sourceUrl`, free-text `notes`.
- `Kit` — append-only per `(jobId, kind)`; sorted by `createdAt desc` to render the version dropdown.

Deleting a Job cascades-deletes its Kits (`routes/jobs.ts` DELETE handler).

### Linear design system
`client/tailwind.config.js` contains the full Linear token set — do not add arbitrary colour values; use these tokens:
- **Canvas/surfaces**: `canvas` (#010102), `surface-1` through `surface-4`
- **Borders**: `hairline`, `hairline-strong`
- **Text**: `ink`, `ink-muted`, `ink-subtle`, `ink-tertiary`
- **Accent**: `primary` (#5e6ad2), `primary-hover`, `primary-focus`
- **Status/stage**: `success` (#34d399), `stage.wishlist/applied/interviewing/offer/rejected`
- **Letter-spacing**: `tracking-display-xl` through `tracking-eyebrow`, `tracking-body`, `tracking-card-title`
- **Border radius**: `rounded-xs` (4px) through `rounded-xxl` (24px)

Stage colours for column headers and card left-borders live in `client/src/components/Column.tsx` (`STAGE_COLOR` record).

### scope-feature skill
`.agents/skills/scope-feature/SKILL.md` — invoke with `/scope-feature` before building any new feature. The skill asks 7 clarifying questions (what, trigger, happy path, edge cases, out of scope, data, architecture fit), waits for answers, outputs a strict plan, waits for approval, then implements. Do not skip the approval gate.

### Auto-update CLAUDE.md hook
`.claude/settings.json` wires two hooks that together force CLAUDE.md to stay current:

- **`PostToolUse(Edit|Write)`** runs `.claude/hooks/track-edits.sh`, which logs paths under `server/src/**` and `client/src/**` to `/tmp/claude-claudemd-watch-<session_id>.log`. Editing CLAUDE.md itself clears the log.
- **`UserPromptSubmit`** runs `.claude/hooks/update-claudemd-on-confirm.sh`. When the user's prompt matches confirmation phrases (*works, it works, works now/perfectly, tested, looks good, lgtm, ship it, all good, perfect, confirmed, done and tested*) AND the edit log is non-empty, the hook outputs `hookSpecificOutput.additionalContext` instructing the assistant to update CLAUDE.md before responding to the user's actual message. The hook clears the log after firing so the same confirmation doesn't re-trigger.

Edge cases handled in the regex: "it doesn't work" / "doesn't work" don't match (whole-word boundaries + explicit phrasing). If you broaden the phrase list, keep the negation guard or you'll get false positives on bug-report messages.

Path scope is intentional — only `server/src/**` and `client/src/**` count as "feature code"; config files and root-level edits don't trigger. Widen the `case` in `track-edits.sh` if you want config changes to also nudge a doc update.

Settings.json changes need `/hooks` to reload (or a Claude Code restart) before they take effect — the file watcher only watches `.claude/` when settings.json existed at session start.









<!-- cloude-code-toolbox:mcp-skills-awareness-begin -->

### MCP & Skills awareness (Cloude Code ToolBox)

_Last synced: 2026-06-20T15:20:36.584Z._

- **Full report:** `.claude/cloude-code-toolbox-mcp-skills-awareness.md` in this workspace (auto-overwritten on each scan). Use it as ground truth for configured servers and skill folders.
- **MCP:** For **live tools** in Claude Code, enable the matching server via `/mcp`. Servers are configured in `~/.claude.json` (user) and `.mcp.json` (project).
- **When the user’s task matches a server** (e.g. Confluence work and a **Confluence** / **Atlassian** MCP is listed), **prefer that server id** and plan on tool use—not only file search.
- **Skills:** Folders below contain `SKILL.md`; attach or cite paths in chat when relevant.

#### Workspace MCP

- `/Users/mamaheshreddy/Documents/Mahesh-docs/claude code/practice/job-tracking-app/.mcp.json` _(workspace: job-tracking-app)_ — _file missing_

_No active workspace servers in mcp.json._

#### User MCP

- `/Users/mamaheshreddy/.claude.json` — _no servers defined_

_No active user-scoped servers in mcp.json._

#### Project skills

- **frontend-design** — `/Users/mamaheshreddy/Documents/Mahesh-docs/claude code/practice/job-tracking-app/.claude/skills/frontend-design` — Guidance for distinctive, intentional visual design when building new UI or reshaping an existing one. Helps with aesthetic direction, typography, and making choices that don't read as templated defaults.

- **scope-feature** — `/Users/mamaheshreddy/Documents/Mahesh-docs/claude code/practice/job-tracking-app/.claude/skills/scope-feature` — Scope a feature before building it. Use this whenever the user wants to add, implement, or build something new — even if they don't say "scope". Triggers on "I want to add X", "can we add X", "let's build X", "add a feat

#### User skills

- **frontend-design** — `/Users/mamaheshreddy/.agents/skills/frontend-design` — Guidance for distinctive, intentional visual design when building new UI or reshaping an existing one. Helps with aesthetic direction, typography, and making choices that don't read as templated defaults.

<!-- cloude-code-toolbox:mcp-skills-awareness-end -->
