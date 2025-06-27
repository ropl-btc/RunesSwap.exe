# RunesSwap Coding Guide

This file provides instructions for automated coding agents (Codex or Claude) working with the **RunesSwap.app** repository.

## Overview

RunesSwap.app is a Next.js application written in **TypeScript**. It offers a swap and borrowing interface for Bitcoin Runes with a Windows‑98 style theme. The app integrates several external services:

* **Ordiscan** for on‑chain UTXO and Rune data
* **SatsTerminal** for swap execution and PSBT handling
* **Liquidium** for borrowing and loan management
* **Supabase** for storage of rune information and market data
* **CoinGecko** for BTC price data

The main source code lives in `src/` and uses the Next.js App Router.
API routes under `src/app/api` act as a thin backend to proxy and cache requests to the above services. Server data is fetched with React Query, and client state is handled by Zustand. Type definitions are organised under `src/types`.

## Repository Layout

```text
/ (repo root)
├── src/                 # Application source code
│   ├── app/             # Next.js pages and API routes
│   │   ├── api/         # Serverless API endpoints
│   │   ├── docs/        # Renders README.md
│   │   ├── globals.css  # Global styles (Win98 theme)
│   │   └── ...
│   ├── components/      # React components (SwapTab, BorrowTab, etc.)
│   ├── context/         # React context providers
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # API client utilities, data helpers
│   │   └── api/         # Service-specific API modules
│   ├── store/           # Zustand stores
│   ├── types/           # Shared TypeScript types
│   └── utils/           # Helper functions
├── liquidium-openapi/   # OpenAPI specs for Liquidium
├── public/              # Static assets and fonts
└── ...                  # Config files and scripts
```

A `.env.example` file shows all environment variables needed for development. Important variables include:

* `SATS_TERMINAL_API_KEY`
* `ORDISCAN_API_KEY`
* `RUNES_FLOOR_API_KEY`
* `LIQUIDIUM_API_KEY` (server-side only)
* `NEXT_PUBLIC_SUPABASE_URL`
* `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Security Note:** Never use `NEXT_PUBLIC_` prefix for sensitive API keys as it exposes them to the client-side. Use server-side environment variables for authentication tokens.

## Development

Install dependencies and start the development server with **pnpm**:

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

* Unit tests use **Jest** with the `ts-jest` preset:

  ```bash
  pnpm test
  ```
* Linting uses **ESLint** and Prettier:

  ```bash
  pnpm lint
  ```

The pre‑commit hook runs `lint-staged`, the test suite, and a production build. Commit messages are checked by **commitlint** and must follow the Conventional Commits format.

## Architecture Notes

* Uses **Next.js App Router** for routing.
* API routes wrap external services and return standardized responses via helpers in `src/lib/apiUtils.ts`.
* API client methods are organized into modules under `src/lib/api/`.
* React components under `src/components` implement the swap, borrow, portfolio and info tabs.
* State is managed with React Query (server data) and Zustand (client state); shared contexts live in `src/context`.
* Path alias `@/*` resolves to `./src/*` (configured in `tsconfig.json` and Jest).
* Styles use CSS Modules plus global variables for the Windows 98 theme.
* The README is rendered through `src/app/docs` for in‑app documentation.

## Data Flows

### Typical Data Flow

1. A UI component fetches data using React Query.
2. The query calls a helper method exported from `src/lib/apiClient.ts` (which
   re-exports functions from modules under `src/lib/api/`).
3. The client sends a request to a Next.js API route under `src/app/api`.
4. The API route fetches data from Ordiscan, SatsTerminal, or Liquidium, optionally caching results in Supabase, and returns a standardized JSON response.
5. The UI updates based on the React Query result.

### Swap Flow

1. User selects input/output assets and amount.
2. A quote is fetched from SatsTerminal.
3. The user confirms and signs the PSBT with the Laser Eyes wallet.
4. The transaction is broadcast to the Bitcoin network.

### Borrow Flow

1. User chooses a Rune for collateral.
2. User enters amount and loan terms.
3. A quote is fetched from Liquidium.
4. After confirmation and signing, the loan is issued on‑chain.

## Component Guidelines

Break larger components into smaller ones where possible. Stateful logic should live in custom hooks under `src/hooks`, while reusable UI pieces should belong in `src/components`.

When implementing complex features, prefer extracting related hooks and components. For example:

* `AssetSelector` and `AmountHelpers` were extracted from `InputArea`.
* The price chart feature uses a dedicated `usePriceChart` hook, along with `TimeframeSelector` and `PriceTooltip` components.
* The runes info view leverages a `useRunesSearch` hook, with `RuneSearchBar` and `RuneDetails` components to keep `RunesInfoTab` lean.
* The `useWalletConnection` hook manages wallet connection state and provider detection, powering the `ConnectWalletButton` component.
* `usePortfolioData`, `useLiquidiumAuth` and `useRepayModal` keep `PortfolioTab` lightweight by handling portfolio queries, Liquidium authentication and repayment flows.
* `useAssetSearch` powers `AssetSelectorDropdown` for debounced search and popular-rune loading, keeping `AssetSelector` minimal.
