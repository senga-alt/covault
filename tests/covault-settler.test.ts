import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

// Oracle-driven settlement: covault-settler reads a price from an oracle-trait
// source and records it on covault-core as core's authorized `oracle`. Proves
// M2's "settles from an on-chain price, no manual entry" without touching the
// deployed core contract.

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const writer = accounts.get("wallet_1")!;
const anyone = accounts.get("wallet_2")!; // settlement is permissionless

const SBTC = "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token";
const CORE = "covault-core";
const SETTLER = "covault-settler";
const MOCK = "mock-oracle";
const settlerPrincipal = `${deployer}.covault-settler`;
const mockPrincipal = `${deployer}.mock-oracle`;
const sbtcArg = Cl.some(Cl.principal(SBTC));
const oracleArg = Cl.principal(mockPrincipal); // <oracle-trait> argument

const ERR_NOT_ORACLE = 101;
const ERR_NOT_EXPIRED = 105;
const ERR_ALREADY_SETTLED = 106;
const ERR_NO_ORACLE = 201;

// price the mock reports for a label, in the series' collateral units (sats-per-STX here)
function setMockPrice(label: string, price: number) {
  simnet.callPublicFn(MOCK, "set-price", [Cl.stringAscii(label), Cl.uint(price)], deployer);
}

// full wiring: mock <- settler <- core.oracle
function wireAll() {
  simnet.callPublicFn(SETTLER, "set-price-oracle", [Cl.principal(mockPrincipal)], deployer);
  simnet.callPublicFn(CORE, "set-oracle", [Cl.principal(settlerPrincipal)], deployer);
}

function createSbtcPut(underlying: string, strike: number, expiryIn: number): number {
  const expiry = simnet.burnBlockHeight + expiryIn;
  const r = simnet.callPublicFn(
    CORE,
    "create-series",
    [sbtcArg, Cl.stringAscii(underlying), Cl.bool(false), Cl.uint(strike), Cl.uint(strike), Cl.uint(expiry)],
    deployer
  );
  return Number((r.result as any).value.value);
}

describe("oracle-driven settlement", () => {
  it("settles an expired series from the on-chain oracle price, permissionlessly", () => {
    setMockPrice("STX-SBTC", 1000);
    wireAll();
    const id = createSbtcPut("STX-SBTC", 2000, 5);
    simnet.mineEmptyBurnBlocks(5);

    // anyone (not the oracle, not the owner) can trigger settlement
    const r = simnet.callPublicFn(SETTLER, "settle-series", [Cl.uint(id), oracleArg], anyone);
    expect(r.result).toBeOk(Cl.uint(1000));

    // quote-payoff reads the recorded settlement: a put at strike 2000 settled at
    // 1000 pays 1000 per contract - proof the on-chain price was written to core.
    const q = simnet.callReadOnlyFn(CORE, "quote-payoff", [Cl.uint(id), Cl.uint(1000)], deployer);
    expect(q.result).toBeOk(Cl.uint(1000));

    // settling again is rejected - the price is recorded, once.
    const again = simnet.callPublicFn(SETTLER, "settle-series", [Cl.uint(id), oracleArg], anyone);
    expect(again.result).toBeErr(Cl.uint(ERR_ALREADY_SETTLED));
  });

  it("drives the correct payoff from the oracle-settled price", () => {
    setMockPrice("STX-SBTC", 1200); // put strike 2000 -> pays 800 per contract
    wireAll();
    const id = createSbtcPut("STX-SBTC", 2000, 5);
    simnet.callPublicFn(CORE, "write-options", [Cl.uint(id), Cl.uint(2), sbtcArg], writer);
    simnet.mineEmptyBurnBlocks(5);

    simnet.callPublicFn(SETTLER, "settle-series", [Cl.uint(id), oracleArg], anyone);

    const ex = simnet.callPublicFn(CORE, "exercise", [Cl.uint(id), Cl.uint(2), sbtcArg], writer);
    expect(ex.result).toBeOk(Cl.uint(1600)); // 2 * (2000 - 1200)
  });

  it("rejects settlement before expiry (core enforces timing)", () => {
    setMockPrice("STX-SBTC", 1000);
    wireAll();
    const id = createSbtcPut("STX-SBTC", 2000, 10);
    const r = simnet.callPublicFn(SETTLER, "settle-series", [Cl.uint(id), oracleArg], anyone);
    expect(r.result).toBeErr(Cl.uint(ERR_NOT_EXPIRED));
  });

  it("fails when the settler has no price oracle configured", () => {
    const id = createSbtcPut("STX-SBTC", 2000, 5);
    simnet.mineEmptyBurnBlocks(5);
    const r = simnet.callPublicFn(SETTLER, "settle-series", [Cl.uint(id), oracleArg], anyone);
    expect(r.result).toBeErr(Cl.uint(ERR_NO_ORACLE));
  });

  it("fails when the settler is not core's authorized oracle", () => {
    setMockPrice("STX-SBTC", 1000);
    // configure the settler's price source, but do NOT point core.oracle at the settler
    simnet.callPublicFn(SETTLER, "set-price-oracle", [Cl.principal(mockPrincipal)], deployer);
    const id = createSbtcPut("STX-SBTC", 2000, 5);
    simnet.mineEmptyBurnBlocks(5);
    const r = simnet.callPublicFn(SETTLER, "settle-series", [Cl.uint(id), oracleArg], anyone);
    expect(r.result).toBeErr(Cl.uint(ERR_NOT_ORACLE)); // core rejects the unauthorized caller
  });
});

// DIA-backed settlement: the real price source. mock-dia stands in for DIA in
// tests; production passes the deployed DIA principal (testnet ST1S5..., mainnet
// SP1G48...), which conforms to dia-trait structurally.
const MOCK_DIA = "mock-dia";
const diaArg = Cl.principal(`${deployer}.mock-dia`);
const ERR_UNSUPPORTED_PAIR = 204;
const ERR_BAD_PRICE = 205;

// live-scale DIA values (8-decimal): STX ~ $0.20, sBTC ~ $50,000
function pinDia() {
  simnet.callPublicFn(SETTLER, "set-dia-oracle", [Cl.principal(`${deployer}.mock-dia`)], deployer);
}

function setDia(stxUsd: number, sbtcUsd: number) {
  simnet.callPublicFn(MOCK_DIA, "set-value", [Cl.stringAscii("STX/USD"), Cl.uint(stxUsd)], deployer);
  simnet.callPublicFn(MOCK_DIA, "set-value", [Cl.stringAscii("sBTC/USD"), Cl.uint(sbtcUsd)], deployer);
}

describe("DIA price derivation", () => {
  it("derives sats-per-STX for a STX-SBTC series", () => {
    // 0.20 USD/STX / 50000 USD/sBTC * 1e8 sats = 400 sats per STX
    const r = simnet.callReadOnlyFn(
      SETTLER, "derive-price",
      [Cl.stringAscii("STX-SBTC"), Cl.uint(20_000_000), Cl.uint(5_000_000_000_000)], deployer
    );
    expect(r.result).toBeOk(Cl.uint(400));
  });

  it("derives microSTX-per-sBTC for a SBTC-STX series", () => {
    // 50000 / 0.20 = 250,000 STX = 250,000,000,000 uSTX per sBTC
    const r = simnet.callReadOnlyFn(
      SETTLER, "derive-price",
      [Cl.stringAscii("SBTC-STX"), Cl.uint(20_000_000), Cl.uint(5_000_000_000_000)], deployer
    );
    expect(r.result).toBeOk(Cl.uint(250_000_000_000));
  });

  it("rejects an unsupported pair and a zero price", () => {
    expect(
      simnet.callReadOnlyFn(SETTLER, "derive-price", [Cl.stringAscii("DOGE-STX"), Cl.uint(1), Cl.uint(1)], deployer).result
    ).toBeErr(Cl.uint(ERR_UNSUPPORTED_PAIR));
    expect(
      simnet.callReadOnlyFn(SETTLER, "derive-price", [Cl.stringAscii("STX-SBTC"), Cl.uint(0), Cl.uint(1)], deployer).result
    ).toBeErr(Cl.uint(ERR_BAD_PRICE));
  });
});

describe("DIA-backed settlement", () => {
  it("settles a series from DIA and drives the right payoff", () => {
    setDia(20_000_000, 5_000_000_000_000); // -> 400 sats per STX
    pinDia();
    simnet.callPublicFn(CORE, "set-oracle", [Cl.principal(settlerPrincipal)], deployer);
    const id = createSbtcPut("STX-SBTC", 1000, 5); // strike 1000 sats
    simnet.callPublicFn(CORE, "write-options", [Cl.uint(id), Cl.uint(1), sbtcArg], writer);
    simnet.mineEmptyBurnBlocks(5);

    const r = simnet.callPublicFn(SETTLER, "settle-from-dia", [Cl.uint(id), diaArg], anyone);
    expect(r.result).toBeOk(Cl.uint(400)); // derived from DIA, no manual entry

    // put strike 1000 settled at 400 -> pays 600 per contract
    const ex = simnet.callPublicFn(CORE, "exercise", [Cl.uint(id), Cl.uint(1), sbtcArg], writer);
    expect(ex.result).toBeOk(Cl.uint(600));
  });

  it("rejects DIA settlement before expiry", () => {
    setDia(20_000_000, 5_000_000_000_000);
    pinDia();
    simnet.callPublicFn(CORE, "set-oracle", [Cl.principal(settlerPrincipal)], deployer);
    const id = createSbtcPut("STX-SBTC", 1000, 10);
    const r = simnet.callPublicFn(SETTLER, "settle-from-dia", [Cl.uint(id), diaArg], anyone);
    expect(r.result).toBeErr(Cl.uint(ERR_NOT_EXPIRED));
  });
});

describe("DIA freshness window", () => {
  const ERR_STALE_PRICE = 206;
  const ERR_NOT_OWNER = 200;

  it("rejects settlement when a feed value is older than max-price-age", () => {
    // STX/USD pinned to unix epoch 1 second = ancient; sBTC/USD fresh
    simnet.callPublicFn(MOCK_DIA, "set-value-at", [Cl.stringAscii("STX/USD"), Cl.uint(20_000_000), Cl.uint(1)], deployer);
    simnet.callPublicFn(MOCK_DIA, "set-value", [Cl.stringAscii("sBTC/USD"), Cl.uint(5_000_000_000_000)], deployer);
    pinDia();
    simnet.callPublicFn(CORE, "set-oracle", [Cl.principal(settlerPrincipal)], deployer);
    const id = createSbtcPut("STX-SBTC", 1000, 5);
    simnet.mineEmptyBurnBlocks(5);

    const r = simnet.callPublicFn(SETTLER, "settle-from-dia", [Cl.uint(id), diaArg], anyone);
    expect(r.result).toBeErr(Cl.uint(ERR_STALE_PRICE));

    // series stays unsettled: fail closed, nothing pays out on a stale price
    const s = simnet.callReadOnlyFn(CORE, "get-series", [Cl.uint(id)], anyone);
    expect((s.result as any).value.value["settled"]).toEqual(Cl.bool(false));
  });

  it("settles once the feed is fresh again", () => {
    simnet.callPublicFn(MOCK_DIA, "set-value-at", [Cl.stringAscii("STX/USD"), Cl.uint(20_000_000), Cl.uint(1)], deployer);
    simnet.callPublicFn(MOCK_DIA, "set-value", [Cl.stringAscii("sBTC/USD"), Cl.uint(5_000_000_000_000)], deployer);
    pinDia();
    simnet.callPublicFn(CORE, "set-oracle", [Cl.principal(settlerPrincipal)], deployer);
    const id = createSbtcPut("STX-SBTC", 1000, 5);
    simnet.mineEmptyBurnBlocks(5);
    expect(
      simnet.callPublicFn(SETTLER, "settle-from-dia", [Cl.uint(id), diaArg], anyone).result
    ).toBeErr(Cl.uint(ERR_STALE_PRICE));

    // feed resumes: same series settles permissionlessly with no other change
    simnet.callPublicFn(MOCK_DIA, "set-value", [Cl.stringAscii("STX/USD"), Cl.uint(20_000_000)], deployer);
    const r = simnet.callPublicFn(SETTLER, "settle-from-dia", [Cl.uint(id), diaArg], anyone);
    expect(r.result).toBeOk(Cl.uint(400));
  });

  it("future-dated timestamps count as fresh (block time can trail a push)", () => {
    const farFuture = 4_000_000_000; // year 2096, > any simnet block time
    simnet.callPublicFn(MOCK_DIA, "set-value-at", [Cl.stringAscii("STX/USD"), Cl.uint(20_000_000), Cl.uint(farFuture)], deployer);
    simnet.callPublicFn(MOCK_DIA, "set-value", [Cl.stringAscii("sBTC/USD"), Cl.uint(5_000_000_000_000)], deployer);
    pinDia();
    simnet.callPublicFn(CORE, "set-oracle", [Cl.principal(settlerPrincipal)], deployer);
    const id = createSbtcPut("STX-SBTC", 1000, 5);
    simnet.mineEmptyBurnBlocks(5);

    const r = simnet.callPublicFn(SETTLER, "settle-from-dia", [Cl.uint(id), diaArg], anyone);
    expect(r.result).toBeOk(Cl.uint(400));
  });

  it("only the owner can change max-price-age, and zero is rejected", () => {
    expect(
      simnet.callPublicFn(SETTLER, "set-max-price-age", [Cl.uint(60)], anyone).result
    ).toBeErr(Cl.uint(ERR_NOT_OWNER));
    expect(
      simnet.callPublicFn(SETTLER, "set-max-price-age", [Cl.uint(0)], deployer).result
    ).toBeErr(Cl.uint(205)); // ERR-BAD-PRICE guards a zero window
    expect(
      simnet.callPublicFn(SETTLER, "set-max-price-age", [Cl.uint(3600)], deployer).result
    ).toBeOk(Cl.bool(true));
    const age = simnet.callReadOnlyFn(SETTLER, "get-max-price-age", [], anyone);
    expect(age.result).toEqual(Cl.uint(3600));
  });
});

describe("DIA principal pinning", () => {
  const ERR_NO_ORACLE = 201;
  const ERR_WRONG_ORACLE = 202;

  it("rejects settlement when no DIA principal is pinned", () => {
    setDia(20_000_000, 5_000_000_000_000);
    simnet.callPublicFn(CORE, "set-oracle", [Cl.principal(settlerPrincipal)], deployer);
    const id = createSbtcPut("STX-SBTC", 1000, 5);
    simnet.mineEmptyBurnBlocks(5);
    const r = simnet.callPublicFn(SETTLER, "settle-from-dia", [Cl.uint(id), diaArg], anyone);
    expect(r.result).toBeErr(Cl.uint(ERR_NO_ORACLE));
  });

  it("rejects a lookalike oracle that is not the pinned DIA principal", () => {
    setDia(20_000_000, 5_000_000_000_000);
    // pin a DIFFERENT principal than the one passed in
    simnet.callPublicFn(SETTLER, "set-dia-oracle", [Cl.principal(`${deployer}.mock-oracle`)], deployer);
    simnet.callPublicFn(CORE, "set-oracle", [Cl.principal(settlerPrincipal)], deployer);
    const id = createSbtcPut("STX-SBTC", 1000, 5);
    simnet.mineEmptyBurnBlocks(5);
    const r = simnet.callPublicFn(SETTLER, "settle-from-dia", [Cl.uint(id), diaArg], anyone);
    expect(r.result).toBeErr(Cl.uint(ERR_WRONG_ORACLE));
    // fail closed: series stays unsettled
    const s = simnet.callReadOnlyFn(CORE, "get-series", [Cl.uint(id)], anyone);
    expect((s.result as any).value.value["settled"]).toEqual(Cl.bool(false));
  });

  it("only the owner can pin the DIA principal", () => {
    const r = simnet.callPublicFn(SETTLER, "set-dia-oracle", [Cl.principal(`${deployer}.mock-dia`)], anyone);
    expect(r.result).toBeErr(Cl.uint(200)); // ERR-NOT-OWNER
  });
});
