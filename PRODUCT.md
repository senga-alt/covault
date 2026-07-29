# Product

## Register

product

(Primary surface is the dApp - a task tool. The landing page at `/` is a brand surface and
is designed under the brand register: it may take permissions the app must not.)

## Users

- sBTC/STX holders and small treasuries writing covered calls and cash-secured puts to earn
  premium. Context: deliberate, after-hours financial decisions; real money at stake.
- Hedgers and defined-risk traders buying puts/capped calls. They compare, price, and act.
- The operator (owner/oracle) curating series and settling expiries.
- Grant reviewers and Stacks builders evaluating whether this is a serious financial primitive.

The job on any screen: understand exactly what can be lost and gained, then act with a
signed transaction. Trust is the product.

## Product Purpose

Covault is a fully-collateralized, cash-settled European options clearinghouse on Stacks,
settled in sBTC or native STX. Every payoff is capped at its locked collateral, so the
system is solvent by construction - no liquidations, no margin, no funding. Success: real
series written, traded, and settled on mainnet by people other than the team.

## Brand Personality

Engraved, exact, quietly heavy. The visual language of security printing - bond
certificates, banknote guilloche, ledger rules - applied to a Bitcoin-native instrument.
Feels like a document that means something, not a website that wants something. Calm
authority; zero hype; the numbers are the voice.

## Anti-references

- The generic AI dark dashboard: slate-900 background, amber accent, bordered cards,
  Inter/Space Grotesk. (Explicitly rejected by the owner.)
- Crypto-casino aesthetics: neon gradients, glassmorphism, coin mascots, rocket emojis.
- Terminal/Bloomberg cosplay: green phosphor monospace-everything.
- SaaS landing template: hero-metric cards, tiny uppercase eyebrows over every section,
  identical three-card feature grids.

## Design Principles

1. **The certificate, not the casino.** Every surface should feel like an engraved
   financial document: hairline rules, tabular figures, ornament used sparingly and
   symmetrically. If an element could appear in a trading meme, it does not ship.
2. **Risk before action.** No transaction surface without max loss, max gain, and
   collateral shown first, in figures.
3. **The invariant is the brand.** payoff + leftover == collateral is what makes Covault
   different; the design returns to it visually (equations, paired bars, conserved sums).
4. **Numbers are typography.** Monospaced, tabular, right-aligned, never reflowing.
   Everything else defers to them.
5. **Landing persuades, app disappears.** The landing may be theatrical (engraved hero,
   drawn guilloche); the app is a quiet instrument that gets out of the way.

## Accessibility & Inclusion

WCAG AA minimum: 4.5:1 body text, 3:1 large text, visible focus rings, full keyboard
paths, aria-live for async results, color never the only signal (signs and labels
accompany gain/loss color). prefers-reduced-motion collapses all choreography to
crossfades. Touch targets >= 44px.
