# Milestone 1 - Testnet Deployment Evidence

Status: complete. Deployment, both collateral assets, order listing and
purchase by independent wallets, oracle settlement, exercise and reclaim - all
on-chain and linked below.

**Demo video: <https://youtu.be/cj7HO-ge1jA>** - a two-minute walkthrough
recorded live on testnet: writing options against locked collateral, the order
book with independent participants, permissionless settlement from the DIA
oracle, and the claims that follow.
Network: Stacks testnet
Contract: `ST3XC6XFFZQZ6BRYBZRJWRF2Z790TX9GB67KBQW0R.covault-core` (Clarity 4)
Explorer: <https://explorer.hiro.so/txid/ST3XC6XFFZQZ6BRYBZRJWRF2Z790TX9GB67KBQW0R.covault-core?chain=testnet>

## What this documents

Milestone 1 commits to a live testnet deployment of `covault-core` and at least one complete
option lifecycle (write, settle, exercise, reclaim) executed on testnet. This document links
every on-chain transaction.

The complete lifecycle was executed three times end to end - collateralized in
**native STX**, in **real testnet sBTC**, and once more in STX by a **second
wallet** - which also pre-demonstrates the "one sBTC series and one native STX
series" requirement of the final mainnet metric. A fourth section documents a
**live multi-party market**, where wallets outside the project wrote options,
listed them, and bought from one another, providing the on-chain evidence for
order listing and purchase.

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

## Live multi-party market (series 3-6) - order listing and purchase

The lifecycles above were driven by the project's own wallets. This section
documents an open market session in which **independent participants**, using
their own wallets and their own funds, wrote options, listed them, and bought
from each other. It is the on-chain evidence for the "order listing" and
"purchase" steps of the milestone.

Four series were created, forming an options chain on STX priced in sBTC plus
one position on sBTC priced in STX. Spot at the time: 214 sats per STX,
467,201 STX per sBTC.

| Series | Type | Strike | Collateral per contract | Created |
| --- | --- | --- | --- | --- |
| #3 | Cash-secured put | 190 sats | 190 sats | [0x3347bcb1...be5c0c](https://explorer.hiro.so/txid/0x3347bcb1242617069d2762171d45bf4bb0e809fb9e35fc5dd569b6224dbe5c0c?chain=testnet) |
| #4 | Cash-secured put | 240 sats | 240 sats | [0xb53fbbc7...eefdb0](https://explorer.hiro.so/txid/0xb53fbbc7c67311b15ef5b38ec8b45650cc178409d2a86ff1fd2b0c3648eefdb0?chain=testnet) |
| #5 | Capped call | 200 sats | 60 sats | [0xbecc50f1...668b1a](https://explorer.hiro.so/txid/0xbecc50f1533bce73bfa73afceb3be72a645912fb0b4c1fb1ebad835953668b1a?chain=testnet) |
| #6 | Capped call | 560,000 STX | 50 STX | [0x29173b1b...c89042](https://explorer.hiro.so/txid/0x29173b1b5655c4f5eae6b1c65f9b069d83876cd63656ebd8ac72ea8ed2c89042?chain=testnet) |

### Operator: opening liquidity

To avoid an empty order book, the operator wrote into each series and listed a
portion for sale. Collateral locked totals **1,040,000 sats + 250 STX**.

| Series | Write | Locked | List | Price | Transactions |
| --- | --- | --- | --- | --- | --- |
| #3 | 2,000 | 380,000 sats | 400 | 8 sats | [0xf07d1006...b285b2](https://explorer.hiro.so/txid/0xf07d1006c10fd20e9248eda1cb280b6dfc8d167f583b2639a9f3603b48b285b2?chain=testnet) / [0x3035dd77...b5ddb7](https://explorer.hiro.so/txid/0x3035dd772c8459527b25358d54bb1c55e98192c4f09cc5f873d3f17e46b5ddb7?chain=testnet) |
| #4 | 2,000 | 480,000 sats | 400 | 30 sats | [0x6e086b9e...e1884f](https://explorer.hiro.so/txid/0x6e086b9ee4369fe5086dc84c9ce7ebb1326ff84a3fc6750868e713d1f9e1884f?chain=testnet) / [0xfa44e5a9...ea85c9](https://explorer.hiro.so/txid/0xfa44e5a99164639e1ad5a0f5ba830518058aa1ecb8f137480531443628ea85c9?chain=testnet) |
| #5 | 3,000 | 180,000 sats | 500 | 18 sats | [0x6db0b7b6...ed98b8](https://explorer.hiro.so/txid/0x6db0b7b68464bcbae15770548d7d31a6e45879eefc30bfdf0735aa2874ed98b8?chain=testnet) / [0xb533ef90...5d9ccc](https://explorer.hiro.so/txid/0xb533ef902190ac0d729a6f36199cfd040576a7c4ae7e8eb8d3f39115425d9ccc?chain=testnet) |
| #6 | 5 | 250 STX | 1 | 2 STX | [0x644f2007...5a6dfb](https://explorer.hiro.so/txid/0x644f2007510d951d8d9ff86cc4398eb48033299292db5678d5b6370eb55a6dfb?chain=testnet) / [0xe2d82e49...cb8c86](https://explorer.hiro.so/txid/0xe2d82e4909d131800f91d3331c65c7e2709f1b0d51f1b30d1cc155df1fcb8c86?chain=testnet) |

### Independent participants: write, list, and a peer-to-peer purchase

Two wallets outside the project then transacted on their own initiative.

| Step | Actor | Action | Transaction |
| --- | --- | --- | --- |
| 1 | `ST1Q7W4CND6F...` | Wrote 190 contracts in series #3, locking 36,100 sats and receiving 190 long + 190 short | [0xa1b5a1ba...47f8a5](https://explorer.hiro.so/txid/0xa1b5a1ba272a125f59df975b0aa2f01ead592306e1be52235edd8c4fea47f8a5?chain=testnet) |
| 2 | `ST1Q7W4CND6F...` | Listed 100 of those options at 7 sats per contract, undercutting the operator's 8-sat offer | [0x3ed944dc...39a384](https://explorer.hiro.so/txid/0x3ed944dcb291e7a6232ec89650fea30b4c98b1f0ae28537efc9d96c0c539a384?chain=testnet) |
| 3 | `ST38AEGHHPTZ...` | **Bought 50 contracts from that offer**, paying 350 sats of premium directly to the seller | [0x0f635605...f418c4](https://explorer.hiro.so/txid/0x0f6356055e2e9b2ab5b3f476060be113b150e08b4cdd7abfdcb4f8bde7f418c4?chain=testnet) |

Full addresses: seller `ST1Q7W4CND6FCXKXVTE58KTGXJHSV8FJ0RQ026KY0`, buyer `ST38AEGHHPTZC78V67A70B6QK6FTKJ8XKHJZ9P634`.

**Why this trade matters.** The purchase was filled against another
participant's offer, not the operator's. Premium moved peer-to-peer and never
touched escrow; only collateral is ever escrowed. After the fill the buyer
holds **50 long and 0 short** - a pure option position whose maximum loss is
the 350 sats paid - while the seller retains the 190 short obligations backed
by their locked collateral.

**Balance reconciliation (seller).** Starting balance 100,000,000 sats, minus
36,100 locked as collateral, plus 350 received as premium, equals
**99,964,250 sats** - matching the on-chain balance exactly.

**Escrow reconciliation.** 1,040,000 sats (operator) + 36,100 sats
(participant) = **1,076,100 sats**, matching the contract's sBTC balance
exactly. Every unit of collateral is accounted for by an outstanding short
position.

### Settlement from the DIA oracle

All four series reached expiry and were settled **from the on-chain DIA price
feeds, with no manually entered price**. Each call reads `STX/USD` and
`sBTC/USD`, checks both are fresh, derives the cross-rate in the series'
collateral units, and records it.

| Series | Settled at | Payoff | Leftover | Sum | Collateral | Transaction |
| --- | --- | --- | --- | --- | --- | --- |
| #3 | 213 sats | 0 | 190 | **190** | 190 sats | [0x01e16393...c7e095](https://explorer.hiro.so/txid/0x01e16393b7de56fedbcfe76eee646a3e8dbfee4730c9989f6cb0323a92c7e095?chain=testnet) |
| #4 | 216 sats | 24 | 216 | **240** | 240 sats | [0x5f8f36d1...722e4d](https://explorer.hiro.so/txid/0x5f8f36d117d2a840495bdc3beb04a05bcf46a785ae710d06720c772f20722e4d?chain=testnet) |
| #5 | 213 sats | 13 | 47 | **60** | 60 sats | [0x5d1e42aa...51b31e](https://explorer.hiro.so/txid/0x5d1e42aacbd3b0c5e0fe2fdffd51ab807c1b6967fe969a4f614a95fc2351b31e?chain=testnet) |
| #6 | 468,526.442 STX | 0 | 50 STX | **50 STX** | 50 STX | [0xa5bfef99...cb9bce](https://explorer.hiro.so/txid/0xa5bfef99e6063c2d38d4d2867f6e493dc4b0ab566b573c06fdc08ec143cb9bce?chain=testnet) |

Four different settlement prices produced four different splits, and every one
lands exactly on its locked collateral - in whole units, with no rounding.
Series #6 settles in **native STX** and #3-#5 in **sBTC**, so both collateral
assets were settled through the oracle.

The settler is permissionless: it takes a series id and the pinned canonical
DIA principal. No caller - including the operator - can supply a price.

### Claims: exercise and reclaim

| Series | Claim | Amount | Transaction |
| --- | --- | --- | --- |
| #4 | Exercise 1,600 @ 24 | 38,400 sats | [0xdd82e63e...5966ba](https://explorer.hiro.so/txid/0xdd82e63e0c63ee898355552d127e11f094a6dc9f7c38141f0d7d0b5dd75966ba?chain=testnet) |
| #4 | Reclaim 2,000 @ 216 | 432,000 sats | [0xeba66b59...7873fc](https://explorer.hiro.so/txid/0xeba66b5960eefd4137e698cb7f14db8b0a296df4644609e14d28704d607873fc?chain=testnet) |
| #4 | Exercise 400 (returned from a cancelled offer) | 9,600 sats | [0x4d3d251e...c44d27](https://explorer.hiro.so/txid/0x4d3d251e8bb8299ee87291f70f28555a9b65c526a82a1151bb438b9c05c44d27?chain=testnet) |
| #5 | Exercise 2,500 @ 13 | 32,500 sats | [0x6ba8edf4...71a0c7](https://explorer.hiro.so/txid/0x6ba8edf42960a63c556fcef65417146ff6a981ec60c5abaa721bdb564971a0c7?chain=testnet) |
| #5 | Reclaim 3,000 @ 47 | 141,000 sats | [0x40389b14...33b8b4](https://explorer.hiro.so/txid/0x40389b1426ed769d343d6007f5b2e685e49d372f18eb8ebd2e2ff1bef133b8b4?chain=testnet) |
| #5 | Exercise 500 (returned from a cancelled offer) | 6,500 sats | [0xd319a2f7...82b4c1](https://explorer.hiro.so/txid/0xd319a2f78e785d44ef13b85ff4bb19ce0a18fdea7d6625dd124ce0fb2882b4c1?chain=testnet) |
| #3 | Reclaim 2,000 @ 190 | 380,000 sats | [0xd225bb2c...204f0a](https://explorer.hiro.so/txid/0xd225bb2c6f3a7b4249bcad37900ace39b1fc1b6a87aaf05dc11fa14c97204f0a?chain=testnet) |
| #6 | Reclaim 5 @ 50 STX | 250 STX | [0xd96e2eed...813267](https://explorer.hiro.so/txid/0xd96e2eed9dace02d7e247e667f8de4b28b68b8f12615faca66e19d1d8f813267?chain=testnet) |

**An independent participant closed their own position** (`ST1Q7W4CND6F...`):

| Series | Claim | Amount | Transaction |
| --- | --- | --- | --- |
| #3 | Exercise 90 (settled out of the money, pays 0) | 0 sats | [0x078a5332...3aa79d](https://explorer.hiro.so/txid/0x078a5332e753c344c2e32b4250f98226d4c6e954c090d1a589eb74f7123aa79d?chain=testnet) |
| #3 | Reclaim 190 @ 190 | 36,100 sats | [0x32e5ff7f...12c158](https://explorer.hiro.so/txid/0x32e5ff7f23993f078e062a1ea8b0fc535a9f29a21b3cd79a57e62be22412c158?chain=testnet) |

Their round trip, in full: locked 36,100 sats writing 190 puts, sold 50 of the
options for 350 sats of premium, and - because series #3 settled at 213, above
the 190 strike - the options expired worthless and they reclaimed all 36,100.
Their wallet went from 100,000,000 to **100,000,350 sats**: up exactly the
premium they were paid for taking the risk. That is a cash-secured put working
as intended, executed end to end by a wallet outside the project.

### Closing reconciliation

After every claim, the contract's sBTC escrow stands at **95,000 sats** and its
STX escrow at **0**.

```text
95,000 sats  =  series #7 (still active): 500 contracts x 190 sats collateral
     0 STX   =  no STX-collateralized series remains open
```

Every settled series returned **every unit** of collateral it held. Nothing was
retained, nothing was lost, and the only sats still escrowed belong to a series
that has not yet expired. The remaining long positions in #3 and #6 are worth
exactly zero because those options settled out of the money - the correct
outcome, not an unclaimed balance.

## Verified end state (read from the chain)

Read directly from `covault-core` after all settlements and claims:

- `get-config`: series-count = 8, paused = false, open-creation = false (v1
  curated), fee-bps = 0.
- **Series 0, 1, 2** (the first lifecycles): settled, all positions zero.
- **Series 3, 4, 5, 6** (the live market): settled from the DIA oracle at 213,
  216, 213 sats and 468,526.442 STX respectively; every short reclaimed and
  every in-the-money long exercised.
- **Series 7**: still active - the only series holding collateral.
- Contract escrow: **95,000 sats and 0 STX**, exactly series #7's outstanding
  collateral (500 contracts x 190 sats). Every settled series has returned every
  unit it held, in both collateral assets.

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
- [x] Full lifecycle executed on testnet - three scripted lifecycles (native STX,
  sBTC, second wallet) plus a four-series live market settled from the oracle.
- [x] Adoption metric met: at least one complete lifecycle on testnet, shown end to end.
- [x] Reproducible lifecycle CLI (`scripts/`), including offer commands
  (`list <id> <qty> <price>`, `fill <offerId> <qty>`, `cancel <offerId>`).
- [x] Order listing and purchase on testnet: offers listed by both the operator and an
  independent participant, and a peer-to-peer fill between two non-team wallets.
- [x] Settlement from an on-chain price feed, in both collateral assets, with
  payoff + leftover reconciling exactly to locked collateral on every series.
- [x] Claims completed by an independent wallet as well as the operator.
- [x] Public repo with CI green (`clarinet check` + full test suite + fuzzing).
- [x] Demo video: <https://youtu.be/cj7HO-ge1jA>
