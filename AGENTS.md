# AGENTS

This document provides guidance for Codex agents working with the **RunesSwap.app** codebase. The goal is to explain the overall project structure, how its parts fit together, and the key commands for common tasks.

## Overview

RunesSwap.app is a swap and borrowing interface for Bitcoin Runes built with **Next.js** and **TypeScript**. It uses a Windows‑98 style theme and integrates several external services:

- **Ordiscan** – on‑chain UTXO and Rune data
- **SatsTerminal** – swap execution and PSBT handling
- **Liquidium** – borrowing and loan management
- **Supabase** – storage for rune info and market data
- **CoinGecko** – BTC price data

The frontend lives in the `src/` directory and uses Next.js App Router. API routes under `src/app/api` act as a thin backend that proxies and caches requests to the above services. Data fetching in the UI is handled with React Query. Global state is managed with Zustand. Type definitions are found under `src/types`.

## Repository Layout

```
/ (repo root)
├── src/                 # Application source code
│   ├── app/             # Next.js pages and API routes
│   │   ├── api/         # Serverless API endpoints
│   │   ├── docs/        # Renders README.md
│   │   ├── globals.css  # Global styles (Win98 theme)
│   │   └── ...
│   ├── components/      # React components (SwapTab, BorrowTab, etc.)
│   ├── context/         # React context providers
│   ├── lib/             # API client utilities, data helpers
│   │   └── api/         # Service-specific API modules
│   ├── store/           # Zustand stores
│   ├── types/           # Shared TypeScript types
│   └── utils/           # Helper functions
├── liquidium-openapi/   # OpenAPI specs for Liquidium
├── public/              # Static assets and fonts
└── ...                  # Config files and scripts
```

A sample environment file `.env.example` lists all variables needed for development (API keys for SatsTerminal, Ordiscan, Liquidium, and Supabase credentials).

## Development

Install dependencies with **pnpm** (preferred) and start the dev server:

```bash
pnpm install
pnpm dev
```

The app runs at `http://localhost:3000`.

To build and run in production mode:

```bash
pnpm build
pnpm start
```

## Testing and Linting

- **Unit tests** use **Jest** (`ts-jest` preset). Run all tests with:

  ```bash
  pnpm test
  ```

- **Linting** uses ESLint and Prettier. Run:

  ```bash
  pnpm lint
  ```

Husky hooks run linting and tests on each commit. Commit messages follow the conventional commit style (see `commitlint.config.js`).

## Architecture Notes

- **Next.js App Router** handles routing. Pages and API routes reside under `src/app`.
- **API routes** wrap external services and return standardized responses via helpers in `src/lib/apiUtils.ts`.
- **React components** under `src/components` implement the swap interface (SwapTab, BorrowTab, PortfolioTab, etc.).
- **State** is managed with React Query (server data) and Zustand (client state). Shared contexts (wallet, background) live in `src/context`.
- **Path alias** `@/*` maps to `./src/*` (see `tsconfig.json` and Jest config).
- **Styles** use CSS Modules plus global variables for the Windows 98 theme (`globals.css`).

## Typical Data Flow

1. A UI component requests data using React Query.
2. The query calls an API client function from the modules in `src/lib/api/`.
3. The client sends a request to a Next.js API route (`src/app/api/...`).
4. The API route fetches data from Ordiscan/SatsTerminal/Liquidium, optionally caching results in Supabase, and returns a standardized JSON response.
5. The UI updates based on the React Query result.

## Contributing

When adding new features:

1. Create or update API routes under `src/app/api` if backend work is required.
2. Add/extend API client methods under `src/lib/api/`.
3. Implement or update React components.
4. Write Jest tests for new utilities or routes.
5. Run `pnpm lint` and `pnpm test` before committing.
6. Run `pnpm build` to ensure the project compiles without errors.

This AGENTS.md should provide enough context to navigate the codebase and run common tasks. Refer to `README.md` and `CLAUDE.md` for more detailed documentation.


## Component Guidelines

When implementing complex features, prefer splitting large components into smaller ones. 
Stateful logic can be moved to custom hooks under `src/hooks`, while reusable UI pieces 
should live in their own components inside `src/components`. Existing examples include
`AssetSelector` and `AmountHelpers` extracted from `InputArea`, and the `usePriceHistory`
hook powering `PriceChart`.
