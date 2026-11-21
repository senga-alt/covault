/**
 * Covault lifecycle script.
 *
 * Drives the deployed covault-core contract end to end on testnet, in either collateral
 * asset: native STX (default - needs only testnet STX) or sBTC (needs testnet sBTC in the
 * sender's wallet). The deployer acts as owner, writer, oracle, and holder, which is enough
 * to demonstrate the full lifecycle and the conservation invariant
 * (payoff + leftover == collateral) on-chain.
 *
 * Select the asset with --asset=stx (default) or --asset=sbtc on any command.
 *
 * Every transaction is sent in deny mode with exact post-conditions, as the dApp does: it
 * aborts on-chain unless each token movement matches the amount computed here from the
 * series and offer on chain. Add --dry-run to a single command to build and sign the
 * transaction and print its post-conditions without broadcasting it.
 *
 * Usage (after `npm install` and copying .env.example to .env):
 *   npm run lifecycle -- whoami
 *   npm run lifecycle -- balance
 *   npm run lifecycle -- create <strike> <expiryBurnBlocksAhead> [--asset=sbtc] [--underlying=STX-USD]
 *   npm run lifecycle -- status <id>
 *   npm run lifecycle -- write <id> <qty> [--asset=sbtc]
 *   npm run lifecycle -- list <id> <qty> <price>            # sell part of your long
 *   npm run lifecycle -- fill <offerId> <qty> [--asset=sbtc] # buy from an open offer
 *   npm run lifecycle -- cancel <offerId>
 *   npm run lifecycle -- settle <id> <price>
 *   npm run lifecycle -- exercise <id> <qty> [--asset=sbtc]
 *   npm run lifecycle -- reclaim <id> <qty> [--asset=sbtc]
 *   npm run lifecycle -- demo [--asset=sbtc]   # create + write, wait for expiry, settle + exercise + reclaim
 *   npm run lifecycle -- exercise <id> <qty> --dry-run   # any single command: print, do not send
 *
 * Units are the asset's smallest units: microSTX for STX, sats for sBTC.
 * IMPORTANT: the --asset flag must match the series' collateral asset, or the contract
 * returns ERR-WRONG-TOKEN (u110).
 */

import "dotenv/config";
import {
  Cl,
  ClarityValue,
  cvToJSON,
  fetchCallReadOnlyFunction,
  makeContractCall,
  broadcastTransaction,
  Pc,
  PostCondition,
  PostConditionMode,
} from "@stacks/transactions";
import { generateWallet, getStxAddress } from "@stacks/wallet-sdk";

// ---------------------------------------------------------------------------
// config
// ---------------------------------------------------------------------------

const NETWORK = (process.env.NETWORK ?? "testnet") as "testnet" | "mainnet";
const CONTRACT_ADDRESS = required("CONTRACT_ADDRESS");
const CONTRACT_NAME = process.env.CONTRACT_NAME ?? "covault-core";
const MNEMONIC = required("MNEMONIC");
const CORE = `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`;
const API = NETWORK === "mainnet" ? "https://api.hiro.so" : "https://api.testnet.hiro.so";

// Canonical sBTC per network (Clarinet remaps the same way at deploy time).
const SBTC_CONTRACT =
  NETWORK === "mainnet"
    ? "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token"
    : "ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token";

// --asset=stx (default) | --asset=sbtc, allowed on any command.
type Asset = "stx" | "sbtc";
const ASSET: Asset = process.argv.includes("--asset=sbtc") ? "sbtc" : "stx";

// --dry-run builds and signs the transaction, prints its post-conditions, and stops
// before broadcasting. Single commands only.
const DRY_RUN = process.argv.includes("--dry-run");

// --underlying=NAME sets the series' underlying pair label (<= 16 printable ASCII chars,
// the contract's string-ascii limit). NOT just cosmetic: covault-settler derives the
// settlement price from this exact string, and it knows only two pairs -
//   STX-SBTC (sBTC collateral, sats per STX) and SBTC-STX (STX collateral, uSTX per sBTC).
// Any other label renders fine in the registry but settle-from-dia will reject it;
// only the owner's manual settle path can close such a series.
const UNDERLYING: string = (() => {
  const flag = process.argv.find((a) => a.startsWith("--underlying="));
  const name = flag ? flag.slice("--underlying=".length) : ASSET === "sbtc" ? "STX-SBTC" : "SBTC-STX";
  if (name.length === 0 || name.length > 16 || !/^[\x20-\x7E]+$/.test(name)) {
    console.error(`--underlying must be 1-16 printable ASCII characters, got "${name}"`);
    process.exit(1);
  }
  if (name !== "STX-SBTC" && name !== "SBTC-STX") {
    console.warn(
      `warning: "${name}" is not a DIA pair label (STX-SBTC | SBTC-STX); settle-from-dia will reject this series.`
    );
  }
  return name;
})();

const ARGS = process.argv.slice(2).filter((a) => !a.startsWith("--"));

// The `(optional <sip010>)` token argument the contract expects for this asset.
const tokenArg = () => (ASSET === "sbtc" ? Cl.some(Cl.principal(SBTC_CONTRACT)) : Cl.none());
const UNIT = ASSET === "sbtc" ? "sats" : "uSTX";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name} (copy scripts/.env.example to scripts/.env)`);
  return v;
}

// ---------------------------------------------------------------------------
// wallet
// ---------------------------------------------------------------------------

async function loadSender(): Promise<{ address: string; privateKey: string }> {
  const wallet = await generateWallet({ secretKey: MNEMONIC, password: "" });
  const account = wallet.accounts[0];
  const address = getStxAddress({ account, network: NETWORK });
  return { address, privateKey: account.stxPrivateKey };
}

// ---------------------------------------------------------------------------
// chain helpers
// ---------------------------------------------------------------------------

async function readOnly(fn: string, args: ClarityValue[], sender: string): Promise<any> {
  const cv = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: fn,
    functionArgs: args,
    senderAddress: sender,
    network: NETWORK,
  });
  return cvToJSON(cv);
}

// Deny mode, as in the dApp: the transaction aborts on-chain unless every token movement
// is covered by `postConditions` at exactly the stated amount. Calls that move no tokens
// pass an empty list, so any unexpected transfer aborts them too.
async function callPublic(fn: string, args: ClarityValue[], postConditions: PostCondition[]): Promise<string> {
  const { privateKey } = await loadSender();
  const tx = await makeContractCall({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: fn,
    functionArgs: args,
    senderKey: privateKey,
    network: NETWORK,
    postConditionMode: PostConditionMode.Deny,
    postConditions,
  });
  if (DRY_RUN) {
    console.log(`  -> ${fn} built and signed, not broadcast (--dry-run)`);
    console.log(
      postConditions.length
        ? `     post-conditions: ${JSON.stringify(postConditions, (_, v) => (typeof v === "bigint" ? v.toString() : v))}`
        : "     post-conditions: none (the call must move no tokens)"
    );
    return "";
  }
  const res = await broadcastTransaction({ transaction: tx, network: NETWORK });
  if ("error" in res && res.error) {
    throw new Error(`broadcast failed: ${res.error} ${(res as any).reason ?? ""}`);
  }
  const txid = (res as any).txid as string;
  console.log(`  -> ${fn} broadcast: ${txid}`);
  console.log(`     https://explorer.hiro.so/txid/${txid}?chain=${NETWORK}`);
  return txid;
}

async function waitForTx(txid: string, label: string): Promise<void> {
  if (DRY_RUN) return;
  process.stdout.write(`  waiting for ${label} to confirm`);
  for (let i = 0; i < 120; i++) {
    const r = await fetch(`${API}/extended/v1/tx/0x${txid.replace(/^0x/, "")}`);
    if (r.ok) {
      const j = (await r.json()) as any;
      if (j.tx_status === "success") {
        console.log(`\n  confirmed: ${label} (${j.tx_result?.repr ?? "ok"})`);
        return;
      }
      if (typeof j.tx_status === "string" && j.tx_status.startsWith("abort")) {
        throw new Error(`\n  ${label} failed on-chain: ${j.tx_status} ${j.tx_result?.repr ?? ""}`);
      }
    }
    process.stdout.write(".");
    await sleep(5000);
  }
  throw new Error(`\n  timed out waiting for ${label} (${txid})`);
}

async function getBurnHeight(): Promise<number> {
  const r = await fetch(`${API}/v2/info`);
  const j = (await r.json()) as any;
  return j.burn_block_height as number;
}

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

// ---------------------------------------------------------------------------
// post-conditions
// ---------------------------------------------------------------------------

interface SeriesInfo {
  isCall: boolean;
  strike: bigint;
  maxPayoff: bigint;
  settled: boolean;
  settlementPrice: bigint;
}

// Read a series and confirm --asset matches its collateral, so post-conditions name the
// token the contract will actually move.
async function getSeries(id: number): Promise<SeriesInfo> {
  const { address } = await loadSender();
  const r = await readOnly("get-series", [Cl.uint(id)], address);
  if (r.value === null) throw new Error(`series ${id} does not exist`);
  const f = r.value.value;
  const quote = f["quote-token"].value; // null = native STX, else the SIP-010 principal
  const asset: Asset | null = quote === null ? "stx" : quote.value === SBTC_CONTRACT ? "sbtc" : null;
  if (asset === null) throw new Error(`series ${id} is collateralized in ${quote.value}, which this script does not handle`);
  if (asset !== ASSET) throw new Error(`series ${id} is collateralized in ${asset.toUpperCase()}; rerun with --asset=${asset}`);
  return {
    isCall: f["is-call"].value,
    strike: BigInt(f.strike.value),
    maxPayoff: BigInt(f["max-payoff"].value),
    settled: f.settled.value,
    settlementPrice: BigInt(f["settlement-price"].value),
  };
}

// Mirror of the contract's calc-payoff: intrinsic value, capped at max-payoff.
function payoffPerContract(s: SeriesInfo): bigint {
  const p = s.settlementPrice;
  const intrinsic = s.isCall ? (p > s.strike ? p - s.strike : 0n) : s.strike > p ? s.strike - p : 0n;
  return intrinsic > s.maxPayoff ? s.maxPayoff : intrinsic;
}

// `principal` sends exactly `amount` of the selected asset (the dApp's sendExactPc).
function sendExactPc(principal: string, amount: bigint): PostCondition {
  return ASSET === "sbtc"
    ? Pc.principal(principal).willSendEq(amount).ft(SBTC_CONTRACT as `${string}.${string}`, "sbtc-token")
    : Pc.principal(principal).willSendEq(amount).ustx();
}

// ---------------------------------------------------------------------------
// commands
// ---------------------------------------------------------------------------

async function whoami() {
  const { address } = await loadSender();
  console.log(`network:  ${NETWORK}`);
  console.log(`contract: ${CONTRACT_ADDRESS}.${CONTRACT_NAME}`);
  console.log(`sender:   ${address}`);
  console.log(`asset:    ${ASSET}${ASSET === "sbtc" ? ` (${SBTC_CONTRACT})` : ""}`);
  console.log(`burn height: ${await getBurnHeight()}`);
  const cfg = await readOnly("get-config", [], address);
  console.log("get-config:", JSON.stringify(cfg.value, null, 2));
}

// Show the sender's STX and sBTC balances (sanity check before an sBTC demo).
async function balance() {
  const { address } = await loadSender();
  const r = await fetch(`${API}/extended/v1/address/${address}/balances`);
  const j = (await r.json()) as any;
  console.log(`address: ${address}`);
  console.log(`STX:  ${j.stx?.balance ?? "0"} uSTX`);
  const sbtcKey = Object.keys(j.fungible_tokens ?? {}).find((k) => k.startsWith(SBTC_CONTRACT));
  console.log(`sBTC: ${sbtcKey ? j.fungible_tokens[sbtcKey].balance : "0"} sats`);
}

// Create a cash-secured put in the selected asset: strike == max-payoff (collateral == strike).
async function create(strike: number, expiryAhead: number): Promise<{ id: number; expiry: number }> {
  const { address } = await loadSender();
  const countBefore = Number((await readOnly("get-series-count", [], address)).value);
  const expiry = (await getBurnHeight()) + expiryAhead;
  console.log(`Creating ${ASSET.toUpperCase()} put "${UNDERLYING}": strike=${strike} ${UNIT}, expiry=burn#${expiry} (id will be ${countBefore})`);
  // Creating a series moves no tokens.
  const txid = await callPublic("create-series", [
    tokenArg(), // none = native STX, (some sbtc-token) = sBTC collateral
    Cl.stringAscii(UNDERLYING),
    Cl.bool(false), // put
    Cl.uint(strike),
    Cl.uint(strike), // put: max-payoff == strike
    Cl.uint(expiry),
  ], []);
  await waitForTx(txid, "create-series");
  return { id: countBefore, expiry };
}

async function status(id: number) {
  const { address } = await loadSender();
  const s = await readOnly("get-series", [Cl.uint(id)], address);
  const long = await readOnly("get-long", [Cl.uint(id), Cl.principal(address)], address);
  const short = await readOnly("get-short", [Cl.uint(id), Cl.principal(address)], address);
  const burn = await getBurnHeight();
  console.log(`series ${id}:`, JSON.stringify(s.value, null, 2));
  console.log(`your long: ${long.value}  your short: ${short.value}`);
  console.log(`burn height: ${burn}`);
}

async function write(id: number, qty: number) {
  const s = await getSeries(id);
  const { address } = await loadSender();
  // The writer locks max-payoff per contract as collateral.
  const collateral = BigInt(qty) * s.maxPayoff;
  const txid = await callPublic("write-options", [Cl.uint(id), Cl.uint(qty), tokenArg()], [
    sendExactPc(address, collateral),
  ]);
  await waitForTx(txid, `write ${qty}`);
}

async function settle(id: number, price: number) {
  // Recording a price moves no tokens.
  const txid = await callPublic("settle", [Cl.uint(id), Cl.uint(price)], []);
  await waitForTx(txid, `settle @ ${price}`);
}

// List `qty` of your long position for sale at `price` per contract (collateral units).
// Longs are an internal balance, so listing moves no tokens.
async function list(id: number, qty: number, price: number) {
  const countBefore = Number((await readOnly("get-offer-count", [], (await loadSender()).address)).value);
  const txid = await callPublic("list-offer", [Cl.uint(id), Cl.uint(qty), Cl.uint(price)], []);
  await waitForTx(txid, `list ${qty} @ ${price} (offer id will be ${countBefore})`);
}

// Buy `qty` contracts from an open offer. Premium moves in the series' collateral
// asset, so run with the matching --asset flag when the series is sBTC-collateralized.
async function fill(offerId: number, qty: number) {
  const { address } = await loadSender();
  const o = await readOnly("get-offer", [Cl.uint(offerId)], address);
  if (o.value === null) throw new Error(`offer ${offerId} does not exist`);
  const offer = o.value.value;
  await getSeries(Number(offer["series-id"].value)); // confirms --asset matches the series
  const feeBps = BigInt((await readOnly("get-config", [], address)).value["fee-bps"].value);
  // The buyer pays the premium to the maker plus any taker fee, using the contract's floor
  // division. One aggregate post-condition covers both, as in the dApp.
  const cost = BigInt(qty) * BigInt(offer.price.value);
  const total = cost + (cost * feeBps) / 10000n;
  const txid = await callPublic("fill-offer", [Cl.uint(offerId), Cl.uint(qty), tokenArg()], [
    sendExactPc(address, total),
  ]);
  await waitForTx(txid, `fill offer ${offerId} x${qty}`);
}

async function cancel(offerId: number) {
  // Escrowed longs return to the maker as an internal balance; no tokens move.
  const txid = await callPublic("cancel-offer", [Cl.uint(offerId)], []);
  await waitForTx(txid, `cancel offer ${offerId}`);
}

// The contract pays exercise and reclaim from escrow. A zero amount makes no transfer,
// so it carries no post-condition.
async function exercise(id: number, qty: number) {
  const s = await getSeries(id);
  if (!s.settled) throw new Error(`series ${id} is not settled yet`);
  const amount = BigInt(qty) * payoffPerContract(s);
  const txid = await callPublic(
    "exercise",
    [Cl.uint(id), Cl.uint(qty), tokenArg()],
    amount > 0n ? [sendExactPc(CORE, amount)] : []
  );
  await waitForTx(txid, `exercise ${qty}`);
}

async function reclaim(id: number, qty: number) {
  const s = await getSeries(id);
  if (!s.settled) throw new Error(`series ${id} is not settled yet`);
  const amount = BigInt(qty) * (s.maxPayoff - payoffPerContract(s));
  const txid = await callPublic(
    "reclaim",
    [Cl.uint(id), Cl.uint(qty), tokenArg()],
    amount > 0n ? [sendExactPc(CORE, amount)] : []
  );
  await waitForTx(txid, `reclaim ${qty}`);
}

async function waitForExpiry(expiry: number) {
  console.log(`Waiting for burn height to reach expiry (#${expiry}). Testnet burn blocks are ~10 min.`);
  for (;;) {
    const burn = await getBurnHeight();
    process.stdout.write(`  burn ${burn} / ${expiry}\r`);
    if (burn >= expiry) break;
    await sleep(30000);
  }
  console.log(`\n  reached expiry (#${expiry}).`);
}

// Full lifecycle on one account: create + write, wait for expiry, settle + exercise + reclaim.
// Sizing: 1 STX strike for the STX demo; 10,000 sats (0.0001 BTC) for the sBTC demo.
async function demo() {
  const strike = ASSET === "sbtc" ? 10_000 : 1_000_000;
  const settlePrice = (strike * 6) / 10; // settle below strike -> put pays 40% of strike
  const payoff = strike - settlePrice;
  if (ASSET === "sbtc") {
    console.log(`sBTC demo: you need at least ${strike} sats of testnet sBTC (check with 'balance').`);
  }
  const { id, expiry } = await create(strike, 2); // expire ~2 burn blocks ahead
  await write(id, 1); // lock collateral, mint 1 long + 1 short
  await waitForExpiry(expiry);
  await settle(id, settlePrice);
  await exercise(id, 1); // holder receives payoff
  await reclaim(id, 1); // writer receives leftover
  console.log(`\nDemo complete. payoff (${payoff}) + leftover (${settlePrice}) == collateral (${strike}) ${UNIT}.`);
  await status(id);
}

// ---------------------------------------------------------------------------
// entry
// ---------------------------------------------------------------------------

async function main() {
  const [cmd, ...rest] = ARGS;
  const n = (i: number) => Number(rest[i]);
  if (DRY_RUN && cmd === "demo") {
    throw new Error("--dry-run works with single commands; demo needs each step to land before the next.");
  }
  switch (cmd) {
    case "whoami": return whoami();
    case "balance": return balance();
    case "create": { const { id } = await create(n(0), n(1) || 2); console.log(`series id: ${id}`); return; }
    case "status": return status(n(0));
    case "write": return write(n(0), n(1));
    case "settle": return settle(n(0), n(1));
    case "list": return list(n(0), n(1), n(2));
    case "fill": return fill(n(0), n(1));
    case "cancel": return cancel(n(0));
    case "exercise": return exercise(n(0), n(1));
    case "reclaim": return reclaim(n(0), n(1));
    case "demo": return demo();
    default:
      console.log("commands: whoami | balance | create <strike> <expiryAhead> | status <id> | write <id> <qty> | list <id> <qty> <price> | fill <offerId> <qty> | cancel <offerId> | settle <id> <price> | exercise <id> <qty> | reclaim <id> <qty> | demo");
      console.log("flags (any command): --asset=stx (default) | --asset=sbtc | --dry-run (not demo)");
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
