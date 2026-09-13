# Covault dApp

The web interface for `covault-core` - browse option series, connect a wallet, and (next
iterations) write, trade, exercise, and reclaim.

Stack: Vite + React + TypeScript, Tailwind CSS 4 (tokens from `../design-system/MASTER.md`),
@stacks/connect (wallet), @stacks/transactions (reads), TanStack Query, React Router, Lucide.

## Run

```bash
npm install
npm run dev     # defaults to the live testnet deployment
```

Configuration (optional `.env`):

```bash
VITE_NETWORK=mainnet                                   # or testnet
VITE_CONTRACT_ADDRESS=SP1MY48S0Y1W4436P0VDTZCD9EW3EJPAW1WV3SA4Q
VITE_CONTRACT_NAME=covault-core
VITE_SETTLER_CONTRACT=SP1MY48S0Y1W4436P0VDTZCD9EW3EJPAW1WV3SA4Q.covault-settler
```

## Current slice

- Markets: live series table (type, collateral asset, strike, max payoff, expiry, status).
- Series detail: facts, settlement state, your position (wallet-aware).
- Portfolio: your long/short positions across series.
- Wallet connect (Leather/Xverse via @stacks/connect).

Next: write/trade/exercise/reclaim transaction flows with post-conditions, payoff chart,
owner admin panel, oracle-fed settlement view.
