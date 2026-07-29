# Covault - Product Requirements Document (PRD)

Status: draft v1 (grant cycle Q2 2026)
Owner: senga-alt
Related docs: [TRD](./TRD.md) - [UX Design Brief](./UX-DESIGN-BRIEF.md) - [App Flow](./APP-FLOW.md) - [Implementation Plan](./IMPLEMENTATION-PLAN.md)

## 1. Summary

Covault is a fully-collateralized, cash-settled European options clearinghouse on Stacks.
Anyone can write (sell) call or put options against collateral locked in sBTC or native STX,
trade those option positions on an on-chain order book, and settle them in cash at expiry.
The defining property is that every payoff is capped at the collateral locked behind it, so
the protocol is solvent by construction: no liquidation engine, no margin, no funding rate.

## 2. Problem

Bitcoin holders on Stacks can hold and lend sBTC, but have no native, defined-risk way to:

- earn premium on otherwise idle sBTC, or
- hedge downside without selling.

Existing options designs are heavy (margin engines, liquidations, always-on oracles), which
is why none exists on Stacks. Covault removes that weight by being fully collateralized and
cash-settled, so the whole system reduces to a small, auditable Clarity contract.

## 3. Goals and non-goals

Goals (v1, grant scope)
- Ship a working options clearinghouse on Stacks testnet, then mainnet.
- Support both sBTC and native STX as collateral/settlement assets.
- Provide an on-chain order book so option positions are tradable.
- Provide a dApp that runs the full lifecycle end to end.
- Keep the trusted surface to a single settlement price per series at expiry.

Non-goals (v1)
- No margin, leverage, or under-collateralized positions.
- No liquidation engine or keepers.
- No automated market maker or pooled liquidity; the order book is peer-to-peer.
- No perpetuals or funding rates.
- No formal third-party audit within the grant (post-grant step).
- No uncapped calls in v1 (calls are capped spreads; see Constraints).

## 4. Users and personas

| Persona | Wants | Covault action |
| --- | --- | --- |
| sBTC holder / small treasury | Earn premium on idle sBTC | Write cash-secured puts / capped calls |
| Hedger | Protect downside without selling | Buy puts |
| Directional trader | Defined-risk upside/downside | Buy capped calls or puts |
| DeFi protocol / builder | A composable options primitive | Integrate series as a building block |
| Protocol operator (owner) | Curate safe markets, run settlement | Create series (v1), operate the oracle |

## 5. Value proposition

- Solvent by construction: writers cannot go insolvent, so users never face counterparty
  blow-ups, liquidation cascades, or socialized losses.
- Bitcoin-native: collateralized and settled in sBTC (native STX also supported), settled on
  Bitcoin block cadence (`burn-block-height`).
- Simple and legible: a small contract anyone can read, with an exact conservation invariant
  (`payoff + leftover == collateral`).

## 6. Scope

In scope (v1)
- Option series lifecycle: create, write, trade, settle, exercise, reclaim, early close.
- On-chain order book: list, fill (partial supported), cancel.
- Collateral in sBTC or native STX, chosen per series.
- Governance/safety: pause new writes, curated series creation (toggleable), capped taker fee.
- dApp for all of the above; settlement oracle integration.

Out of scope (v1): everything in Non-goals, plus multi-leg strategies, portfolio margining,
and fiat on-ramps.

## 7. Constraints and product decisions

- Calls are capped spreads. Capping the upside is what makes a call fully collateralizable in
  cash. Puts are uncapped (cash-secured at the strike). Physically-settled covered calls are a
  documented future path.
- Series creation is curated in v1 (owner-only), so only references with a robust price feed
  get listed. It is a toggle (`set-open-creation`) to permissionless, not a permanent wall.
  Writing, buying, trading, and settling are open to everyone from day one.
- The settlement oracle is an authorized reporter in the prototype; the production path is a
  DIA oracle read via the settler contract. The contract only needs one price per series at
  expiry. See [Settlement methodology](./SETTLEMENT-METHODOLOGY.md).

## 8. User stories

- As an sBTC holder, I can write a cash-secured put and receive premium when someone buys it.
- As a buyer, I can browse listed series, see the payoff at any price, and buy an option.
- As a holder, I can exercise after settlement and receive my cash payoff automatically.
- As a writer, I can reclaim my leftover collateral after settlement.
- As either side, I can close a matched long+short pair before expiry and get my collateral back.
- As a maker, I can list options for sale, and cancel to reclaim them.
- As the operator, I can create a new series, pause new writes in an emergency, and later open
  creation to the public.

## 9. Functional requirements (traceable to the contract)

| Requirement | Contract function |
| --- | --- |
| Create an option market | `create-series` |
| Underwrite options + lock collateral | `write-options` |
| Move option positions | `transfer-long` |
| List / buy / cancel on the order book | `list-offer` / `fill-offer` / `cancel-offer` |
| Early netting + collateral refund | `close-pair` |
| Record settlement price | `settle` (oracle) |
| Claim payoff | `exercise` |
| Reclaim leftover collateral | `reclaim` |
| Read state for the UI | `get-series`, `get-long`, `get-short`, `get-offer`, `get-config`, `quote-payoff`, counts |
| Operate safely | `set-paused`, `set-open-creation`, `set-fee`, `set-oracle`, `set-owner` |

## 10. Success metrics

Milestone-aligned (see [Implementation Plan](./IMPLEMENTATION-PLAN.md)):

- M1: contract live on testnet; one full lifecycle demonstrated end to end.
- M2: a series settles from an on-chain oracle price with no manual entry; the dApp performs
  the full lifecycle on testnet; the settlement methodology and a structured security review
  are published.
- M3 (mainnet): live on mainnet with real usage - at least two series (one sBTC-collateralized),
  three completed trades, two non-team wallets participating, and one series settled at expiry.
  The agreed milestone schedule is the authoritative statement of these targets.

## 11. Risks

| Risk | Mitigation |
| --- | --- |
| Thin liquidity (cold start) | Team underwrites the first series; small sizes, short expiries; recruit early buyers directly |
| Oracle trust in prototype | Tiny surface (one price per series); curated to feed-backed references; per-series isolation; move to the DIA-backed settler |
| Demand uncertainty | Structured discovery round during M1/M2 |
| Solo builder | Small, tested, open-source, documented codebase; named maintainer |

## 12. Open questions

- Which reference has the most robust on-chain feed at launch (STX-SBTC vs sBTC-USD via a
  stablecoin)? Decided at deploy time.
- When to enable the protocol fee (default off until there is usage).
