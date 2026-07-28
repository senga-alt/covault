# Covault lifecycle scripts

A small Stacks.js CLI that drives the deployed `covault-core` contract end to end on testnet,
in either collateral asset: **native STX** (default) or **sBTC**. One account plays owner,
writer, oracle, and holder, which is enough to demonstrate the full lifecycle and the
conservation invariant (`payoff + leftover == collateral`) on-chain. This is the reproducible
M1 demo - and running it once per asset produces exactly the "one sBTC series and one native
STX series" evidence the milestones commit to.

## Setup

```bash
cd scripts
npm install
cp .env.example .env
# edit .env: set CONTRACT_ADDRESS (your deployer principal) and MNEMONIC (deployer's 24 words)
```

`.env` is gitignored - never commit it. `MNEMONIC` is the same one in `settings/Testnet.toml`.

## Choosing the asset

Add `--asset=sbtc` to any command to use sBTC; the default is native STX.

- STX series need only testnet STX (faucet: explorer.hiro.so sandbox).
- sBTC series need testnet sBTC (`ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token`) in
  the sender's wallet - the Hiro explorer sandbox faucet has an sBTC option on testnet, or use
  the sBTC testnet bridge. Check what you hold with `npm run lifecycle -- balance`.
- The flag must match the series' collateral asset, or the contract returns
  ERR-WRONG-TOKEN (u110).

Units are the asset's smallest units: microSTX for STX (1 STX = 1,000,000), sats for sBTC.

## Commands

```bash
npm run lifecycle -- whoami                  # print config + on-chain get-config
npm run lifecycle -- balance                 # sender's STX and sBTC balances
npm run lifecycle -- create <strike> <expiryAhead> [--asset=sbtc]  # create a put; prints the series id
npm run lifecycle -- status <id>             # series data, your long/short, burn height
npm run lifecycle -- write <id> <qty> [--asset=sbtc]   # lock collateral, mint long + short
npm run lifecycle -- list <id> <qty> <price>             # list part of your long for sale
npm run lifecycle -- fill <offerId> <qty> [--asset=sbtc] # buy from an open offer (premium in collateral asset)
npm run lifecycle -- cancel <offerId>                    # withdraw your open offer
npm run lifecycle -- settle <id> <price>     # oracle records settlement price (after expiry)
npm run lifecycle -- exercise <id> <qty> [--asset=sbtc]  # holder claims payoff
npm run lifecycle -- reclaim <id> <qty> [--asset=sbtc]   # writer reclaims leftover collateral
npm run lifecycle -- demo [--asset=sbtc]     # the whole lifecycle, start to finish
```

`expiryAhead` is in Bitcoin (burn) blocks.

## The `demo` flow

`demo` creates a cash-secured put expiring ~2 burn blocks out, writes 1 contract (locking the
strike as collateral), waits for expiry, settles at 60% of the strike (so the put pays 40%),
then exercises and reclaims. It prints every txid with an explorer link and finishes by
showing that `payoff + leftover == collateral` exactly.

Demo sizing: STX uses a 1 STX strike (1,000,000 uSTX); sBTC uses a 10,000-sat strike
(0.0001 BTC), so a faucet-sized sBTC balance is plenty.

Timing: testnet burn blocks are ~10 minutes, so `demo` can take 20-30+ minutes (it polls and
prints progress). For a quicker manual run, use the individual commands and call `settle` once
`status` shows the burn height has passed the series expiry.

Run it once per asset for the milestone evidence:

```bash
npm run lifecycle -- demo                 # native STX series
npm run lifecycle -- demo --asset=sbtc    # sBTC series (check funds first: npm run lifecycle -- balance)
```

## Notes

- Post-conditions: this script uses allow-mode for brevity. The dApp will attach strict
  post-conditions (exact STX/sBTC amounts) on every write.
- On mainnet (`NETWORK=mainnet`), the sBTC principal switches automatically to
  `SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token`.
