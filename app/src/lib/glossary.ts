/**
 * Point-of-use definitions for the options vocabulary. Deliberately plain, and
 * anchored to Covault's invariants (payoff + leftover = collateral; solvent by
 * construction; burn-block expiry; post-conditions). Rendered by <Term>.
 * No dependencies - safe to import anywhere.
 */
export const GLOSSARY = {
  collateral: {
    label: "Collateral",
    text: "The funds locked on-chain to back an option. Every payoff is capped at this amount, so a writer can never owe more than they lock.",
  },
  premium: {
    label: "Premium",
    text: "What the buyer pays the writer for an option, earned upfront by selling the long side.",
  },
  long: {
    label: "Long",
    text: "The option you hold - the right to the payoff if it settles in-the-money.",
  },
  short: {
    label: "Short",
    text: "The obligation you wrote. Your locked collateral covers the holder's payoff; the leftover returns to you.",
  },
  leftover: {
    label: "Leftover",
    text: "Collateral returned to the writer at settlement - the locked amount minus whatever the holder is paid. payoff + leftover = collateral, always.",
  },
  "cash-secured-put": {
    label: "Cash-secured put",
    text: "A put fully backed by locked collateral. If it settles in-the-money the holder is paid from that collateral - the writer can never owe more.",
  },
  "capped-call": {
    label: "Capped call",
    text: "A call whose payoff is capped at the locked collateral. Both the writer's obligation and the holder's upside stop at that amount.",
  },
  strike: {
    label: "Strike",
    text: "The reference price the option settles against at expiry.",
  },
  expiry: {
    label: "Expiry",
    text: "The Bitcoin burn-block height at which the series settles. Quoted date-first, with the block as ground truth.",
  },
  "settlement-price": {
    label: "Settlement price",
    text: "The oracle-reported price recorded at expiry. It fixes each side's payoff to the unit.",
  },
  "post-condition": {
    label: "Post-condition",
    text: "A Stacks safety check attached to the transaction: it can move exactly the stated amount and nothing else, or it aborts.",
  },
} as const;

export type TermKey = keyof typeof GLOSSARY;
