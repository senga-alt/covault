# Settlement Methodology

How Covault turns an oracle quote into a settlement price, what can go wrong,
and what is bounded by construction. This is the M2 settlement documentation:
price source, derivation, freshness checks, and fallback assumptions.

Contracts involved:

- `covault-core` - the clearinghouse. Frozen ABI. It accepts exactly one
  settlement price per series, only from its authorized `oracle` principal,
  only after expiry (`burn-block-height >= expiry`).
- `covault-settler` - a small contract that becomes core's authorized oracle.
  It derives the price from DIA feeds and calls `core.settle`. Anyone can
  trigger it; nobody can choose the price.
- DIA oracle - the on-chain price source, pinned per network:
  - mainnet: `SP1G48FZ4Y7JY8G2Z0N51QTCYGBQ6F4J43J77BQC0.dia-oracle` - live,
    maintaining `STX/USD` and `BTC/USD`
  - testnet: previously `ST1S5ZGRZV5K4S9205RWPRTX9RGS9JV40KQMR4G1J.dia-oracle`,
    removed by the 7 August 2026 testnet reset and not redeployed at the time of
    writing. Oracle-backed settlement is therefore demonstrated on mainnet.

  The principal is pinned on the settler (`set-dia-oracle`) and checked before
  any external call, so the settler can never be induced to read a lookalike
  contract.

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

DIA publishes USD quotes (`STX/USD`, `BTC/USD`) as 8-decimal fixed point.
The settler derives the cross-rate on-chain:

```
STX-SBTC:  price = stx_usd * 100,000,000 / btc_usd   (sats per STX)
SBTC-STX:  price = btc_usd * 1,000,000  / stx_usd    (microSTX per sBTC)
```

**Which Bitcoin feed, and why.** Covault reads **`BTC/USD`**, the pair the
Milestone 2 deliverable specifies: "using BTC/USD and STX/USD feeds to derive
the STX/sBTC cross-rate on chain".

This reverses an earlier choice, and the reasoning is worth recording rather
than quietly overwriting. Covault originally read `sBTC/USD`. The collateral
locked in an sBTC series *is* sBTC, so pricing it with the sBTC feed kept the
settlement price denominated in exactly the asset the payoff is paid in, and
avoided the peg basis entirely. That was the better choice while both feeds were
maintained, and it was documented as a deliberate deviation from the milestone
wording.

DIA stopped maintaining `sBTC/USD`. On Stacks mainnet the feed has not moved a
single unit since **5 August 2026**: it still reports $63,077 while `BTC/USD`
reports live prices tens of percent higher. `STX/USD` and `BTC/USD` are the only
two feeds DIA currently maintains on Stacks. A feed frozen for over a month
cannot settle anything, and should not.

The change was disclosed to and approved by the Stacks Endowment before it
shipped, per section 5.

**The cost of the change, stated plainly.** Reading `BTC/USD` reintroduces the
sBTC peg basis. The recorded settlement price is the price of Bitcoin, while the
collateral actually held is sBTC. sBTC is 1:1 Bitcoin-backed and the two track
closely - the last measurement taken while both feeds were live put the gap at
roughly 1.2% - but they are not the same instrument, the contract cannot observe
the difference, and that figure cannot be re-measured while the sBTC feed is
dead. If the peg deviates materially, a series settles against Bitcoin rather
than against the asset in escrow.

What this does **not** affect: the conservation invariant. `payoff + leftover =
collateral` holds exactly at any settlement price, because the payoff is capped
at the collateral locked. The basis is a question of whether the recorded price
is economically right, never of whether the escrow is sound. No peg deviation,
however large, can take more out of a series than was put into it.

Integer division (floor). Both inputs must be positive or the settler
returns `ERR-BAD-PRICE (u205)`; an unknown pair label returns
`ERR-UNSUPPORTED-PAIR (u204)`.

Worked example (the unit test case): STX/USD = 20,000,000 (0.20 USD) and
BTC/USD = 5,000,000,000,000 (50,000 USD) derive
`20,000,000 * 100,000,000 / 5,000,000,000,000 = 400` sats per STX. A put
with strike 1,000 sats settled at 400 pays 600 sats per contract; the
writer reclaims the remaining 400. Payoff plus leftover equals locked
collateral, exactly.

Precision: the floor division truncates at most 1 unit of the quote
(1 sat, or 1 microSTX). At settlement scale this is at least three orders
of magnitude below DIA's own deviation threshold, and the truncation
direction is applied identically to every series.

## 2. Freshness checks

DIA returns `{ timestamp, value }` per feed. Deployments differ in
timestamp precision - the live testnet feed emits milliseconds - so the
settler first normalizes: any timestamp at or above 10^11 (a date beyond
the year 5000 if read as seconds) is treated as milliseconds and divided
by 1000. The normalized timestamp is compared against `stacks-block-time`
(the Clarity 4 keyword for the current Stacks block's Unix time), and
quotes older than `max-price-age` seconds are rejected:

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

**Freshness is checked before the price is derived.** A feed that has been
abandoned can report both a stale timestamp and a zeroed value. Deriving first
would surface `ERR-BAD-PRICE (u205)` and hide the real cause, so the settler
asserts freshness on both quotes before calling `derive-price`. The error a
caller sees names the guard that actually stopped the settlement. This ordering
is covered by a regression test that fails against the previous arrangement.

**This is not hypothetical.** DIA's `sBTC/USD` feed on Stacks mainnet has been
frozen since 5 August 2026. A settler still pointed at it would refuse every
settlement with `ERR-STALE-PRICE`, indefinitely, rather than settle a month-old
price roughly twenty percent away from the market. That is the intended
behaviour, observable on-chain by anyone, and it is the reason the freshness
window exists at all.

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
| Feed abandoned without notice | Every settlement refuses with u206 until a replacement source is wired | Observed: DIA's `sBTC/USD` froze on 5 Aug 2026 with no announcement. Escrow is untouched and claims never expire, so the cost is delay, not loss. Recovery is the governance path above, or the TWAP path in section 5. |
| sBTC depegs from BTC | Settlement prices the series off Bitcoin, not off the collateral held | Not recoverable in-contract and disclosed rather than mitigated: the contract cannot observe the peg. Bounded by the conservation invariant - a deviation changes who receives the collateral, never how much leaves escrow. |

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

Because freshness is asserted before derivation, a feed that is simultaneously
stale and zeroed reports `u206`, not `u205`. `u205` therefore means a live feed
returned a zero value, which is a different and rarer fault.

Core's own settlement guards (not-expired u105, already-settled u106,
not-oracle u101) apply unchanged underneath.

## 7. Verification

- `npm test` - 44 passing tests, including: cross-rate derivation for both
  pair orientations, end-to-end DIA settlement driving exercise/reclaim
  payoffs, pre-expiry rejection, stale-feed rejection with fail-closed
  state, recovery after a feed resumes, future-dated timestamp tolerance,
  owner gating of the freshness window, dead-feed errors reported as stale
  rather than bad-price, and DIA principal pinning (unpinned and
  lookalike-source calls both rejected, fail closed).
- `clarinet check` - 6 contracts, no errors.
- `npm run fuzz` - 1,000 randomized runs against the solvency invariant.
- **Settled on testnet against the live feeds.** Four series settled through
  `settle-from-dia`, at four different prices, each reconciling exactly to its
  locked collateral:

| Series | Settled at | Payoff | Leftover | Collateral |
| --- | --- | --- | --- | --- |
| #3 | 213 sats | 0 | 190 | 190 sats |
| #4 | 216 sats | 24 | 216 | 240 sats |
| #5 | 213 sats | 13 | 47 | 60 sats |
| #6 | 468,526.442 STX | 0 | 50 STX | 50 STX |

  Both collateral assets are represented, and after all claims the settled
  series returned every unit they held. Transaction links:
  [M1 Evidence](./M1-EVIDENCE.md).

  **These settlements predate the 7 August 2026 testnet reset**, which cleared
  all Stacks testnet history. The transactions were recorded and reviewed before
  the reset, and the explorer links no longer resolve because the chain they
  were written to no longer exists. They are retained here as the record of what
  was verified at the time. Settlement evidence on a chain that can still be
  queried is recorded with the mainnet deployment.
