# Milestone 2 - Settlement Oracle + Full dApp UI: Evidence

Covault is live on **Stacks mainnet**. A series has been created, written,
settled from the DIA oracle, exercised and reclaimed, with the escrow
reconciling exactly to the collateral that was locked.

| | |
| --- | --- |
| Network | Stacks mainnet |
| Clearinghouse | [`SP1MY48S0Y1W4436P0VDTZCD9EW3EJPAW1WV3SA4Q.covault-core`](https://explorer.hiro.so/txid/SP1MY48S0Y1W4436P0VDTZCD9EW3EJPAW1WV3SA4Q.covault-core?chain=mainnet) |
| Settler | [`SP1MY48S0Y1W4436P0VDTZCD9EW3EJPAW1WV3SA4Q.covault-settler`](https://explorer.hiro.so/txid/SP1MY48S0Y1W4436P0VDTZCD9EW3EJPAW1WV3SA4Q.covault-settler?chain=mainnet) |
| Price source | [`SP1G48FZ4Y7JY8G2Z0N51QTCYGBQ6F4J43J77BQC0.dia-oracle`](https://explorer.hiro.so/txid/SP1G48FZ4Y7JY8G2Z0N51QTCYGBQ6F4J43J77BQC0.dia-oracle?chain=mainnet) (`STX/USD`, `BTC/USD`) |
| Application | <https://covault.org> |
| Demo video | <https://youtu.be/gNMK9uaxDpY> |
| Repository | <https://github.com/senga-alt/covault> |

## Acceptance items

| # | Item | Evidence |
| --- | --- | --- |
| 1 | DIA-based settlement implemented | `settle-from-dia` derives the cross-rate on-chain from `STX/USD` and `BTC/USD`. Transaction below |
| 2 | Settler deployed and documented | Deployed on mainnet (above); [SETTLEMENT-METHODOLOGY.md](./SETTLEMENT-METHODOLOGY.md) |
| 3 | Price source, cross-rate, freshness, fallbacks, risk, TWAP path documented | [SETTLEMENT-METHODOLOGY.md](./SETTLEMENT-METHODOLOGY.md), sections 1-5 |
| 4 | dApp supports the full lifecycle | Create, write, settle, exercise, reclaim - all seven transactions below, all from the UI |
| 5 | At least one series settled via the DIA flow | Series 0, settled at 296,259.781826 STX per sBTC |
| 6 | Structured security review; critical/high resolved | [SECURITY-REVIEW.md](./SECURITY-REVIEW.md). One High and two Medium, all resolved before deployment. None open |
| 7 | Updated docs and demo video of the oracle-integrated flow | Docs in this repository; video linked above |

## Deployment

One plan, four contracts, then the wiring. The generated Clarinet plan also
publishes `contracts/mocks/*`; those were removed deliberately, because a mock
oracle must never sit on mainnet beside a settler whose security rests on a
pinned price source. See [deployments/mainnet-plan.yaml](../deployments/mainnet-plan.yaml).

| Transaction | Txid |
| --- | --- |
| `set-dia-oracle` - pin the canonical DIA principal on the settler | [`0x5dd3987b`](https://explorer.hiro.so/txid/0x5dd3987bf5edd62021c5967c7e0b73938f2c0ec2796d778f62cf92358ec0bbec?chain=mainnet) |
| `set-oracle` - authorize the settler as the clearinghouse's oracle | [`0x516553d9`](https://explorer.hiro.so/txid/0x516553d9234cbec922aea842ba033baff11d72430bde4d0493ead287e65e6f1b?chain=mainnet) |

After this, the operator can no longer record a price manually. Settlement is
permissionless and priced by the oracle, by construction.

## Series 0 - the full lifecycle

A capped call on sBTC, collateralized in native STX.

| | |
| --- | --- |
| Underlying | `SBTC-STX` (microSTX per sBTC) |
| Strike | 284,000 STX |
| Max payoff (cap) | 20 STX per contract - this is the collateral a writer locks |
| Expiry | burn block #966,988 |
| Quantity written | 1 |

| Step | Txid | Result |
| --- | --- | --- |
| `create-series` | [`0xd64889e1`](https://explorer.hiro.so/txid/0xd64889e1a375bf0fac8da59f1095b1568ccf3beed2afbcc7e7d170513fe437c8?chain=mainnet) | Series 0 listed, out of the money at creation |
| `write-options` | [`0x17f3f743`](https://explorer.hiro.so/txid/0x17f3f743c14201457baa4c34dc4c0580291949cd7a6242492dd0a117eaa00f16?chain=mainnet) | 20 STX locked; 1 long + 1 short minted |
| `settle-from-dia` | [`0x58358f37`](https://explorer.hiro.so/txid/0x58358f376f87431fc4519dbf5dd98cb6c5d82588c3fe5a119ff663b3d04a2900?chain=mainnet) | Settled at **296,259.781826 STX**, block 8,994,877 |
| `exercise` | [`0x3f1ebd36`](https://explorer.hiro.so/txid/0x3f1ebd3618080793098f7960d07c8cf0625613cd1aac7ae3dd2afb1d2c5946e2?chain=mainnet) | Holder paid 20 STX |
| `reclaim` | [`0x5a0ca6e7`](https://explorer.hiro.so/txid/0x5a0ca6e75fa8b6df9c6701841d91f68684a37c4600badaf496244e189d75ca7e?chain=mainnet) | Writer returned 0 STX |

### Settlement was derived, not entered

No operator supplied that price. `settle-from-dia` reads DIA's two feeds,
checks both are inside the freshness window, and computes:

```
price = btc_usd * 1,000,000 / stx_usd      (microSTX per sBTC)
```

The application shows the derived figure and the feed age *before* the user
signs, by calling the settler's own `derive-price` - so the preview cannot
disagree with what the chain records. It did not: the preview read
296,259.781826 and that is the value on-chain.

### Conservation

The series settled at 296,259.781826 STX, roughly **12,260 STX above the
284,000 strike** - more than six hundred times the contract's 20 STX cap. The
holder received 20 STX and not one unit more, which is the cap doing its job.

```
payoff 20  +  leftover 0  =  20 STX collateral
```

Escrow held by `covault-core` after all claims: **0.0000 STX**. It held exactly
the collateral, and released exactly the collateral.

## The price feed, and a disclosed change

The milestone specifies `BTC/USD` and `STX/USD`. Covault originally read
`sBTC/USD` instead, documented at Milestone 1 as a deliberate deviation: the
collateral in an sBTC series *is* sBTC, so pricing it with the sBTC feed avoided
the peg basis entirely.

DIA stopped maintaining `sBTC/USD`. On mainnet the feed has not moved a single
unit since 5 August 2026 and now reports a price roughly twenty percent below
the live Bitcoin price. `STX/USD` and `BTC/USD` are the only feeds DIA currently
maintains on Stacks.

Covault therefore reads `BTC/USD`, returning to the pair the deliverable
specifies. **The change was disclosed to and approved by the Stacks Endowment
before it shipped.** It reintroduces the sBTC-to-BTC peg basis as a documented
risk, covered in [SETTLEMENT-METHODOLOGY.md](./SETTLEMENT-METHODOLOGY.md)
section 1. That basis affects who receives the escrow; it can never affect how
much leaves it, because the payoff is capped at the collateral.

The dead feed also demonstrates the freshness check working: a settler pointed
at `sBTC/USD` would refuse every settlement with `ERR-STALE-PRICE` rather than
settle on a month-old price. That is observable on-chain today by anyone.

## Verify without trusting this document

Read-only, no wallet, no keys:

- `get-oracle` on `covault-core` returns the settler
- `get-dia-oracle` on `covault-settler` returns DIA's canonical mainnet principal
- `derive-price` on the settler returns the cross-rate a settlement would record now
- `get-series 0` returns the recorded settlement price

A clean clone runs the full check suite with no configuration and no network:

```bash
git clone https://github.com/senga-alt/covault && cd covault
npm install
clarinet check     # static analysis, 6 contracts
npm test           # 44 unit tests
npm run fuzz       # 1,000 randomized runs against the solvency invariant
```

Continuous integration runs all three on every commit.

## Note on Milestone 1 evidence

The Milestone 1 transactions were recorded on Stacks testnet before the
7 August 2026 reset, which cleared all testnet history ecosystem-wide. Those
explorer links no longer resolve, because the chain they were written to no
longer exists. Milestone 1 was reviewed and approved on 11 August against
evidence captured before the reset. Everything in *this* document is on mainnet
and remains queryable.
