# RunesSwap.app

A Bitcoin Runes swap platform built with Next.js, TypeScript, and SatsTerminal SDK. RunesSwap.app provides a Uniswap-like experience for the Bitcoin ecosystem, featuring a strict minimal Windows 98 UI theme.

## Features

- Swap Bitcoin Runes seamlessly.
- Connect your wallet using Laser Eyes.
- View balances and UTXOs via Ordiscan integration.
- Responsive design for mobile devices.
- Lightweight and performant.
- Minimalist Windows 98 UI theme.

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** Regular CSS
- **Swap Logic:** [SatsTerminal SDK](https://www.npmjs.com/package/satsterminal-sdk?activeTab=readme)
- **Wallet Connection:** [Laser Eyes](https://lasereyes.build/)
- **Data Fetching & State:** [React Query (TanStack Query)](https://tanstack.com/query/latest) & [Zustand](https://github.com/pmndrs/zustand)
- **Balance/UTXO Info:** [Ordiscan](https://ordiscan.com/docs)

## Getting Started

### Prerequisites

- Node.js (v18 or later recommended)
- npm, yarn, pnpm, or bun

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/runesswap.app.git
    cd runesswap.app
    ```
2.  Install dependencies:
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    # or
    bun install
    ```

### Running the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Building for Production

```bash
npm run build
```

This command builds the application for production usage.

## Deployment

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details on other deployment options.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details (if one exists) or visit [https://opensource.org/licenses/MIT](https://opensource.org/licenses/MIT).
