# Milestone 1 - Testnet Deployment Evidence

Status: core evidence complete; repo publication + demo video pending
Network: Stacks testnet
Contract: `ST3XC6XFFZQZ6BRYBZRJWRF2Z790TX9GB67KBQW0R.covault-core` (Clarity 4)
Explorer: <https://explorer.hiro.so/txid/ST3XC6XFFZQZ6BRYBZRJWRF2Z790TX9GB67KBQW0R.covault-core?chain=testnet>

## What this documents

Milestone 1 commits to a live testnet deployment of `covault-core` and at least one complete
option lifecycle (write, settle, exercise, reclaim) executed on testnet. This document links
every on-chain transaction. The lifecycle was executed three times - collateralized in
**native STX**, in **real testnet sBTC**, and once more in STX by a **second wallet** -
which also pre-demonstrates the "one sBTC series and one native STX series" requirement
of the final mainnet metric and shows multi-party use.

All transactions below are `success` on-chain and independently checkable on the explorer.

## Deployment

| Step | Burn block | Transaction |
| --- | --- | --- |
| Deploy `covault-core` (Clarity 4) | 191855 | [0x1567a652...31f9d9](https://explorer.hiro.so/txid/0x1567a652194da5140491c79905cbdd45a088f9d18937ffbbf03978a60731f9d9?chain=testnet) |

## Lifecycle 1 - native STX series (series id 0)

Cash-secured put, strike = 1,000,000 uSTX (1 STX), collateral = strike.
Settled at 600,000 -> payoff 400,000 to the holder, leftover 600,000 to the writer.

| Step | Call | Burn block | Transaction |
| --- | --- | --- | --- |
| Create series | `create-series none "STX-DEMO" false u1000000 u1000000 u191866` | 191864 | [0x3c617a01...a90a7f](https://explorer.hiro.so/txid/0x3c617a01b0880162c129e933fa683fd91cff3780b3c70d360b7ee294eea90a7f?chain=testnet) |
| Write (lock 1 STX) | `write-options u0 u1 none` | 191865 | [0x0159965e...159a96](https://explorer.hiro.so/txid/0x0159965ef0ffcdf0c3932e9a34cc32bf0b8e59acb1cc2e1bc859a2d892159a96?chain=testnet) |
| Settle @ 600000 | `settle u0 u600000` | 191866 | [0x96aa326e...2af83b](https://explorer.hiro.so/txid/0x96aa326eddb72c4c7f522010dfe20e5e2d4981f95697f6a90dc80e403d2af83b?chain=testnet) |
| Exercise (payoff 400000) | `exercise u0 u1 none` | 191866 | [0x0449c605...2ac5bde](https://explorer.hiro.so/txid/0x0449c6053078f313ad07d938014395f337bd34571cec0895b490fb89e2ac5bde?chain=testnet) |
| Reclaim (leftover 600000) | `reclaim u0 u1 none` | 191866 | [0x57b517bd...9ab9a6](https://explorer.hiro.so/txid/0x57b517bd14606f8b8fcffdf4f2edfed790d84f6c99e9bea4a5a746e85b9ab9a6?chain=testnet) |

Conservation check: `payoff (400000) + leftover (600000) == collateral (1000000)` uSTX. Exact.

## Lifecycle 2 - sBTC series (series id 1)

Cash-secured put in real testnet sBTC
(`ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token`), strike = 10,000 sats.
Settled at 6,000 -> payoff 4,000 to the holder, leftover 6,000 to the writer.

| Step | Call | Burn block | Transaction |
| --- | --- | --- | --- |
| Create series | `create-series (some sbtc-token) "SBTC-DEMO" false u10000 u10000 u191868` | 191866 | [0xbf5af9d7...6e8121](https://explorer.hiro.so/txid/0xbf5af9d7d564d086ef4ace02fa6074889d26235a0aaa42a80326b7df8f6e8121?chain=testnet) |
| Write (lock 10000 sats) | `write-options u1 u1 (some sbtc-token)` | 191866 | [0x6db9db60...41585a](https://explorer.hiro.so/txid/0x6db9db60b95c9c48049a90708a842d237a4316eeb28e8f3d9ef842cf9441585a?chain=testnet) |
| Settle @ 6000 | `settle u1 u6000` | 191868 | [0x86850c78...77fd529](https://explorer.hiro.so/txid/0x86850c78e739448a3f139e9ef295f99c54af64f73f4ec2f61defa5b7077fd529?chain=testnet) |
| Exercise (payoff 4000) | `exercise u1 u1 (some sbtc-token)` | 191868 | [0x6ca7c554...45a036](https://explorer.hiro.so/txid/0x6ca7c554a42358ca5105fcec3a552048ff00c2076007ecd13bb9d1fb9445a036?chain=testnet) |
| Reclaim (leftover 6000) | `reclaim u1 u1 (some sbtc-token)` | 191868 | [0x1b9a50ed...d16c1e](https://explorer.hiro.so/txid/0x1b9a50edc30e5cfc8993d98ff40ca18e6b5f4c3d9fbaf85d7193ae9f6ed16c1e?chain=testnet) |

Conservation check: `payoff (4000) + leftover (6000) == collateral (10000)` sats. Exact.

## Lifecycle 3 - second wallet, native STX series (series id 2)

Cash-secured put, strike = 10,000,000 uSTX (10 STX). Written, exercised, and
reclaimed by a second wallet (`ST328E...WWR2`), demonstrating multi-party use:
the operator only created the series and posted the settlement price.
Settled at 6,000,000 -> payoff 4,000,000 to the holder, leftover 6,000,000 to the writer.

| Step | Caller | Burn block | Transaction |
| --- | --- | --- | --- |
| Create series | operator | 192018 | [0x4b9ab8ce...c7e152](https://explorer.hiro.so/txid/0x4b9ab8cedb27cc7a5ee756873123bd2cafd5b23c4202a7959850255eccc7e152?chain=testnet) |
| Write (lock 10 STX) | second wallet | 192020 | [0xd9ea7727...9c5875](https://explorer.hiro.so/txid/0xd9ea7727ea4dbbe5acaceffa878068f31403ebf763843f770bc05ef7d79c5875?chain=testnet) |
| Settle @ 6000000 | operator (oracle) | 192022 | [0x68dca963...efa540](https://explorer.hiro.so/txid/0x68dca963262d4e21ecf1117fc393323d747ec5b94ccfda578b517e585fefa540?chain=testnet) |
| Exercise (payoff 4000000) | second wallet | 192023 | [0x83b4f0c3...6756c1](https://explorer.hiro.so/txid/0x83b4f0c309cff4a8601803e75ae6ff8ea9bc36a33981f6e1df2d5993a66756c1?chain=testnet) |
| Reclaim (leftover 6000000) | second wallet | 192023 | [0x57ab4e32...c798c5](https://explorer.hiro.so/txid/0x57ab4e32af217b22e4d342b8e4fc411c692889b63bcdb9550e569b06aac798c5?chain=testnet) |

Conservation check: `payoff (4000000) + leftover (6000000) == collateral (10000000)` uSTX. Exact.

## Verified end state (read from the chain)

- `get-config`: series-count = 3, offer-count = 0, paused = false, open-creation = false
  (v1 curated), fee-bps = 0.
- Series 0: `settled = true`, settlement-price = 600000, quote-token = none (native STX).
- Series 1: `settled = true`, settlement-price = 6000, quote-token = testnet sbtc-token.
- Series 2: `settled = true`, settlement-price = 6000000, quote-token = none (native STX).
- All long and short positions on all three series: 0 (fully exercised and reclaimed).
- Contract escrow after all three lifecycles: **0 uSTX and 0 sats** - every unit of collateral
  flowed back out. The solvency invariant held on-chain in both assets.

## How to reproduce

The lifecycle was driven by the script in [`scripts/`](../scripts/README.md):

```bash
cd scripts && npm install && cp .env.example .env  # set CONTRACT_ADDRESS + MNEMONIC
npm run lifecycle -- demo                  # native STX lifecycle
npm run lifecycle -- demo --asset=sbtc     # sBTC lifecycle
```

Any step can also be verified without keys via read-only calls
(`get-config`, `get-series`, `get-long`, `get-short`) against the contract above.

## M1 checklist

- [x] `covault-core` deployed to Stacks testnet (Clarity 4), wired to canonical sBTC.
- [x] Full lifecycle executed on testnet - three times (native STX, sBTC, and a
  second-wallet STX lifecycle), all txs `success`.
- [x] Adoption metric met: at least one complete lifecycle on testnet, shown end to end.
- [x] Reproducible lifecycle CLI (`scripts/`), including offer commands
  (`list <id> <qty> <price>`, `fill <offerId> <qty>`, `cancel <offerId>`).
- [ ] Order-book demo on testnet: one `list-offer` + `fill-offer` pair between the two
  wallets (the order book is fully covered in the test suite; this puts it on-chain to
  match the milestone's "order listing, purchase" wording).
- [ ] Public repo with CI green (`clarinet check` + 38-test suite).
- [ ] Demo video (2-3 min walkthrough).
