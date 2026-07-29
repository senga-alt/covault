# Covault Roadmap

See the [Implementation Plan](./IMPLEMENTATION-PLAN.md) for the milestone-by-milestone build.
This is the high-level view.

## Done (contract complete, frozen ABI)

- `covault-core` clearinghouse: series creation, writing, settlement, exercise, reclaim.
- Collateral in sBTC or native STX, chosen per series.
- On-chain order book for trading long positions (list / fill / cancel, partial fills).
- Early netting (`close-pair`) to reclaim collateral before expiry.
- Governance and safety: pause new writes, curated series creation (toggleable), capped taker fee.
- Full Vitest + clarinet-sdk suite (43 tests) against real sBTC and native STX; `clarinet check` clean, 0 warnings.
- Clarity 4 correct (`current-contract`, `as-contract?` with `with-stx`, `burn-block-height`).
- Product/technical docs: PRD, TRD, UX brief, app flow, implementation plan.

## Next (grant milestones)

1. Testnet deployment + CI running `clarinet check`, the test suite and property-based
   fuzzing (M1). **Done.** Full lifecycles executed on-chain in both collateral assets,
   plus a live multi-party market with independent wallets writing, listing and trading.
   Every transaction is linked in [M1 Evidence](./M1-EVIDENCE.md).
2. Oracle integration (M2). **Deployed and in use.** `covault-settler-v2` is covault-core's
   authorized oracle: `settle-from-dia` reads DIA's STX/USD and sBTC/USD feeds, derives the
   collateral-unit cross-price on-chain (sats-per-STX for STX-SBTC series, which keeps
   settlement quanto-free), enforces a freshness window, and settles permissionlessly - no
   manual price entry, and no change to the deployed core. Four series have settled through
   it across both collateral assets, each reconciling exactly to its locked collateral.
   DIA is passed as a trait, so the same code works on testnet (ST1S5...) and mainnet
   (SP1G48...) and is unit-testable with a mock. Methodology, freshness rules and risk
   disclosures: [Settlement methodology](./SETTLEMENT-METHODOLOGY.md). A DEX TWAP can
   replace DIA later with no change to core.
3. Full dApp UI (Stacks.js): browse, write, trade, settle, exercise, reclaim, and an owner
   panel. **Live** at <https://covault-testnet.vercel.app>, used on testnet by wallets
   outside the project.
4. Mainnet launch with the first sBTC and native-STX series, and first real usage (M3).

## Later / ideas (post-grant)

- More series references and tenors (weeklies, STX-SBTC, and USD-referenced series).
- SDK so other Stacks protocols can embed Covault series (structured products, vaults).
- Auto-settlement keeper that posts the oracle price right after expiry.
- Physically-settled covered calls, alongside the cash-settled capped calls in v1.
- A formal third-party audit and a bug bounty.
- Decentralized owner (multisig) and, eventually, permissionless series creation.

## Non-goals (by design)

- Perpetuals, margin, and liquidations. Covault is solvent by construction and stays that way.
- American-style early exercise. European settlement keeps the oracle surface to one price.
