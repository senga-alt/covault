# Covault - UX / UI Design Brief

Status: draft v1
Related docs: [PRD](./PRD.md) - [App Flow](./APP-FLOW.md) - [TRD](./TRD.md)

## 1. Design goal

Make a fully-collateralized options market feel simple, precise, and trustworthy. The user
should always understand two things at a glance: exactly what they can lose, and exactly what
they can gain. Because Covault is solvent by construction, the UI should make that safety
visible, not hidden behind jargon.

## 2. Design principles

1. Numbers first. Financial data (strike, premium, payoff, collateral) is the content. Give it
   room, alignment, and a monospaced treatment so values are scannable and never ambiguous.
2. Show the risk before the action. Every write/buy surface shows max loss, max gain, and the
   payoff at settlement before the user signs.
3. One idea per screen. Browse, then a focused series detail, then a single clear action.
4. Honest states. Empty, loading, pending-signature, expired, and settled are all first-class
   states with clear copy, not afterthoughts.
5. Trust through clarity. Plain language over options jargon; explain capped calls and
   cash-secured puts inline.

## 3. Brand and tone

- Personality: precise, calm, Bitcoin-native, engineering-honest. Not hype.
- Voice: short, concrete, numerate. "You lock 1,000 sats. You can be paid up to 1,000 sats."
- Name usage: Covault, lowercase in body ("a covault series") avoided; always "a Covault
  series".

## 4. Visual direction

- Theme: dark-first (matches the Stacks Endowment aesthetic), with a light theme as a
  fast-follow. High contrast for numeric legibility.
- Accent: a single warm Bitcoin/Stacks orange for primary actions and positive payoff; a muted
  red only for max-loss framing; neutral grays for structure.
- Typography: a clean grotesque sans for UI (e.g. Inter), and a monospace for all numeric
  values and addresses (e.g. IBM Plex Mono / JetBrains Mono).
- Density: comfortable tables with clear column alignment; generous spacing around the single
  primary action per view.
- Motion: minimal and functional (state transitions, toast confirmations, payoff curve
  redraw). Respect `prefers-reduced-motion`.

## 5. Key screens

1. Markets (home): list/table of series with type (call/put), collateral asset (sBTC/STX),
   strike, expiry, status, and best offer. Filters by asset and status.
2. Series detail: the payoff curve, strike, expiry countdown (in Bitcoin blocks and est. time),
   collateral-per-contract, current offers, and the user's position in this series.
3. Write options: quantity input, live "you lock X, max payout to buyer Y", then sign.
4. Order book / trade: list an offer (price per contract), fill an offer (buy), cancel.
5. Positions / portfolio: the user's longs and shorts across series, with actions available in
   each state (sell, exercise, reclaim, close-pair).
6. Settlement view: post-expiry state showing settlement price and claimable amounts.
7. Admin (owner only): create series, settle (if operating the oracle), pause, set fee, open
   creation. Hidden entirely for non-owner wallets.

## 6. Core components

- WalletButton (connect / address / disconnect; network badge).
- SeriesCard / SeriesRow (type, asset, strike, expiry, status chips).
- PayoffChart (intrinsic payoff vs settlement price, with strike and cap markers).
- AmountField (integer units with an asset-aware human formatter: sats, STX).
- RiskSummary (max loss, max gain, break-even, collateral required).
- OfferTable (order book rows with fill action).
- PositionCard (long/short badge, quantity, contextual actions).
- TxToast (pending / confirmed / failed, with explorer link).
- StatusChip (Active / Expired / Settled / Paused).

## 7. States and edge cases

- Empty: no series yet, no positions, no offers - each with a one-line explainer and a next
  action.
- Loading / pending signature: skeletons for reads; a clear "confirm in your wallet" state for
  writes.
- Errors: map contract errors to plain messages (e.g. u110 -> "wrong collateral token for this
  series"; u105 -> "not expired yet"; u116 -> "series creation is limited to the operator in
  v1").
- Expired vs settled: expired but not settled = "awaiting settlement price"; settled = show
  claimable payoff/leftover.
- Wrong network: prompt to switch to the expected network.

## 8. Data display conventions

- Show amounts in human units with the smallest-unit value available on hover/expand (sBTC in
  BTC with 8 decimals, STX with 6). Never mix units silently.
- Expiry shown in `burn-block-height` with an estimated calendar time (about 10 min/block).
- Always label which asset a series settles in (sBTC or STX).

## 9. Accessibility and responsive

- WCAG AA contrast for text and numeric data; do not rely on color alone (use +/- and labels
  for gain/loss).
- Full keyboard navigation; visible focus; ARIA on dialogs and the order book table.
- Responsive: tables scroll horizontally inside their own container on small screens; the page
  body never scrolls sideways. Primary actions reachable one-handed on mobile.

## 10. Out of scope (v1 UI)

Charting beyond the single-series payoff curve, advanced order types, multi-leg builders, and
portfolio analytics. Kept for post-v1.
