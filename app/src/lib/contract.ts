import { Cl, cvToJSON, fetchCallReadOnlyFunction, type ClarityValue } from "@stacks/transactions";

// --- deployment config (env-overridable, defaults = live testnet deployment) ---
export const NETWORK = (import.meta.env.VITE_NETWORK ?? "testnet") as "testnet" | "mainnet";
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS ?? "ST3XC6XFFZQZ6BRYBZRJWRF2Z790TX9GB67KBQW0R";
export const CONTRACT_NAME = import.meta.env.VITE_CONTRACT_NAME ?? "covault-core";
export const CONTRACT_ID = `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`;

export const SBTC_CONTRACT =
  NETWORK === "mainnet"
    ? "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token"
    : "ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token";

export const API_BASE = NETWORK === "mainnet" ? "https://api.hiro.so" : "https://api.testnet.hiro.so";

export const explorerTxUrl = (txid: string) =>
  `https://explorer.hiro.so/txid/${txid.startsWith("0x") ? txid : `0x${txid}`}?chain=${NETWORK}`;

// --- domain types ---
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

export interface ProtocolConfig {
  owner: string;
  oracle: string;
  paused: boolean;
  openCreation: boolean;
  feeBps: number;
  feeRecipient: string;
  seriesCount: number;
  offerCount: number;
}

export type SeriesStatus = "active" | "expired" | "settled";

export function seriesStatus(s: Series, burnHeight: number): SeriesStatus {
  if (s.settled) return "settled";
  if (burnHeight >= s.expiry) return "expired";
  return "active";
}

// --- read-only plumbing ---
async function ro(fn: string, args: ClarityValue[]): Promise<any> {
  const cv = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: fn,
    functionArgs: args,
    senderAddress: CONTRACT_ADDRESS,
    network: NETWORK,
  });
  return cvToJSON(cv);
}

// cvToJSON tuple fields arrive as { type, value } - unwrap one level
const field = (tuple: any, name: string) => tuple[name]?.value;

export async function getConfig(): Promise<ProtocolConfig> {
  const j = await ro("get-config", []);
  const t = j.value;
  return {
    owner: field(t, "owner"),
    oracle: field(t, "oracle"),
    paused: field(t, "paused"),
    openCreation: field(t, "open-creation"),
    feeBps: Number(field(t, "fee-bps")),
    feeRecipient: field(t, "fee-recipient"),
    seriesCount: Number(field(t, "series-count")),
    offerCount: Number(field(t, "offer-count")),
  };
}

export async function getSeries(id: number): Promise<Series | null> {
  const j = await ro("get-series", [Cl.uint(id)]);
  if (j.value === null) return null;
  const t = j.value.value; // (some (tuple ...))
  const quote = field(t, "quote-token"); // none -> null, some -> nested principal
  const quoteToken = quote ? (quote.value as string) : null;
  return {
    id,
    creator: field(t, "creator"),
    asset: quoteToken ? "sbtc" : "stx",
    quoteToken,
    underlying: field(t, "underlying"),
    isCall: field(t, "is-call"),
    strike: BigInt(field(t, "strike")),
    maxPayoff: BigInt(field(t, "max-payoff")),
    expiry: Number(field(t, "expiry")),
    settled: field(t, "settled"),
    settlementPrice: BigInt(field(t, "settlement-price")),
  };
}

export async function getAllSeries(): Promise<Series[]> {
  const { seriesCount } = await getConfig();
  const ids = Array.from({ length: seriesCount }, (_, i) => i);
  const all = await Promise.all(ids.map(getSeries));
  return all.filter((s): s is Series => s !== null);
}

export async function getPosition(id: number, who: string): Promise<{ long: bigint; short: bigint }> {
  const [l, s] = await Promise.all([
    ro("get-long", [Cl.uint(id), Cl.principal(who)]),
    ro("get-short", [Cl.uint(id), Cl.principal(who)]),
  ]);
  return { long: BigInt(l.value), short: BigInt(s.value) };
}

export async function quotePayoff(id: number, price: bigint): Promise<bigint> {
  const j = await ro("quote-payoff", [Cl.uint(id), Cl.uint(price)]);
  return BigInt(j.value?.value ?? 0);
}

export async function getBurnHeight(): Promise<number> {
  const r = await fetch(`${API_BASE}/v2/info`);
  const j = await r.json();
  return j.burn_block_height as number;
}
