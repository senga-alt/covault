import { Cl, cvToJSON, fetchCallReadOnlyFunction, type ClarityValue } from "@stacks/transactions";
import { NETWORK } from "./config";
import {
  payoffPerContract,
  seriesStatus,
  type Asset,
  type Series,
  type SeriesStatus,
} from "./series";

// --- deployment config (env-overridable, defaults = live testnet deployment) ---
// NETWORK lives in ./config (no @stacks import) so brand/landing code can read it
// without dragging the SDK into the initial bundle; re-exported here for app callers.
export { NETWORK };
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS ?? "ST3XC6XFFZQZ6BRYBZRJWRF2Z790TX9GB67KBQW0R";
export const CONTRACT_NAME = import.meta.env.VITE_CONTRACT_NAME ?? "covault-core";
export const CONTRACT_ID = `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`;

export const SBTC_CONTRACT =
  NETWORK === "mainnet"
    ? "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token"
    : "ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token";

// DIA on-chain oracle (price source for permissionless settlement).
export const DIA_CONTRACT =
  NETWORK === "mainnet"
    ? "SP1G48FZ4Y7JY8G2Z0N51QTCYGBQ6F4J43J77BQC0.dia-oracle"
    : "ST1S5ZGRZV5K4S9205RWPRTX9RGS9JV40KQMR4G1J.dia-oracle";

// Optional settler deployment. When set, settlement is permissionless via DIA
// (settle-from-dia); when unset, the app falls back to the operator's manual
// settle on core. Set VITE_SETTLER_CONTRACT once the settler is deployed.
export const SETTLER_ID = (import.meta.env.VITE_SETTLER_CONTRACT ?? "") as string;
export const hasSettler = SETTLER_ID.includes(".");

export const API_BASE = NETWORK === "mainnet" ? "https://api.hiro.so" : "https://api.testnet.hiro.so";

export const explorerTxUrl = (txid: string) =>
  `https://explorer.hiro.so/txid/${txid.startsWith("0x") ? txid : `0x${txid}`}?chain=${NETWORK}`;

export const explorerAddressUrl = (address: string) =>
  `https://explorer.hiro.so/address/${address}?chain=${NETWORK}`;

// --- domain types + pure math (defined in ./series; re-exported for app callers) ---
export { payoffPerContract, seriesStatus };
export type { Asset, Series, SeriesStatus };

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

export interface Offer {
  id: number;
  seriesId: number;
  maker: string;
  qty: bigint;
  price: bigint; // collateral units per contract
  quoteToken: string | null;
}

export async function getOffer(id: number): Promise<Offer | null> {
  const j = await ro("get-offer", [Cl.uint(id)]);
  if (j.value === null) return null;
  const t = j.value.value;
  const quote = field(t, "quote-token");
  return {
    id,
    seriesId: Number(field(t, "series-id")),
    maker: field(t, "maker"),
    qty: BigInt(field(t, "qty")),
    price: BigInt(field(t, "price")),
    quoteToken: quote ? (quote.value as string) : null,
  };
}

/** Every open offer across all series (cancelled offers vanish; filled ones have qty 0). */
export async function getAllOpenOffers(): Promise<Offer[]> {
  const { offerCount } = await getConfig();
  const ids = Array.from({ length: offerCount }, (_, i) => i);
  const all = await Promise.all(ids.map(getOffer));
  return all.filter((o): o is Offer => o !== null && o.qty > 0n);
}

/** All open offers for one series. */
export async function getOpenOffers(seriesId: number): Promise<Offer[]> {
  return (await getAllOpenOffers()).filter((o) => o.seriesId === seriesId);
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

/** STX + sBTC balances for an address, for pre-flight sufficiency checks. */
export async function getBalances(address: string): Promise<{ stx: bigint; sbtc: bigint }> {
  const r = await fetch(`${API_BASE}/extended/v1/address/${address}/balances`);
  if (!r.ok) throw new Error("Could not load wallet balances.");
  const j = await r.json();
  const key = Object.keys(j.fungible_tokens ?? {}).find((k) => k.startsWith(SBTC_CONTRACT));
  return {
    stx: BigInt(j.stx?.balance ?? 0),
    sbtc: BigInt(key ? j.fungible_tokens[key].balance : 0),
  };
}

/** One row of the contract's on-chain history, for the operator activity feed. */
export interface ActivityItem {
  txid: string;
  fn: string;
  sender: string;
  status: string;
  time: number; // ms epoch (burn block time)
  args: string[]; // clarity arg reprs, e.g. ["u2", "u1", "none"]
}

const mapTx = (tx: any): ActivityItem => ({
  txid: tx.tx_id as string,
  fn: tx.tx_type === "contract_call" ? (tx.contract_call.function_name as string) : "deploy",
  sender: tx.sender_address as string,
  status: tx.tx_status as string,
  time: ((tx.burn_block_time as number) ?? 0) * 1000,
  args:
    tx.tx_type === "contract_call"
      ? ((tx.contract_call.function_args ?? []) as any[]).map((a) => a.repr as string)
      : [],
});

/** All contract transactions within the last `days`, paginated (capped at 300). */
export async function getContractActivityDays(days: number): Promise<ActivityItem[]> {
  const start = Date.now() - days * 86_400_000;
  const out: ActivityItem[] = [];
  for (let offset = 0; offset < 300; offset += 50) {
    const r = await fetch(
      `${API_BASE}/extended/v1/address/${CONTRACT_ID}/transactions?limit=50&offset=${offset}`
    );
    if (!r.ok) throw new Error("Could not load contract activity.");
    const j = await r.json();
    const page = (j.results as any[]).map(mapTx);
    out.push(...page.filter((t) => t.time >= start));
    const oldest = page[page.length - 1];
    if (page.length < 50 || (oldest && oldest.time < start)) break;
  }
  return out;
}

/** What settle-from-dia would record right now, using the settler's own
 *  on-chain derive-price so the preview can never disagree with the chain. */
export interface DiaPreview {
  price: bigint; // settlement price in the series' collateral units
  ageSeconds: number; // oldest of the two feeds, normalized to seconds
  fresh: boolean; // would pass the settler's freshness window (approximate: wall clock)
  maxAge: number;
}

async function roAt(contractId: string, fn: string, args: ClarityValue[]): Promise<any> {
  const [contractAddress, contractName] = contractId.split(".");
  const cv = await fetchCallReadOnlyFunction({
    contractAddress,
    contractName,
    functionName: fn,
    functionArgs: args,
    senderAddress: contractAddress,
    network: NETWORK,
  });
  return cvToJSON(cv);
}

// DIA deployments emit second- or millisecond-precision timestamps; mirror the
// settler's normalization (>= 1e11 means milliseconds).
const normTs = (t: number) => (t >= 1e11 ? Math.floor(t / 1000) : t);

export async function getDiaSettlePreview(underlying: string): Promise<DiaPreview> {
  const [stxQ, sbtcQ, ageJ] = await Promise.all([
    roAt(DIA_CONTRACT, "get-value", [Cl.stringAscii("STX/USD")]),
    roAt(DIA_CONTRACT, "get-value", [Cl.stringAscii("sBTC/USD")]),
    roAt(SETTLER_ID, "get-max-price-age", []),
  ]);
  const stx = stxQ.value.value;
  const sbtc = sbtcQ.value.value;
  const priceJ = await roAt(SETTLER_ID, "derive-price", [
    Cl.stringAscii(underlying),
    Cl.uint(stx.value.value),
    Cl.uint(sbtc.value.value),
  ]);
  if (!priceJ.success) throw new Error("This series' pair label cannot settle from DIA.");
  const now = Math.floor(Date.now() / 1000);
  const age = Math.max(
    now - normTs(Number(stx.timestamp.value)),
    now - normTs(Number(sbtc.timestamp.value)),
    0
  );
  const maxAge = Number(ageJ.value);
  return { price: BigInt(priceJ.value.value), ageSeconds: age, fresh: age <= maxAge, maxAge };
}

/** Loose Stacks principal check (standard or contract), for form validation. */
export function isValidPrincipal(v: string): boolean {
  return /^S[TPMN][0-9A-HJKMNP-Z]{37,40}(\.[a-z]([a-z0-9-]{0,39}))?$/.test(v.trim());
}
