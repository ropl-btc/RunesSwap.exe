# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RunesSwap.app is a Uniswap-style swap interface for Bitcoin Runes, built with Next.js, TypeScript, and the SatsTerminal SDK, styled in a classic Windows 98 UI theme. The application allows users to:

- Swap Bitcoin and Runes through an API-integrated frontend
- Borrow against Runes via the Liquidium protocol
- View portfolio balances and transaction history 
- Get information on available Runes

## Environment Setup

The application requires these environment variables:
```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
ORDISCAN_API_KEY=<your-ordiscan-api-key>
SATS_TERMINAL_API_KEY=<your-satsterminal-api-key>
```
- use the Supabase MCP to interact with Supabase

## Commands

### Development
```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

### Testing and Linting
```bash
# Run all tests
pnpm test

# Run ESLint
pnpm lint

# Run specific test file
pnpm test -- path/to/test.test.ts

# Run tests with coverage
pnpm test -- --coverage
```

## Architecture

### Core Components

1. **API Layer**:
   - **apiClient.ts**: Central API client that handles all external requests to Ordiscan, SatsTerminal, and Liquidium
   - API routes in `/src/app/api/` for backend processing and API key protection

2. **UI Components**:
   - **AppInterface.tsx**: Root component that manages tab state and layout
   - **SwapTab.tsx**: Main swap interface for BTC ⟷ Runes exchanges
   - **BorrowTab.tsx**: Interface for Liquidium collateralized loans
   - **PortfolioTab.tsx**: Shows user's balances and holdings
   - **RunesInfoTab.tsx**: Information about available Runes
   - **YourTxsTab.tsx**: Transaction history

3. **State Management**:
   - React Query for API data fetching and caching
   - Zustand for global state
   - Context providers for wallet, background, and theme

4. **Data Flow**:
   - External requests flow through the API routes
   - API routes use `apiClient.ts` utilities
   - UI components fetch data using React Query from the API routes

### Key Types

The application uses TypeScript with strict mode. Key type definitions are organized in `/src/types/`:

- **common.ts**: Shared types like `Asset`
- **satsTerminal.ts**: Types for SatsTerminal SDK integration
- **ordiscan.ts**: Types for Ordiscan data
- **liquidium.ts**: Types for Liquidium protocol integration

### Style System

The application uses CSS Modules with a Windows 98-inspired design:
- Global styles in `src/app/globals.css`
- Component-specific styles in `.module.css` files
- Style variables for consistency

## Code Quality

The project uses several tools to maintain code quality:

1. **ESLint & Prettier**:
   - ESLint for code quality and best practices
   - Prettier for consistent formatting
   - Configuration in `eslint.config.mjs` and `.prettierrc`

2. **TypeScript**:
   - Strict mode enabled in `tsconfig.json`
   - Path aliases configured (`@/*` resolves to `./src/*`)

3. **Testing**:
   - Jest for unit tests
   - Files with `.test.ts` extension

4. **Git Hooks (Husky)**:
   - Pre-commit hook runs lint-staged and tests
   - Commit message validation with commitlint
   - Follows conventional commit format

## Data Flows

### Swap Flow
1. User selects input/output assets and amount
2. Quote is fetched from SatsTerminal API
3. User confirms swap and signs transaction with Laser Eyes wallet
4. Transaction is broadcast to the Bitcoin network

### Borrow Flow
1. User selects Rune to use as collateral
2. User enters amount and loan terms
3. Quote is fetched from Liquidium API
4. User confirms and signs transaction
5. Loan is issued on-chain

### API Integration
- **Ordiscan**: Used for UTXO and Rune balance data
- **SatsTerminal**: Used for swap quotes and trade execution
- **Liquidium**: Used for borrow/lending operations
- **CoinGecko**: Used for BTC price data

## Common Development Tasks

### Adding a New Feature
1. Create necessary API route handlers if required
2. Add API client methods in `src/lib/apiClient.ts`
3. Implement UI components
4. Add appropriate tests

### Updating Styles
1. Use CSS modules for component-specific styles
2. Update global variables in `globals.css` for theme-wide changes
3. Maintain Windows 98 aesthetic
