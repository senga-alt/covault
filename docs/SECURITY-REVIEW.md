# Security Review

Structured security and code review of the Covault contracts. This is the M2
review deliverable, not an external audit. It covers the five items the grant
milestone asks for, each with a heading below: threat model, invariant test
suite, adversarial tests, static checks, and a findings log with severity and
resolution status.

Scope: `covault-core` (the clearinghouse, deployed and frozen on testnet),
`covault-settler` (DIA settlement), and the `oracle-trait` / `dia-trait`
interfaces. Mocks are test-only and out of scope for deployment.

Reproduce everything here from a clean checkout:

```bash
npm install
npm test         # 41 example-based unit tests (Clarinet JS SDK)
npm run fuzz     # Rendezvous property-based fuzzing of covault-core
clarinet check   # static analysis (check-checker pass)
```

## 1. Threat model

**Assets at risk.** Collateral locked in escrow: native STX and sBTC (any
SIP-010). At settlement this collateral is split between option holders
(payoff) and writers (leftover).

**The one guarantee everything rests on.** *Solvent by construction:* a
writer locks the maximum possible payoff up front, so the contract can never
owe more than it holds. There is no margin, no liquidation engine, no funding
rate - the machinery that makes derivatives dangerous is absent by design.
The review's central question is therefore: **can any sequence of actions make
a payoff exceed its locked collateral, or let value be claimed twice?**

**Actors and trust boundaries.**

| Actor | Can do | Trusted for |
| --- | --- | --- |
| Writer / holder / trader | write, trade, exercise, reclaim, close, cancel - all permissionless | nothing (adversarial by assumption) |
| Oracle (the settler contract) | record one settlement price per series, after expiry | price correctness; bounded to one price per series |
| DIA feed | supply BTC/USD and STX/USD | price correctness within the freshness window; see [SETTLEMENT-METHODOLOGY.md](SETTLEMENT-METHODOLOGY.md) |
| Owner | pause new writes, curate series, set a capped fee, re-point the oracle | governance only; **pause and fees never block exits**, fee hard-capped at 5% |

**Invariants that must hold (and where each is verified).**

1. **Solvency:** `calc-payoff(...) <= max-payoff` for every input. → fuzzed, section 2.
2. **Conservation:** `payoff + leftover == collateral`, exactly, no rounding. → fuzzed, section 2.
3. **One price, once:** a series settles exactly once, only after expiry, only from the authorized oracle. → unit tests, section 3.
4. **Exits always open:** pause and fee changes never block settle / exercise / reclaim / close / cancel. → unit tests, section 3.
5. **No double-claim:** no principal can exercise or reclaim more than it holds. → unit tests, section 3.
6. **Settlement integrity:** the settler only ever accepts the pinned canonical DIA principal, and rejects stale prices. → unit tests, section 3; finding F-1.

**Out of scope (documented, not eliminated):** oracle price *correctness* is a
trust assumption bounded per series (a wrong price affects only its own series
and never exceeds that series' collateral); owner-key custody is a single-key
governance assumption accepted for the grant prototype.

## 2. Invariant test suite (property-based fuzzing)

The solvency and conservation invariants are the whole thesis, so they are
tested by **fuzzing, not just examples**, using
[Rendezvous](https://stx-labs.github.io/rendezvous/) (the Clarity fuzzer).
Rendezvous generates thousands of random inputs and checks that a property
written in Clarity always holds.

The target is `calc-payoff` - the pure settlement arithmetic. `exercise` pays
`qty * calc-payoff`; `reclaim` pays `qty * (max-payoff - calc-payoff)`. If
`calc-payoff` could ever exceed `max-payoff`, a writer would owe more than they
locked **and** the subtraction in `reclaim` would underflow-abort. Two
properties rule that out for all inputs:

| Property | What it proves | Discards |
| --- | --- | --- |
| `test-payoff-never-exceeds-collateral` | payoff <= locked collateral, always (solvency) | 0 |
| `test-payoff-leftover-conserves` | payoff + leftover == collateral, computed exactly as `reclaim` does (conservation + reclaim never underflow-aborts) | 0 |
| `test-put-otm-zero` | an out-of-the-money put pays nothing | precondition-gated |
| `test-call-otm-zero` | an out-of-the-money call pays nothing | precondition-gated |
| `test-put-itm-intrinsic` | an in-the-money put below the cap pays exactly strike - price | precondition-gated |
| `test-call-itm-intrinsic` | an in-the-money call below the cap pays exactly price - strike | precondition-gated |

The two solvency properties have **zero discards** - they are checked on every
generated input, including values up to the `uint` range. Result:

```text
OK, properties passed after 1000 runs.
- test-payoff-never-exceeds-collateral : PASSED, 0 failed, 0 discarded
- test-payoff-leftover-conserves       : PASSED, 0 failed, 0 discarded
(reproducible: npm run fuzz  /  rv . covault-core test --runs=1000 --seed=424242)
```

This runs in CI on every push (`npm run fuzz:ci`, fixed seed for determinism);
developers run fresh random seeds locally with `npm run fuzz`.

**How the frozen contract stays frozen.** Rendezvous needs the test functions
inside the contract, but `covault-core.clar` is deployed and must not change.
The property tests live in `security/rv-tests.clar`; `npm run fuzz:build`
concatenates them onto a verbatim copy of the deployed contract to produce
`security/covault-core.rv.clar` (git-ignored, regenerated on demand), and
`Clarinet-covault-core.toml` points Rendezvous at that copy. The deployed
`contracts/covault-core.clar` is never edited. The appended functions are
annotated `;; #[env(simnet)]`, which strips them on any real-network deploy.

## 3. Adversarial tests (example-based)

41 unit tests (Clarinet JS SDK, `npm test`) exercise the negative and
adversarial paths that fuzzing the pure function does not reach - authorization,
timing, double-spend, and the settlement trust boundary. The security-relevant
cases:

### Authorization and governance

- rejects settlement from a non-oracle principal
- honors a reassigned oracle (governance re-point works)
- caps the fee and gates fee changes to the owner
- restricts series creation to the owner until opened, then goes permissionless

### Timing and settlement

- rejects settlement before expiry
- cannot write after expiry
- rejects DIA settlement before expiry

### Double-claim and accounting

- cannot exercise more longs than held
- pays the holder the intrinsic value and returns the rest to the writer (conservation, on-chain balances)
- burns a matched long+short pair and refunds collateral before expiry (close-pair)
- returns escrowed longs to the maker on cancel

### Exits always open

- pause switch blocks new writes and series creation but never blocks exits

### Settlement integrity (settler)

- rejects settlement when no DIA principal is pinned
- rejects a lookalike oracle that is not the pinned DIA principal (fails closed, series stays unsettled)
- only the owner can pin the DIA principal
- rejects settlement when a feed value is older than max-price-age (fails closed)
- settles once the feed is fresh again
- future-dated timestamps count as fresh (block time can trail a push)
- only the owner can change max-price-age, and zero is rejected

## 4. Static analysis

`clarinet check` runs on every commit (CI) with the check-checker pass enabled.
8 contracts, no errors. The remaining warnings are `unchecked_data` notices on
governance/setter inputs that are intentionally unconstrained (principals, fee
recipient) and annotated `;; #[allow(unchecked_data)]` at the call sites where
validation is deliberately delegated to the caller or bounded elsewhere (e.g.
the fee is hard-capped at MAX-FEE-BPS regardless of input).

## 5. Findings log

Severity: Critical / High / Medium / Low / Informational. Status: Resolved /
Mitigated / Accepted.

### F-1. Settler accepted an unvetted DIA price source - High - Resolved

`settle-from-dia` is permissionless and took the DIA oracle as a trait
parameter. Before the fix it accepted *any* contract implementing `dia-trait`,
so an attacker could deploy a fake feed returning a chosen price and settle an
expired series at that price - draining writers' collateral within that series'
cap.

Caught during this review, before the settler was relied upon. Fixed by pinning
the canonical DIA principal (`set-dia-oracle`, owner-only) and checking the
passed principal against it **before any external call**
(`ERR-WRONG-ORACLE`). Verified on the live testnet deployment (`get-dia-oracle`
returns the canonical DIA principal; hash160 confirmed) and covered by three
tests under "DIA principal pinning". **Status: Resolved.**

### F-2. `settle-from-dia` could settle on a stale price - Medium - Resolved

The settler read DIA's value but not its timestamp, so a halted or lagging feed
could settle a series on an outdated price. Fixed by enforcing a freshness
window (`max-price-age`, default 6 h, owner-tunable, zero rejected) against
`stacks-block-time`; either feed being stale fails closed with
`ERR-STALE-PRICE` and the series stays unsettled. Covered by four tests under
"DIA freshness window". **Status: Resolved.**

### F-3. Single trusted settlement reporter (prototype path) - Informational - Mitigated

`covault-core` accepts a settlement price from one authorized `oracle`
principal. This is the intended prototype design. Mitigated by: (a) the blast
radius of a wrong price is one series and never exceeds that series' locked
collateral; (b) the production path replaces the manual reporter with the
permissionless DIA settler (F-1/F-2). Documented in
[SETTLEMENT-METHODOLOGY.md](SETTLEMENT-METHODOLOGY.md). **Status: Mitigated.**

### F-4. Single-key owner governance - Informational - Accepted

Governance (pause, curation, fee, oracle re-point) is a single owner key. Owner
powers are bounded by construction: pause and fees never block exits, the fee is
hard-capped at 5%, and settlement cannot be forged (the oracle only records a
price; it never moves assets directly). Accepted for the grant prototype;
multisig / DAO governance is a documented mainnet consideration. **Status: Accepted.**

### F-5. Cross-rate floor-division truncation - Low - Accepted

The settler's on-chain cross-rate uses integer floor division, truncating at
most one unit (1 sat or 1 microSTX) per contract - orders of magnitude below
DIA's own deviation threshold, and applied identically to every series.
Documented in the methodology. **Status: Accepted.**

No Critical findings remain open. All High and Medium findings are Resolved.

## 6. What is verified vs. what remains a trust assumption

Verified by test/fuzz/static analysis: solvency, conservation, settlement
authorization and timing, no double-claim, exits-always-open, settler price-source
integrity and freshness.

Remaining trust assumptions (documented, bounded, not eliminated): oracle price
correctness (bounded per series), DIA liveness (fails closed), and owner-key
custody (bounded powers). These are the entire trusted surface, and each is
disclosed in the threat model above and the settlement methodology.
