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