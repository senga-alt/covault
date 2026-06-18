import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

// Covault is collateralized and settled in real sBTC (a project requirement,
// not a mock). Clarinet's sBTC-aware simnet seeds every wallet with a genesis
// sbtc_balance (see settings/Devnet.toml), so tests use real sBTC directly.

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!; // contract owner + default oracle
const writer = accounts.get("wallet_1")!;
const buyer = accounts.get("wallet_2")!;
const other = accounts.get("wallet_3")!;

const SBTC = "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token";
const CORE = "covault-core";
const VAULT = `${deployer}.${CORE}`; // the clearinghouse's own principal (escrow)

// genesis sbtc_balance assigned to each wallet by the simnet
const INIT = 1_000_000_000;

// `token` argument for the contract: (some sBTC) for sBTC series, none for native STX.
const sbtcArg = Cl.some(Cl.principal(SBTC));
const stxArg = Cl.none();

// Assert a wallet's sBTC balance equals genesis +/- a delta.
function expectSbtcDelta(who: string, delta: number) {
  const r = simnet.callReadOnlyFn(SBTC, "get-balance", [Cl.principal(who)], deployer);
  expect(r.result).toBeOk(Cl.uint(INIT + delta));
}
// Assert an absolute sBTC balance (used for the contract, which starts at 0).
function expectSbtcAbs(who: string, amount: number) {
  const r = simnet.callReadOnlyFn(SBTC, "get-balance", [Cl.principal(who)], deployer);
  expect(r.result).toBeOk(Cl.uint(amount));
}
// Native STX balance of a principal (microSTX), via the simnet assets map.
function stxBalance(who: string): bigint {
  return simnet.getAssetsMap().get("STX")?.get(who) ?? 0n;
}

function getLong(id: number, who: string) {
  return simnet.callReadOnlyFn(CORE, "get-long", [Cl.uint(id), Cl.principal(who)], deployer).result;
}
function getShort(id: number, who: string) {
  return simnet.callReadOnlyFn(CORE, "get-short", [Cl.uint(id), Cl.principal(who)], deployer).result;
}

// Create a series and return its numeric id.
function createSeries(opts: {
  isCall: boolean;
  strike: number;
  maxPayoff: number;
  expiryIn?: number;
  underlying?: string;
  sender?: string;
  asset?: "sbtc" | "stx";
}): number {
  const expiry = simnet.burnBlockHeight + (opts.expiryIn ?? 100);
  const tokenCV = opts.asset === "stx" ? stxArg : sbtcArg;
  const r = simnet.callPublicFn(
    CORE,
    "create-series",
    [
      tokenCV,
      Cl.stringAscii(opts.underlying ?? "BTC-USD"),
      Cl.bool(opts.isCall),
      Cl.uint(opts.strike),
      Cl.uint(opts.maxPayoff),
      Cl.uint(expiry),
    ],
    opts.sender ?? deployer
  );
  expect(r.result).toBeOk(expect.anything());
  // (ok uX) -> extract the uint
  return Number((r.result as any).value.value);
}