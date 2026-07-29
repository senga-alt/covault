# Covault - Technical Requirements Document (TRD)

Status: draft v1
Related docs: [PRD](./PRD.md) - [App Flow](./APP-FLOW.md) - [Implementation Plan](./IMPLEMENTATION-PLAN.md)

## 1. Architecture

```text
+-------------------+        read (call-read-only, events)        +---------------------+
|   Covault dApp    |  <---------------------------------------- |   Hiro Stacks API   |
| Vite + React + TS |                                             |  (testnet/mainnet)  |
| @stacks/connect   |  ---- signed contract-calls (wallet) ---->  +----------+----------+
+---------+---------+                                                        |
          |                                                                  v
          |                                                        +---------------------+
          |                                                        |  Stacks blockchain  |
          +------------ wallet (Leather / Xverse) --------------> |  covault-core.clar  |
                                                                   |  sbtc-token (dep)   |
   settlement price (M2: DIA oracle; prototype: reporter)        --> |  oracle reporter    |
                                                                   +---------------------+
```

Components
- `covault-core.clar`: the clearinghouse. Holds all state and custody.
- sBTC (`SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token`): real SIP-010 dependency,
  added via `clarinet requirements`, remapped per network by Clarinet.
- Settlement oracle: an authorized principal in the prototype; the DIA-backed settler in M2.
- dApp: read-only reads via the Hiro API; state changes via wallet-signed contract calls.

## 2. Smart contract specification

Language: Clarity 4, `epoch = "latest"`. Expiry measured in `burn-block-height` (Bitcoin blocks).

### 2.1 Data model

Series (`map series: uint -> tuple`)
- `creator: principal`
- `quote-token: (optional principal)` - `none` = native STX, `(some P)` = SIP-010 token at P
- `underlying: (string-ascii 16)` - price reference label (informational)
- `is-call: bool`
- `strike: uint` - collateral-asset smallest units, per contract
- `max-payoff: uint` - collateral locked per contract; caps the payoff
- `expiry: uint` - burn-block-height at/after which settlement is allowed
- `settled: bool`
- `settlement-price: uint`

Positions
- `longs: {series-id, owner} -> uint` (option holders)
- `shorts: {series-id, owner} -> uint` (collateral providers / writers)

Order book
- `offers: uint -> {series-id, maker, qty, price, quote-token}`

Governance / counters
- vars: `contract-owner`, `oracle`, `paused`, `open-creation`, `fee-bps`, `fee-recipient`,
  `next-series-id`, `next-offer-id`
- const: `MAX-FEE-BPS = u500` (5% cap)

### 2.2 Core invariant

For each contract in a series with collateral `C = max-payoff` and settlement price `S`:

```text
payoff  = min(intrinsic(S), C)        (paid to the long on exercise)
leftover = C - payoff                 (paid to the short on reclaim)
payoff + leftover == C                (escrow conserved exactly, integer, no rounding)
```

- Put: `intrinsic = max(strike - S, 0)`, and `C = strike` (enforced), so payoff <= C always.
- Capped call: `intrinsic = max(S - strike, 0)`, capped at `C = cap - strike`.

Solvency: the contract can never owe more than it holds, because every write locks exactly
`qty * max-payoff` and every payout is bounded by it.

### 2.3 Public functions

| Function | Args | Returns | Notes / guards |
| --- | --- | --- | --- |
| `create-series` | quote-token `(optional <sip010>)`, underlying, is-call, strike, max-payoff, expiry | `(ok id)` | owner-only unless `open-creation`; blocked when paused; put requires `max-payoff == strike`; expiry in future |
| `write-options` | id, qty, token `(optional <sip010>)` | `(ok collateral)` | not settled, not expired, not paused; locks `qty*max-payoff` |
| `transfer-long` | id, qty, recipient | `(ok true)` | moves long positions |
| `close-pair` | id, qty, token | `(ok refund)` | needs matching long+short; refunds `qty*max-payoff` |
| `settle` | id, price | `(ok true)` | oracle-only; at/after expiry; once |
| `exercise` | id, qty, token | `(ok payoff)` | after settle; pays capped intrinsic |
| `reclaim` | id, qty, token | `(ok leftover)` | after settle; pays `C - payoff` |
| `list-offer` | id, qty, price | `(ok offer-id)` | escrows longs in the contract |
| `fill-offer` | offer-id, qty, token | `(ok cost)` | buyer pays maker `cost` + taker `fee` |
| `cancel-offer` | offer-id | `(ok true)` | maker-only; returns escrowed longs |
| `set-oracle` / `set-owner` | principal | `(ok true)` | owner-only |
| `set-paused` | bool | `(ok true)` | owner-only |
| `set-open-creation` | bool | `(ok true)` | owner-only |
| `set-fee` | bps, recipient | `(ok true)` | owner-only; `bps <= MAX-FEE-BPS` |

Read-only: `get-series`, `get-long`, `get-short`, `get-offer`, `get-oracle`, `get-owner`,
`get-series-count`, `get-offer-count`, `get-config`, `quote-payoff`.

### 2.4 Errors

`u100` not-owner, `u101` not-oracle, `u102` series-not-found, `u103` invalid-params,
`u104` expired, `u105` not-expired, `u106` already-settled, `u107` not-settled,
`u108` insufficient-long, `u109` insufficient-short, `u110` wrong-token, `u111` zero,
`u112` offer-not-found, `u113` insufficient-offer, `u114` not-offer-maker, `u115` paused,
`u116` creation-restricted, `u117` fee-too-high.

### 2.5 Asset handling (Clarity 4)

- Collateral in: `pull-to` moves the series asset from `tx-sender` to a recipient.
  - SIP-010: `contract-call? token transfer amount tx-sender recipient none` (authorized by
    `tx-sender == sender`), with `token` validated against the series' stored principal.
  - Native STX: `stx-transfer? amount tx-sender recipient`.
- Payout: `push-from-contract` moves the asset from the contract's escrow to a recipient.
  - SIP-010: `contract-call? token transfer amount current-contract recipient none`; sBTC's
    `(is-eq contract-caller sender)` check authorizes the contract sending its own tokens.
  - Native STX: `as-contract? ((with-stx amount)) (try! (stx-transfer? amount tx-sender recipient))`.
- Units: all amounts are in the collateral asset's smallest units (sBTC = 8 decimals / sats,
  STX = 6 decimals / microSTX). `1 contract = 1 unit` of the underlying reference exposure.

### 2.6 Fee model

Taker fee on order-book fills only: `fee = qty * price * fee-bps / 10000`, charged to the
buyer on top of the premium and sent to `fee-recipient`. Default `fee-bps = 0`. Cap 5%.

### 2.7 Governance and safety

- Pause blocks `create-series` and `write-options`. All exits stay open (settle, exercise,
  reclaim, close-pair, order-book, cancel), so a pause cannot trap funds.
- Curated creation (`open-creation = false` by default): only the owner can create series, so
  only vetted-feed references are listed. Toggle to permissionless anytime.

## 3. Networks and addresses

| Asset / contract | simnet + mainnet | testnet |
| --- | --- | --- |
| sBTC | `SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token` | `ST1F7...sbtc-token` (Clarinet remaps) |
| SIP-010 trait | `SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard` | remapped |
| covault-core | `<deployer>.covault-core` | `<deployer>.covault-core` |

Clarinet handles requirement download and per-network principal remapping during deployment.

## 4. Frontend stack

- Build: Vite + React 18 + TypeScript.
- Styling: Tailwind CSS (see [UX Design Brief](./UX-DESIGN-BRIEF.md)).
- Wallet + signing: `@stacks/connect` (Leather, Xverse).
- Clarity values + contract calls: `@stacks/transactions` (`Cl`, `fetchCallReadOnlyFunction`).
- Reads: Hiro Stacks API (read-only function calls, account balances, contract events).
- State: lightweight (React Query or SWR for reads; local state for the wallet session).
- Network config: env-driven (`testnet` first, `mainnet` for M3).

### 4.1 Integration notes

- Contract calls use post-conditions to protect the user (exact sBTC/STX amounts).
- Trait argument: value-moving calls take `(token (optional <sip010>))` - pass
  `Cl.some(Cl.principal(SBTC))` for sBTC series, `Cl.none()` for native-STX series.
- The UI reads `get-config`, `get-series`, `get-offer`, `get-long/short`, and `quote-payoff`
  to render markets, positions, and live payoff curves.
- Events (`print`) are indexed for an activity feed and to confirm actions.

## 5. Testing strategy

- Unit/integration: Clarinet SDK + Vitest. Current suite: 43 tests, 0 warnings, run against
  real sBTC and native STX in simnet (no mocks).
- Coverage includes: series creation + validation, writing/collateral, order book (list/fill/
  cancel, partial fills), close-pair, settlement auth/timing, exercise/reclaim payoffs, the
  conservation invariant, native-STX end-to-end, wrong-token guard, fee, pause, curated
  creation, and config snapshot.
- Frontend: component tests for critical flows; manual end-to-end on testnet for M2.

## 6. Deployment

- `clarinet deployments generate --testnet` then `--mainnet`; apply via `clarinet deployments
  apply`.
- Requirements (sBTC, SIP-010 trait) are resolved and remapped automatically.
- Post-deploy: set the oracle principal; keep `open-creation = false` for v1; fee `= 0`.
- See the [Implementation Plan](./IMPLEMENTATION-PLAN.md) for the runbook.

## 7. Security considerations and threat model

| Threat | Exposure | Mitigation |
| --- | --- | --- |
| Malicious settlement price | Oracle can mis-settle a series | Curated to feed-backed references; per-series isolation; move to the DIA-backed settler; single price surface |
| Owner key compromise | Can create series, pause, set fee/oracle | Owner cannot touch user collateral or settlement math; fee capped; pause cannot trap funds; transfer/rotate owner key; future multisig |
| Reentrancy via token contract | Untrusted SIP-010 could re-enter | Series asset is curated (sBTC / vetted tokens); state effects precede or bound external calls; capped payouts |
| Insolvency | Contract owes more than it holds | Impossible by construction: payout bounded by locked collateral |
| Wrong-token spoofing | Caller passes a different token | `token` validated against the series' stored principal (`ERR-WRONG-TOKEN`) |

Note: no formal third-party audit within the grant. In-grant security is a small surface, the
full test suite, the conservation invariant, an open-source codebase, and a testnet-first
rollout. A formal audit is a post-grant step.

## 8. Observability

All state changes emit `print` events (`create-series`, `write`, `transfer-long`,
`close-pair`, `settle`, `exercise`, `reclaim`, `list-offer`, `fill-offer`, `cancel-offer`),
consumed by the dApp for confirmations and an activity feed.

## 9. Dependencies

- Clarinet >= 3, Node >= 20.
- `@stacks/clarinet-sdk`, `vitest` (tests).
- `@stacks/connect`, `@stacks/transactions` (dApp).
- Hiro Stacks API (reads).
- sBTC + SIP-010 trait (on-chain requirements).
