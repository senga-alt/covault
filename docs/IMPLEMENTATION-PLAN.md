# Covault - Implementation Plan

Status: draft v1
Related docs: [PRD](./PRD.md) - [TRD](./TRD.md) - [App Flow](./APP-FLOW.md)

Maps the build to the three grant milestones. Amounts and dates match the submitted
application. Percentages are of the $10,000 request.

## Phase 0 - Contract complete (done)

- [x] `covault-core.clar` in Clarity 4: series lifecycle, order book, settlement.
- [x] sBTC + native STX collateral paths.
- [x] Governance/safety: pause, curated creation, capped taker fee.
- [x] Full Clarinet test suite passing, 0 errors, run against real sBTC and STX.
- [x] Frozen public ABI + docs (PRD, TRD, UX brief, app flow).

## Milestone 1 - Testnet deployment + verified core (20%, $2,000, ~4 weeks)

Goal: a live testnet contract and a public demo of one full lifecycle.

> Progress: deployed and demonstrated. `covault-core` is live on testnet at
> `ST3XC6XFFZQZ6BRYBZRJWRF2Z790TX9GB67KBQW0R.covault-core`, and the full lifecycle has been
> executed on-chain in both native STX and sBTC - see [M1 Evidence](./M1-EVIDENCE.md) for
> every transaction. Remaining: public repo with CI green, and the demo video.

Tasks
1. Deployment prep
   - `clarinet deployments generate --testnet`; review the plan (requirements remapped).
   - Fund the deployer testnet wallet; deploy `covault-core`.
   - Post-deploy config: set oracle principal; `open-creation = false`; `fee-bps = 0`.
2. Lifecycle script / CLI
   - A script (Stacks.js) that creates a series, writes, settles, exercises, reclaims on
     testnet, printing tx ids - the reproducible demo backbone.
3. Repo + docs public
   - Public GitHub, README quickstart, CI running `clarinet check` + the test suite.
4. Demo video
   - 2-3 min walkthrough of write -> settle -> exercise for an sBTC put and an STX put.

Acceptance / success criteria
- Live testnet contract address published.
- Public repo with `clarinet check` passing and the full test suite green in CI.
- Demo video link.

Adoption metric: at least one complete option lifecycle executed on testnet and shown end to
end in the public demo.

## Milestone 2 - Oracle integration + full dApp UI (30%, $3,000, ~9 weeks)

Goal: trust-minimized settlement and a public dApp that runs the whole lifecycle.

Tasks
1. Oracle integration
   - Replace the manual reporter with an on-chain DIA oracle read via the settler contract.
   - Settlement pulls the price on-chain at/after expiry; no manual entry.
2. dApp scaffold (Vite + React + TS + Tailwind + @stacks/connect + @stacks/transactions).
   - Wallet connect, network handling, balances.
3. dApp features (per [App Flow](./APP-FLOW.md))
   - Markets, series detail + payoff chart, write, order book (list/fill/cancel), portfolio,
     settlement view, admin panel (owner-only).
   - Post-conditions on every write; contract-error to plain-copy mapping.
4. Discovery round
   - 5 to 10 conversations with sBTC holders / treasuries / market makers; publish findings.

Acceptance / success criteria
- A series settles from an on-chain oracle price with no manual entry.
- A public dApp URL performs the full lifecycle on testnet end to end (UI repo open-sourced).

Adoption metric: at least one series settled through the on-chain oracle flow on testnet, with
the dApp performing the full lifecycle.

## Milestone 3 - Mainnet launch + first real usage (50%, $5,000, ~15 weeks)

Goal: mainnet deployment and the first real, settled options.

Tasks
1. Mainnet deploy of `covault-core`; point the dApp at mainnet.
2. Seed the first series (one sBTC, one native STX); manually coordinate the first buyers.
3. Run several short-expiry cycles; document each completed lifecycle publicly.
4. Turn on a modest taker fee only if usage justifies it.

Acceptance / success criteria
- Mainnet contract live; dApp live on mainnet; at least one full write -> settle -> exercise
  cycle completed on mainnet.

Final adoption metric (per the agreed milestone schedule): at least two mainnet series
including at least one sBTC-collateralized series, at least three completed trades, at least
two non-team wallets participating, and at least one series settled at expiry.

## Testnet deploy runbook (Phase 0 -> M1, do next)

What actually gets published to testnet: only the SIP-010 trait (a small interface,
republished under our deployer) and `covault-core`. covault-core's sole deploy-time
dependency is that trait - it never references sBTC in code (callers pass the real testnet
sBTC, `ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token`, as a trait argument at call
time). The sBTC contracts already exist on testnet, so Clarinet skips them on apply.

Estimated cost: about 3.4 STX (covault-core ~3.35 STX + trait ~0.008 STX) plus tx fees.
Fund the deployer with roughly 5-10 testnet STX to be safe.

```bash
# 1. Choose the deployer. The Clarinet-generated mnemonic in settings/Testnet.toml
#    (gitignored) is fine for testnet. Its address is shown as `expected-sender`
#    in the plan. To use your own wallet, replace the mnemonic and regenerate.

# 2. Generate + inspect the plan (requirements auto-resolved and remapped per network)
clarinet deployments generate --testnet --low-cost
#    -> deployments/default.testnet-plan.yaml (gitignored)

# 3. Fund the deployer address (the plan's `expected-sender`) with testnet STX:
#    https://explorer.hiro.so/sandbox/faucet?chain=testnet

# 4. Apply (broadcasts). Clarinet publishes the trait + covault-core and skips the
#    already-deployed sBTC contracts.
clarinet deployments apply --testnet

# 5. Post-deploy owner config (one tx each):
#    set-oracle <reporter-address>   ;; who reports settlement prices
#    keep open-creation = false (v1 curated) and fee-bps = 0 (fee off)

# 6. Verify: read-only get-config, then create the first series and run a full
#    write -> settle -> exercise cycle (this is the M1 demo).
```

Getting testnet sBTC to actually exercise the contract: use the sBTC testnet
faucet/bridge to receive `ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token`, then pass
`(some 'ST1F7...sbtc-token)` as the `token` argument to `write-options` / `fill-offer` /
`exercise` / `reclaim`. Native-STX series need no token (pass `none`).

## Oracle-settlement deploy + wire runbook (M2)

Adds permissionless DIA settlement WITHOUT redeploying the frozen core. A hand-authored
plan publishes only the traits + settler (core already on testnet; mock-* are test-only
and excluded). Do not use `apply --testnet` without `-p` here - the default plan would try
to republish core and deploy the mocks.

```bash
# 1. Publish dia-trait, oracle-trait, covault-settler AND pin the canonical DIA
#    principal (the plan's last batch calls set-dia-oracle; settle-from-dia refuses
#    any other price source). Deployer must hold ~3 testnet STX.
clarinet deployments apply --testnet \
  --deployment-plan-path deployments/settler-v2.testnet-plan.yaml

# 1b. Verify the pin (read-only, no keys needed):
#     get-dia-oracle on ST3XC6...covault-settler-v2 must return
#     (some 'ST1S5ZGRZV5K4S9205RWPRTX9RGS9JV40KQMR4G1J.dia-oracle)
#     If the plan's contract-call batch was skipped for any reason, call
#     set-dia-oracle from the deployer via the explorer sandbox before step 2.

# 2. Point covault-core's oracle at the settler (owner tx). UI-driven: connect the
#    owner wallet -> Operator panel -> Protocol controls -> Settlement oracle ->
#    "use the configured settler" -> Set oracle. (Or via console/explorer:
#    (contract-call? 'ST3XC6...covault-core set-oracle 'ST3XC6...covault-settler-v2))

# 3. Point the dApp at the settler so the DIA settle UI activates:
#    app/.env.local ->  VITE_SETTLER_CONTRACT=ST3XC6...covault-settler-v2
#    (and the same value in the Vercel env, then redeploy)
#    then rebuild. Settlement becomes permissionless (settle-from-dia); the manual
#    price field disappears.

# 4. Verify: create + expire a series, click "Settle from DIA". The settler reads
#    DIA STX/USD + sBTC/USD, derives the collateral-unit price, checks freshness
#    (default window 6 h, owner-tunable via set-max-price-age), and records it.

# 5. Update the landing FAQ ("Where does the settlement price come from?") so the
#    site matches the chain. Replacement answer, ready to paste:
#      "Each series records one settlement price at expiry, measured on Bitcoin
#      block height. Settlement is permissionless: anyone can trigger it, and the
#      price is derived on-chain from DIA's price feeds with a freshness check -
#      nobody, including us, can choose the number. A wrong price can only ever
#      affect its own series."
```

After step 2, the operator can no longer settle manually (it is no longer core's oracle) -
which is the point: settlement is now on-chain and permissionless. The DEX-TWAP source can
replace DIA later by swapping the price read in the settler, with no core or dApp change.

## Sequencing and dependencies

- Contract is frozen, so the dApp and scripts build against a stable ABI.
- Oracle integration (M2) depends on confirming which reference has a robust feed.
- Mainnet (M3) depends on M1/M2 shipping and KYC/agreement being complete.

## Post-grant roadmap (not funded here)

- More series types (weeklies, more references), SDK for embedding series, deeper liquidity
  partnerships, a formal third-party audit, and physically-settled covered calls.
