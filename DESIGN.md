# Design

Visual system for Covault. Register: product (app) with a brand landing. Identity:
**engraved certificate** - the language of security printing (guilloche line-work, hairline
rules, engraved serif display, wax-seal accent) on a deep ink field.

## Theme

Dark only. Scene: a treasurer at a dim desk after hours, writing a covered call against
their sBTC; the screen is the only bright object; the numbers must be exact. The surface is
a crisp deep near-black - the warmth of the certificate lives in the ivory paper, gilt
ornament, and wax seal, NOT in the background field (putting warmth in both is the muddy AI
tell). Near-black surface, warm engraved accents.

## Colors (OKLCH)

| Token | Value | Role |
| --- | --- | --- |
| --color-ink | oklch(0.145 0.005 75) | Body background - crisp deep near-black (warm whisper only) |
| --color-ink-2 | oklch(0.178 0.006 75) | Raised panels, table surfaces |
| --color-ink-3 | oklch(0.215 0.007 78) | Hover surfaces, input fields |
| --color-paper | oklch(0.94 0.013 85) | Primary text - engraved paper ivory |
| --color-paper-dim | oklch(0.72 0.018 82) | Secondary text, labels (4.5:1+ on ink) |
| --color-rule | oklch(0.315 0.01 78) | Hairline rules, borders |
| --color-gilt | oklch(0.78 0.08 85) | Ornament lines, guilloche strokes, engraved details. Never text. |
| --color-seal | oklch(0.60 0.19 38) | Wax-seal vermilion. Primary actions and "money moves here" only. |
| --color-on-seal | oklch(0.145 0.005 75) | Text on seal surfaces |
| --color-gain | oklch(0.74 0.13 150) | In-the-money, payoff-positive (always with +/label) |
| --color-data | oklch(0.66 0.125 150) | Chart marks only - a darker gain step, validated (CVD/contrast) against the dark surface |
| --color-loss | oklch(0.64 0.19 25) | Max-loss framing, errors (always with -/label) |

Strategy: Restrained in the app (seal <= 10% of any screen). The landing hero may commit
harder: gilt line-work over full-bleed ink is the voice.

Bans carried from PRODUCT.md anti-references: no slate/amber, no gradients on text, no
glass. Warmth lives in ink hue + gilt, nowhere else.

## Typography

| Role | Family | Notes |
| --- | --- | --- |
| Display / headings | Besley (700, 800; italic for emphasis) | Clarendon-blooded revival; security-print sturdiness. Landing display up to clamp(2.5rem, 6vw, 5rem), letter-spacing >= -0.02em |
| UI / body | Schibsted Grotesk (400, 500, 700) | Quiet newspaper grotesk; not on any reflex list |
| Figures / data / addresses | JetBrains Mono (400, 500) | tabular-nums everywhere data appears; class `tnum` |

Product scale (fixed rem): 12 / 13.5 / 15 / 17 / 20 / 24 / 30. Landing scale: fluid clamp,
ratio >= 1.25. Body line-height 1.6 (light-on-dark bonus applied); headings 1.15,
`text-wrap: balance`.

## Signature elements

- **The mark**: the brand's vault-door C - a supplied render with transparent background,
  chrome ring with vermilion jaws, spinner handle and hinges. Shipped as an optimized
  cutout at app/public/brand/logo-mark.png (256px), rendered via
  app/src/components/BrandMark.tsx next to the wordmark in navbars and the landing footer.
  Favicons (favicon-32/192.png, apple-touch-icon.png) are generated from the same source
  composited on the ink tile. Sources: app/public/logo.png (cutout),
  design-system/logo-concept-original.png (first render, baked background - never ship).
- **Guilloche**: parametric SVG line-work, stroked in gilt at 20-45% opacity, 0.75px
  strokes. Two constructions, and they are not interchangeable: the **band** is
  engine-turned lattice - strands bounded by a slow envelope, evenly phased, run in two
  counter-rotating sets so they interlock into a repeating motif; the **rosette** is a
  polar rose curve (r = R + a*sin(k*t)), reserved for seals and section marks. Free-running
  sinusoids at mixed frequencies are NOT guilloche - unbounded strands produce wave
  interference, which reads as tangled string. Bands scale uniformly
  (`preserveAspectRatio="slice"`), never stretched: uneven stroke weight kills the
  engraving. Hero band + section dividers + the corner ornaments of the app's summary
  panels. Drawn once, reused; never behind body text.
- **Hairline rules**: 1px `--color-rule` horizontal rules structure sections the way a
  ledger does. Double-rule (1px + 1px, 3px apart) marks major section heads.
- **The seal**: primary CTAs are rectangular, sharp-cornered (2px radius), seal-vermilion
  with ink text - a stamp, not a pill.
- **Conserved-sum motif**: payoff + leftover rendered as two segments of one bar that
  always total the collateral width.

## Components

Sharp corners (2px radius max; tables and panels 0). Borders 1px rule color. App surfaces:
no shadows except a single 0-2px ink shade under sticky headers. Landing demo plates carry
the one sanctioned display shadow (0 18px 54px -24px ink) that lifts them off the ink
field; nothing else casts. Buttons: seal (primary), outline-rule (secondary). There is no
destructive variant, deliberately: nothing the UI exposes is irreversible (`set-owner`, the
one one-way function, is not wired up), and spending loss-red on governance would erode the
one semantic this system guards hardest - loss red means loss. High-consequence but
reversible actions are gated by an inline two-step instead: the first press arms and renders
a before/after preview of the change plus what breaks if it is wrong, the second sends it
(see the oracle control in Admin). Any edit re-arms. Inputs: ink-3 field, paper text, rule border, seal
focus ring. Tables: double-rule header, tnum right-aligned figures, row hover = ink-3.
Status: engraved-style chips with dot + label. Skeletons: ink-3 shimmer. Async tx
feedback: inline TxStatus under the launching form (always-mounted aria-live region;
signing / pending / success / error with explorer links, success carries a next-step
hint) - no toasts. Expiry is quoted date-first ("= Jul 26, 02:00" with `hour12: false`)
with the burn block beside it as ground truth; past expiries show the block alone. Type
badges use categorical colors (call = gain green by direction association, put =
data-gold); the loss red is reserved for actual loss and error.

## Motion

- App: 150-250ms state transitions only; ease-out-quart. No entrance choreography.
- Landing: one orchestrated hero load (guilloche strokes draw in via stroke-dashoffset,
  heading fades up ~600ms), then per-section reveals that fit content (stats count up
  once). Content visible by default; motion enhances, never gates.
- prefers-reduced-motion: everything becomes instant or crossfade.

## Layout

- Landing: single column, max-w-6xl, generous clamp() vertical rhythm; asymmetry via an
  offset two-column invariant section.
- App: sticky top bar (ink, hairline bottom rule), max-w-7xl content, tables full-width
  with horizontal scroll inside their container.
- Z-scale: dropdown 20, sticky 30, backdrop 40, modal 50, toast 60.
