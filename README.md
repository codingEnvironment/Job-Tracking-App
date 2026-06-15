# Job Tracker

Personal job-application pipeline board with AI-generated kits (cover letter, resume bullets, interview questions, company brief).

## Stack
- React + Vite + TypeScript + Tailwind + shadcn-style components + @dnd-kit
- Express + Mongoose + TypeScript
- MongoDB Atlas
- OpenRouter for AI (default `anthropic/claude-haiku-4.5`)

## Setup

1. Copy `.env.example` to `.env` at the repo root and fill in values.
2. From the root:
   ```bash
   npm install
   npm run dev
   ```
   Client runs on http://localhost:5173, API on http://localhost:4000.

3. On first boot the server seeds your user. Log in with `APP_PASSWORD`. Open Settings → paste your master resume.

## Deploy
- Client → Vercel (point at `client/`, env: `VITE_API_BASE`).
- Server → Render (point at `server/`, env: all server vars; build `npm install && npm run build`, start `npm run start`).
- DB → MongoDB Atlas free tier.

## Scripts
- `npm run dev` — both servers concurrently
- `npm run build` — build server and client
- `npm run start` — run built server (client served by Vercel)
