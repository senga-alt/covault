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