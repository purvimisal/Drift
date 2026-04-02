# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: OpenAI via Replit AI Integrations (`gpt-5-mini`)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── drift/              # Drift - Adaptive Motivation Assistant (React + Vite)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   ├── db/                 # Drizzle ORM schema + DB connection
│   ├── integrations-openai-ai-server/  # OpenAI server-side integration
│   └── integrations-openai-ai-react/   # OpenAI React client integration
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Applications

### Drift (`artifacts/drift`) 
**Adaptive motivation assistant** — helps users return to goals without guilt.

- Mobile-first React + Vite app at `/` (root path)
- State machine: ON_TRACK → DRIFTING → DISENGAGING → AT_RISK → RETURNING
- AI-powered task generation using OpenAI (gpt-5-mini)
- Adaptive difficulty scaling based on user behavior
- Calm, non-judgmental tone throughout

**Key pages:**
- `/` - Landing/goal list
- `/setup` - Goal creation with AI task generation
- `/goal/:id` - Daily task screen with Done/Skip/Too Much actions

### API Server (`artifacts/api-server`)

Express 5 API with these routes:
- `GET/POST /api/goals` - Goal management
- `GET/DELETE /api/goals/:id` - Individual goal
- `GET /api/goals/:id/state` - State machine status
- `GET /api/goals/:id/tasks/today` - Today's task with adaptive message
- `POST /api/goals/:id/tasks/:taskId/action` - Record action (done/skip/too_much)
- `POST /api/goals/:id/generate-tasks` - AI task plan generation
- `GET /api/goals/:id/message` - Adaptive message

## Database Schema

### `goals` table
- `id`, `title`, `durationDays`, `state`, `missedCount`, `tooMuchFlag`
- `lastCompletedDate`, `lastOpenedAt`, `currentDifficultyMultiplier`

### `tasks` table
- `id`, `goalId`, `dayNumber`, `title`, `description`, `estimatedMinutes`
- `difficultyLevel`, `scheduledFor`, `completedAt`, `skippedAt`, `tooMuchAt`

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — only emit `.d.ts` files during typecheck
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Development

- API server: `pnpm --filter @workspace/api-server run dev`
- Drift frontend: `pnpm --filter @workspace/drift run dev`
- DB push: `pnpm --filter @workspace/db run push`
- Codegen: `pnpm --filter @workspace/api-spec run codegen`
