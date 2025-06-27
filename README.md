# RunesSwap.app

A Uniswap‑style swap interface for Bitcoin Runes, built with Next.js, TypeScript, and the SatsTerminal SDK, styled in a classic Windows 98 UI theme.

## Features
- Seamless on‑chain swapping of Bitcoin Runes via SatsTerminal SDK.
- Wallet connection and transaction signing with Laser Eyes (non‑custodial).
- UTXO and Rune balance data fetched securely via Ordiscan.
- Responsive design with dynamic imports, caching, and optimized bundle splitting.
- Windows 98–style UI using CSS Modules and global CSS variables.
- Strict TypeScript safety, ESLint/Prettier formatting, and Git hooks for code quality.

## Tech Stack
- Next.js (App Router)
- TypeScript (strict mode)
- CSS Modules & global CSS variables (Windows 98 theme)
- SatsTerminal SDK (`satsterminal-sdk`)
- Laser Eyes wallet connector (`@omnisat/lasereyes`)
- React Query (TanStack Query) & Zustand for data/state
- Supabase (public & session management)
- Ordiscan SDK for on‑chain data
- ESLint, Prettier, Husky + lint‑staged for linting & formatting

## Getting Started
### Prerequisites
- Node.js v18+ (LTS recommended)
- pnpm, npm, or yarn

### Environment Variables
Create a `.env.local` file in the project root with:
```dotenv
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
ORDISCAN_API_KEY=<your-ordiscan-api-key>
SATS_TERMINAL_API_KEY=<your-satsterminal-api-key>
TBA_API_URL=<your-satsterminal-api-url>
LIQUIDIUM_API_URL=<liquidium-server-url>
LIQUIDIUM_API_KEY=<your-liquidium-api-key>
```

`LIQUIDIUM_API_URL` and `LIQUIDIUM_API_KEY` are used on the server to
authenticate with Liquidium's API. They should never be exposed to the client.

### Installation & Development
```bash
# Clone repository
git clone https://github.com/your-username/runesswap.app.git
cd runesswap.app

# Install dependencies
pnpm install   # or npm install / yarn install

# Start development server
pnpm dev       # or npm run dev / yarn dev
```

Visit http://localhost:3000 to explore the app.

## Building & Deployment
```bash
# Build for production
pnpm build     # or npm run build / yarn build

# Start the production server
pnpm start     # or npm start / yarn start
```

Deploy on Vercel or any Node.js‑capable host and configure the same environment variables.

## How to Use
1. **Connect Your Wallet**  
   Click **Connect Wallet** and authorize via Laser Eyes. Your Bitcoin address and signature interface will be loaded.
2. **Select Runes to Swap**  
   Choose input and output Runes from the dropdowns, and enter the amount to trade.
3. **Review Swap Details**  
   Confirm rates, fees, and expected output. Adjust slippage tolerance if needed.
4. **Confirm & Approve**  
   Submit the transaction and approve it in your wallet. The swap executes on Bitcoin's blockchain using inscriptions.
5. **Track Your Transactions**  
   View your swap history under **Your TXs**, including pending and completed transactions.

## FAQ
**What are Bitcoin Runes?**  
Bitcoin Runes is a token standard on Bitcoin enabling transfer of fungible assets via inscriptions. Runes maximize efficiency while leveraging Bitcoin's security and decentralization.

**How are Runes different from Ordinals?**  
Ordinals inscribe arbitrary data onto sats, whereas Runes specifically encode fungible token transfers, reducing on‑chain data bloat.

**Are swaps instant?**  
Swaps depend on Bitcoin network confirmations (typically 10 minutes–1 hour). Your wallet will show transaction status once broadcast.

**What fees apply?**  
RunesSwap.app charges no additional fees beyond SatsTerminal network fees and standard Bitcoin miner fees. You receive near‑optimal rates directly on‑chain.

## Liquidium SDK Generation

When Liquidium publishes a new OpenAPI spec, regenerate the typed client:

```bash
pnpm gen:liquidium-sdk
```

This reads `liquidium-openapi/liquidium-instant-loan-api.yaml` and outputs the SDK to `src/sdk/liquidium`. ESLint and Jest ignore this folder, so no manual changes are required after regeneration.

## Contributing

Contributions are welcome via pull requests. The pre-commit hook automatically
runs linting, tests and a production build. Please ensure:
- Code builds successfully (`pnpm build`).
- Linting & formatting pass (`pnpm lint`).
- New features include tests and documentation updates.

## License

MIT © RunesSwap.app
