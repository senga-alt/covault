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

const ERR_NOT_ORACLE = 101;
const ERR_INVALID_PARAMS = 103;
const ERR_EXPIRED = 104;
const ERR_NOT_EXPIRED = 105;
const ERR_NOT_SETTLED = 107;
const ERR_INSUFFICIENT_LONG = 108;
const ERR_WRONG_TOKEN = 110;

describe("series creation", () => {
  it("creates a put series and assigns sequential ids", () => {
    const id0 = createSeries({ isCall: false, strike: 1000, maxPayoff: 1000 });
    const id1 = createSeries({ isCall: true, strike: 1000, maxPayoff: 500 });
    expect(id0).toBe(0);
    expect(id1).toBe(1);
    expect(simnet.callReadOnlyFn(CORE, "get-series-count", [], deployer).result).toBeUint(2);
  });

  it("rejects a put whose collateral does not equal the strike", () => {
    const r = simnet.callPublicFn(
      CORE,
      "create-series",
      [sbtcArg, Cl.stringAscii("BTC-USD"), Cl.bool(false), Cl.uint(1000), Cl.uint(800),
       Cl.uint(simnet.burnBlockHeight + 100)],
      deployer
    );
    expect(r.result).toBeErr(Cl.uint(ERR_INVALID_PARAMS));
  });

  it("rejects an expiry that is not in the future", () => {
    const r = simnet.callPublicFn(
      CORE,
      "create-series",
      [sbtcArg, Cl.stringAscii("BTC-USD"), Cl.bool(true), Cl.uint(1000), Cl.uint(500),
       Cl.uint(simnet.burnBlockHeight)],
      deployer
    );
    expect(r.result).toBeErr(Cl.uint(ERR_INVALID_PARAMS));
  });
});

describe("writing options", () => {
  it("locks sBTC collateral and mints matched long + short positions", () => {
    const id = createSeries({ isCall: false, strike: 1000, maxPayoff: 1000 });

    const r = simnet.callPublicFn(CORE, "write-options", [Cl.uint(id), Cl.uint(5), sbtcArg], writer);
    expect(r.result).toBeOk(Cl.uint(5000)); // 5 contracts * 1000 collateral

    expect(getLong(id, writer)).toBeUint(5);
    expect(getShort(id, writer)).toBeUint(5);
    expectSbtcDelta(writer, -5_000); // 5000 locked
    expectSbtcAbs(VAULT, 5_000); // escrow holds the collateral
  });

  it("cannot write after expiry", () => {
    const id = createSeries({ isCall: false, strike: 1000, maxPayoff: 1000, expiryIn: 5 });
    simnet.mineEmptyBurnBlocks(5);
    const r = simnet.callPublicFn(CORE, "write-options", [Cl.uint(id), Cl.uint(1), sbtcArg], writer);
    expect(r.result).toBeErr(Cl.uint(ERR_EXPIRED));
  });
});

describe("put lifecycle: write -> sell -> settle -> exercise + reclaim", () => {
  it("pays the holder the intrinsic value and returns the rest to the writer (conservation)", () => {
    const id = createSeries({ isCall: false, strike: 1000, maxPayoff: 1000, expiryIn: 10 });

    // writer mints 5 puts and sells the long side to the buyer
    simnet.callPublicFn(CORE, "write-options", [Cl.uint(id), Cl.uint(5), sbtcArg], writer);
    simnet.callPublicFn(CORE, "transfer-long", [Cl.uint(id), Cl.uint(5), Cl.principal(buyer)], writer);
    expect(getLong(id, buyer)).toBeUint(5);
    expect(getShort(id, writer)).toBeUint(5);

    // exercise before settlement must fail
    const early = simnet.callPublicFn(CORE, "exercise", [Cl.uint(id), Cl.uint(5), sbtcArg], buyer);
    expect(early.result).toBeErr(Cl.uint(ERR_NOT_SETTLED));

    // expire and settle at 600 -> put intrinsic = 1000 - 600 = 400 per contract
    simnet.mineEmptyBurnBlocks(10);
    const settle = simnet.callPublicFn(CORE, "settle", [Cl.uint(id), Cl.uint(600)], deployer);
    expect(settle.result).toBeOk(Cl.bool(true));

    // holder exercises: 5 * 400 = 2000
    const ex = simnet.callPublicFn(CORE, "exercise", [Cl.uint(id), Cl.uint(5), sbtcArg], buyer);
    expect(ex.result).toBeOk(Cl.uint(2000));
    expectSbtcDelta(buyer, +2_000);

    // writer reclaims the remainder: 5 * (1000 - 400) = 3000
    const rc = simnet.callPublicFn(CORE, "reclaim", [Cl.uint(id), Cl.uint(5), sbtcArg], writer);
    expect(rc.result).toBeOk(Cl.uint(3000));
    expectSbtcDelta(writer, -2_000); // -5000 locked + 3000 reclaimed

    // escrow fully drained: payoff + leftover == collateral
    expectSbtcAbs(VAULT, 0);
  });
});

describe("capped call payoff", () => {
  function runCall(settlePrice: number, expectedPayoff: number) {
    // call strike 1000, cap = strike + max-payoff = 1500
    const id = createSeries({ isCall: true, strike: 1000, maxPayoff: 500, expiryIn: 10 });
    simnet.callPublicFn(CORE, "write-options", [Cl.uint(id), Cl.uint(1), sbtcArg], writer);
    simnet.mineEmptyBurnBlocks(10);
    simnet.callPublicFn(CORE, "settle", [Cl.uint(id), Cl.uint(settlePrice)], deployer);
    const ex = simnet.callPublicFn(CORE, "exercise", [Cl.uint(id), Cl.uint(1), sbtcArg], writer);
    expect(ex.result).toBeOk(Cl.uint(expectedPayoff));
  }

  it("pays zero when out of the money", () => runCall(800, 0));
  it("pays the intrinsic value when in the money below the cap", () => runCall(1200, 200));
  it("is capped at max-payoff when deep in the money", () => runCall(2000, 500));
});

describe("quote-payoff read-only", () => {
  it("reports the capped payoff for any price", () => {
    const id = createSeries({ isCall: true, strike: 1000, maxPayoff: 500 });
    expect(simnet.callReadOnlyFn(CORE, "quote-payoff", [Cl.uint(id), Cl.uint(900)], deployer).result).toBeOk(Cl.uint(0));
    expect(simnet.callReadOnlyFn(CORE, "quote-payoff", [Cl.uint(id), Cl.uint(1300)], deployer).result).toBeOk(Cl.uint(300));
    expect(simnet.callReadOnlyFn(CORE, "quote-payoff", [Cl.uint(id), Cl.uint(9999)], deployer).result).toBeOk(Cl.uint(500));
  });
});

describe("order book", () => {
  it("lists, fills, and pays the maker for long positions", () => {
    const id = createSeries({ isCall: false, strike: 1000, maxPayoff: 1000, expiryIn: 50 });

    simnet.callPublicFn(CORE, "write-options", [Cl.uint(id), Cl.uint(3), sbtcArg], writer);
    const list = simnet.callPublicFn(CORE, "list-offer", [Cl.uint(id), Cl.uint(3), Cl.uint(100)], writer);
    expect(list.result).toBeOk(Cl.uint(0)); // offer id 0
    // longs are escrowed in the contract
    expect(getLong(id, writer)).toBeUint(0);
    expect(getLong(id, VAULT)).toBeUint(3);

    const fill = simnet.callPublicFn(CORE, "fill-offer", [Cl.uint(0), Cl.uint(2), sbtcArg], buyer);
    expect(fill.result).toBeOk(Cl.uint(200)); // 2 * 100 premium
    expect(getLong(id, buyer)).toBeUint(2);
    expectSbtcDelta(buyer, -200); // paid 200 premium
    expectSbtcDelta(writer, -3_000 + 200); // -3000 collateral + 200 premium
  });

  it("returns escrowed longs to the maker on cancel", () => {
    const id = createSeries({ isCall: false, strike: 1000, maxPayoff: 1000, expiryIn: 50 });
    simnet.callPublicFn(CORE, "write-options", [Cl.uint(id), Cl.uint(3), sbtcArg], writer);
    simnet.callPublicFn(CORE, "list-offer", [Cl.uint(id), Cl.uint(3), Cl.uint(100)], writer);

    const cancel = simnet.callPublicFn(CORE, "cancel-offer", [Cl.uint(0)], writer);
    expect(cancel.result).toBeOk(Cl.bool(true));
    expect(getLong(id, writer)).toBeUint(3);
    expect(getLong(id, VAULT)).toBeUint(0);
  });
});

describe("close-pair (early netting)", () => {
  it("burns a matched long+short pair and refunds collateral before expiry", () => {
    const id = createSeries({ isCall: false, strike: 1000, maxPayoff: 1000, expiryIn: 50 });
    simnet.callPublicFn(CORE, "write-options", [Cl.uint(id), Cl.uint(4), sbtcArg], writer);
    expectSbtcDelta(writer, -4_000);

    const close = simnet.callPublicFn(CORE, "close-pair", [Cl.uint(id), Cl.uint(4), sbtcArg], writer);
    expect(close.result).toBeOk(Cl.uint(4000));
    expect(getLong(id, writer)).toBeUint(0);
    expect(getShort(id, writer)).toBeUint(0);
    expectSbtcDelta(writer, 0); // fully refunded
    expectSbtcAbs(VAULT, 0);
  });
});

describe("settlement authorization & timing", () => {
  it("rejects settlement before expiry", () => {
    const id = createSeries({ isCall: false, strike: 1000, maxPayoff: 1000, expiryIn: 10 });
    const r = simnet.callPublicFn(CORE, "settle", [Cl.uint(id), Cl.uint(600)], deployer);
    expect(r.result).toBeErr(Cl.uint(ERR_NOT_EXPIRED));
  });

  it("rejects settlement from a non-oracle principal", () => {
    const id = createSeries({ isCall: false, strike: 1000, maxPayoff: 1000, expiryIn: 5 });
    simnet.mineEmptyBurnBlocks(5);
    const r = simnet.callPublicFn(CORE, "settle", [Cl.uint(id), Cl.uint(600)], other);
    expect(r.result).toBeErr(Cl.uint(ERR_NOT_ORACLE));
  });

  it("honors a reassigned oracle", () => {
    const set = simnet.callPublicFn(CORE, "set-oracle", [Cl.principal(other)], deployer);
    expect(set.result).toBeOk(Cl.bool(true));
    const id = createSeries({ isCall: false, strike: 1000, maxPayoff: 1000, expiryIn: 5 });
    simnet.mineEmptyBurnBlocks(5);
    // old oracle (deployer) now rejected
    expect(simnet.callPublicFn(CORE, "settle", [Cl.uint(id), Cl.uint(600)], deployer).result)
      .toBeErr(Cl.uint(ERR_NOT_ORACLE));
    // new oracle accepted
    expect(simnet.callPublicFn(CORE, "settle", [Cl.uint(id), Cl.uint(600)], other).result)
      .toBeOk(Cl.bool(true));
  });
});

describe("native STX collateral", () => {
  it("supports native STX as the settlement asset end-to-end", () => {
    const id = createSeries({
      asset: "stx", isCall: false, strike: 1_000_000, maxPayoff: 1_000_000,
      expiryIn: 10, underlying: "STX-USD",
    });

    const writer0 = stxBalance(writer);
    const buyer0 = stxBalance(buyer);

    // write 3 puts collateralized in native STX, then sell the longs to the buyer
    const w = simnet.callPublicFn(CORE, "write-options", [Cl.uint(id), Cl.uint(3), stxArg], writer);
    expect(w.result).toBeOk(Cl.uint(3_000_000));
    simnet.callPublicFn(CORE, "transfer-long", [Cl.uint(id), Cl.uint(3), Cl.principal(buyer)], writer);
    expect(stxBalance(VAULT)).toBe(3_000_000n); // STX collateral escrowed in the contract

    // expire + settle at 600_000 -> put intrinsic = 400_000 per contract
    simnet.mineEmptyBurnBlocks(10);
    simnet.callPublicFn(CORE, "settle", [Cl.uint(id), Cl.uint(600_000)], deployer);

    const ex = simnet.callPublicFn(CORE, "exercise", [Cl.uint(id), Cl.uint(3), stxArg], buyer);
    expect(ex.result).toBeOk(Cl.uint(1_200_000)); // 3 * 400_000

    const rc = simnet.callPublicFn(CORE, "reclaim", [Cl.uint(id), Cl.uint(3), stxArg], writer);
    expect(rc.result).toBeOk(Cl.uint(1_800_000)); // 3 * (1_000_000 - 400_000)

    expect(stxBalance(VAULT)).toBe(0n); // escrow fully drained
    expect(stxBalance(buyer) - buyer0).toBe(1_200_000n);
    expect(stxBalance(writer) - writer0).toBe(-1_200_000n);
  });

  it("rejects writing an sBTC series without supplying the matching token", () => {
    const id = createSeries({ asset: "sbtc", isCall: false, strike: 1000, maxPayoff: 1000 });
    const r = simnet.callPublicFn(CORE, "write-options", [Cl.uint(id), Cl.uint(1), stxArg], writer);
    expect(r.result).toBeErr(Cl.uint(ERR_WRONG_TOKEN));
  });
});

describe("guards", () => {
  it("cannot exercise more longs than held", () => {
    const id = createSeries({ isCall: false, strike: 1000, maxPayoff: 1000, expiryIn: 5 });
    simnet.callPublicFn(CORE, "write-options", [Cl.uint(id), Cl.uint(1), sbtcArg], writer);
    simnet.mineEmptyBurnBlocks(5);
    simnet.callPublicFn(CORE, "settle", [Cl.uint(id), Cl.uint(600)], deployer);
    const r = simnet.callPublicFn(CORE, "exercise", [Cl.uint(id), Cl.uint(2), sbtcArg], writer);
    expect(r.result).toBeErr(Cl.uint(ERR_INSUFFICIENT_LONG));
  });
});
