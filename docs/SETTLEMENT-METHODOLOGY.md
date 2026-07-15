# Settlement Methodology

How Covault turns an oracle quote into a settlement price, what can go wrong,
and what is bounded by construction. This is the M2 settlement documentation:
price source, derivation, freshness checks, and fallback assumptions.

Contracts involved:

- `covault-core` - the clearinghouse. Frozen ABI, deployed on testnet. It
  accepts exactly one settlement price per series, only from its authorized
  `oracle` principal, only after expiry (`burn-block-height >= expiry`).
- `covault-settler` - a small contract that becomes core's authorized oracle.
  It derives the price from DIA feeds and calls `core.settle`. Anyone can
  trigger it; nobody can choose the price.
- DIA oracle - the on-chain price source, canonical deployments:
  - testnet: `ST1S5ZGRZV5K4S9205RWPRTX9RGS9JV40KQMR4G1J.dia-oracle`
  - mainnet: `SP1G48FZ4Y7JY8G2Z0N51QTCYGBQ6F4J43J77BQC0.dia-oracle`

Wiring is one governance transaction: `core.set-oracle(covault-settler)`.
Core is not modified or redeployed.

## 1. Denomination: prices in collateral units

Every Covault series is denominated in its collateral asset. A series
collateralized in sBTC quotes its strike, settlement price, and payoff in
sats; an STX-collateralized series quotes them in microSTX. The payoff
math (`min(intrinsic, max-payoff)`) never touches USD.

Settlement therefore needs the price of the underlying expressed in
collateral units:

- `STX-SBTC` series (sBTC collateral, STX underlying): sats per STX
- `SBTC-STX` series (STX collateral, sBTC underlying): microSTX per sBTC

DIA publishes USD quotes (`STX/USD`, `sBTC/USD`) as 8-decimal fixed point.
The settler derives the cross-rate on-chain:

```
STX-SBTC:  price = stx_usd * 100,000,000 / sbtc_usd   (sats per STX)
SBTC-STX:  price = sbtc_usd * 1,000,000  / stx_usd    (microSTX per sBTC)
```

Integer division (floor). Both inputs must be positive or the settler
returns `ERR-BAD-PRICE (u205)`; an unknown pair label returns
`ERR-UNSUPPORTED-PAIR (u204)`.

Worked example (the unit test case): STX/USD = 20,000,000 (0.20 USD) and
sBTC/USD = 5,000,000,000,000 (50,000 USD) derive
`20,000,000 * 100,000,000 / 5,000,000,000,000 = 400` sats per STX. A put
with strike 1,000 sats settled at 400 pays 600 sats per contract; the
writer reclaims the remaining 400. Payoff plus leftover equals locked
collateral, exactly.

Precision: the floor division truncates at most 1 unit of the quote
(1 sat, or 1 microSTX). At settlement scale this is at least three orders
of magnitude below DIA's own deviation threshold, and the truncation
direction is applied identically to every series.

## 2. Freshness checks

DIA returns `{ timestamp, value }` per feed (Unix seconds). The settler
rejects quotes older than `max-price-age` seconds, measured against
`stacks-block-time` (the Clarity 4 keyword for the current Stacks block's
Unix time):

- Both feeds are checked independently; if either is stale, settlement
  fails with `ERR-STALE-PRICE (u206)` and the series stays unsettled.
- Future-dated timestamps count as fresh: a just-pushed DIA update can be
  seconds ahead of the current block's header time.
- Default window: 21,600 seconds (6 hours). DIA pushes on price deviation
  with a periodic heartbeat, so the default is deliberately wider than the
  expected cadence. The settler owner can tighten it
  (`set-max-price-age`, zero rejected) once observed update frequency on
  the target network justifies it. The current value is public
  (`get-max-price-age`).

Fail-closed is the design: no payout ever happens on a stale price. There
is no deadline race on the other side, because exercising and reclaiming
have no expiry in covault-core - a delayed settlement delays claims, it
never forfeits them.

## 3. Risk disclosures: failure modes and fallbacks

| Failure | Effect | Recovery |
| --- | --- | --- |
| DIA feed quiet past the window | `settle-from-dia` returns u206; series stays unsettled | Retry after the next DIA push. Settlement is permissionless, so any party can retry. |
| DIA feed halted indefinitely | Series cannot settle via the settler | Governance re-points `core.set-oracle` (a public, on-chain transaction) to a replacement oracle contract. Escrow is untouched throughout. |
| Wrong price pushed by DIA | Mispriced settlement of series expiring inside that window | Bounded by construction: one price affects only the series it settles, and no payoff can exceed that series' locked collateral. Other series, other expiries, and the escrow invariant are unaffected. |
| Settler bug | Settlement blocked or wrong price submitted | Same two bounds as above (per-series blast radius, capped payoff), plus the same governance path: re-point `core.set-oracle`. |

What no oracle failure can cause, in any combination: collateral leaving
escrow beyond `max-payoff` per contract, a payout before expiry, a second
settlement of an already-settled series, or loss of the conservation
invariant (payoff + leftover = locked collateral, enforced in integer
arithmetic by covault-core).

## 4. Risk disclosures: trust surface

The complete list of trusted parties at settlement time:

1. DIA's feed operators, for price correctness inside the freshness
   window, bounded per-series as above.
2. The covault-core owner, who can re-point the oracle. Every such change
   is a public on-chain transaction.

The settler adds no discretion: `settle-from-dia` takes a series id and
the DIA principal, which must equal the owner-pinned canonical deployment
(`set-dia-oracle`, readable via `get-dia-oracle`) or the call fails with
`ERR-WRONG-ORACLE` before any external call is made. It then reads the two
feeds, derives the price by the fixed formula, and submits it. There is no
code path in which a caller supplies a price or a price source.

## 5. Future price sources

Per the approved M2 scope, any material change to this settlement
methodology is disclosed to and approved by the Stacks Endowment before it
ships. Operational tuning inside the documented design (for example
tightening `max-price-age`) is not a material change; replacing the price
source is.

The settler's price source is swappable behind `oracle-trait` without
touching covault-core. A DEX TWAP (sats per STX read directly from an
STX/sBTC pool) is the documented next candidate once pool liquidity is
deep enough to make time-weighted manipulation uneconomical; it would
remove the USD legs entirely. Adopting it is one `set-price-oracle`
transaction on the settler, or a new settler plus one `set-oracle` on
core; either path leaves settled history and escrow untouched.

## 6. Error codes (settler)

| Code | Name | Meaning |
| --- | --- | --- |
| u200 | ERR-NOT-OWNER | Caller is not the settler owner (admin functions only) |
| u201 | ERR-NO-ORACLE | No price source configured (oracle-trait path, or DIA principal not yet pinned) |
| u202 | ERR-WRONG-ORACLE | Passed principal does not match the configured/pinned one |
| u203 | ERR-SERIES-NOT-FOUND | Unknown series id |
| u204 | ERR-UNSUPPORTED-PAIR | Series underlying label is not STX-SBTC or SBTC-STX |
| u205 | ERR-BAD-PRICE | Zero feed value, or zero freshness window |
| u206 | ERR-STALE-PRICE | A DIA quote is older than max-price-age |

Core's own settlement guards (not-expired u105, already-settled u106,
not-oracle u101) apply unchanged underneath.

## 7. Verification

- `npm test` - 41 passing tests, including: cross-rate derivation for both
  pair orientations, end-to-end DIA settlement driving exercise/reclaim
  payoffs, pre-expiry rejection, stale-feed rejection with fail-closed
  state, recovery after a feed resumes, future-dated timestamp tolerance,
  owner gating of the freshness window, and DIA principal pinning (unpinned
  and lookalike-source calls both rejected, fail closed).
- `clarinet check` - 8 contracts, no errors.
- The derivation was verified against the live testnet DIA feeds before
  deployment planning (observed cross-rate at the time: 259 sats per STX).
