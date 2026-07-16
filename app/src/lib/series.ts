/**
 * Pure domain types + math for option series. Deliberately free of @stacks and
 * any network import, so brand/landing code (e.g. the PayoffChart demo rendered
 * on the landing) can use it without dragging the Stacks SDK into the initial
 * bundle. contract.ts re-exports all of this, so app callers are unaffected.
 */

export type Asset = "stx" | "sbtc";

export interface Series {
  id: number;
  creator: string;
  asset: Asset;
  quoteToken: string | null; // SIP-010 principal, null = native STX
  underlying: string;
  isCall: boolean;
  strike: bigint;
  maxPayoff: bigint;
  expiry: number; // burn-block-height
  settled: boolean;
  settlementPrice: bigint;
}

export type SeriesStatus = "active" | "expired" | "settled";

export function seriesStatus(s: Series, burnHeight: number): SeriesStatus {
  if (s.settled) return "settled";
  if (burnHeight >= s.expiry) return "expired";
  return "active";
}

/** Client-side mirror of the contract's calc-payoff, for showing claim amounts. */
export function payoffPerContract(s: Series): bigint {
  const p = s.settlementPrice;
  const intrinsic = s.isCall ? (p > s.strike ? p - s.strike : 0n) : (s.strike > p ? s.strike - p : 0n);
  return intrinsic > s.maxPayoff ? s.maxPayoff : intrinsic;
}
