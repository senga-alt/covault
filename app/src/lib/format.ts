import type { Asset } from "./contract";

// Human-readable amounts. STX has 6 decimals (uSTX), sBTC has 8 (sats).
const DECIMALS: Record<Asset, number> = { stx: 6, sbtc: 8 };
const SYMBOL: Record<Asset, string> = { stx: "STX", sbtc: "sBTC" };
const UNIT: Record<Asset, string> = { stx: "uSTX", sbtc: "sats" };

/**
 * Below 0.01 sBTC, decimals stop being readable ("0.000003 sBTC") while sats
 * read exactly right ("300 sats"). Covault's sBTC series live in the hundreds
 * to thousands of sats - one STX is ~200 sats - so that is the natural unit for
 * strikes, collateral and payoffs. Larger holdings still read as sBTC.
 */
const SATS_DISPLAY_BELOW = 1_000_000n; // 0.01 sBTC

export function formatAmount(raw: bigint, asset: Asset, opts?: { withUnit?: boolean }): string {
  if (asset === "sbtc" && raw < SATS_DISPLAY_BELOW) {
    const human = raw.toLocaleString();
    return opts?.withUnit === false ? human : `${human} sats`;
  }
  const d = DECIMALS[asset];
  const base = 10n ** BigInt(d);
  const whole = raw / base;
  const frac = raw % base;
  let fracStr = frac.toString().padStart(d, "0").replace(/0+$/, "");
  const human = fracStr ? `${whole.toLocaleString()}.${fracStr}` : whole.toLocaleString();
  return opts?.withUnit === false ? human : `${human} ${SYMBOL[asset]}`;
}

export function formatRaw(raw: bigint, asset: Asset): string {
  return `${raw.toLocaleString()} ${UNIT[asset]}`;
}

export const assetSymbol = (asset: Asset) => SYMBOL[asset];
export const assetUnit = (asset: Asset) => UNIT[asset];

export function shortAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// Burn blocks are ~10 minutes; give people a calendar feel, clearly estimated.
export function estimateExpiry(expiry: number, burnHeight: number): string {
  const blocks = expiry - burnHeight;
  if (blocks <= 0) return "expired";
  const mins = blocks * 10;
  if (mins < 60) return `~${mins} min`;
  if (mins < 60 * 24) return `~${Math.round(mins / 60)} h`;
  return `~${Math.round(mins / 60 / 24)} d`;
}

// Date-first expiry: the treasurer thinks in dates, the block is the ground
// truth beside it. Null once the expiry block has passed.
export function estimateExpiryDate(expiry: number, burnHeight: number): string | null {
  const blocks = expiry - burnHeight;
  if (blocks <= 0 || burnHeight === 0) return null;
  const d = new Date(Date.now() + blocks * 10 * 60 * 1000);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
