import { NETWORK } from "../../lib/config";
import { Link } from "react-router-dom";
import { DocArticle, H2, Callout } from "../ui";

export function Quickstart() {
  return (
    <DocArticle
      slug="quickstart"
      title="Quickstart"
      lead="From nothing to your first option position, in about ten minutes."
    >
      <H2 id="wallet">1. Get a Stacks wallet</H2>
      <p>
        Covault works with any wallet that speaks the Stacks connect protocol -{" "}
        <a href="https://leather.io" target="_blank" rel="noreferrer">Leather</a> and{" "}
        <a href="https://www.xverse.app" target="_blank" rel="noreferrer">Xverse</a> are the
        common choices. Install one and make sure it is set to{" "}
        <strong>{NETWORK === "mainnet" ? "Mainnet" : "Testnet"}</strong> in its network
        settings - Covault will warn you if the connected address is on the wrong network,
        because transactions would simply fail.
      </p>

      <H2 id="funds">2. Fund it</H2>
      {NETWORK === "mainnet" ? (
        <ul>
          <li>
            <strong>STX</strong> (needed for every transaction fee, and as collateral for
            STX-collateralized series). Available on most exchanges, and on Stacks DEXs
            such as Bitflow and ALEX.
          </li>
          <li>
            <strong>sBTC</strong> (needed to write into, or buy from, sBTC-collateralized
            series). Either bridge Bitcoin through the sBTC deposit flow, or swap STX for
            it on a Stacks DEX. Positions here are denominated in sats, and a series can
            be meaningful at a few thousand sats, so you do not need much.
          </li>
        </ul>
      ) : (
        <ul>
          <li>
            <strong>Testnet STX</strong>:{" "}
            <a href="https://explorer.hiro.so/sandbox/faucet?chain=testnet" target="_blank" rel="noreferrer">
              the Hiro faucet
            </a>{" "}
            sends it free.
          </li>
          <li>
            <strong>Testnet sBTC</strong>: the sBTC testnet bridge issues it.
          </li>
        </ul>
      )}
      <Callout title="Which asset do I actually need?">
        <p className="!text-paper-dim">
          Every transaction costs a small STX fee, so you always need some STX. Beyond
          that, you only need the collateral asset of the series you want to use: sats for
          an sBTC series, STX for an STX series. The Write panel checks your balance and
          tells you before you sign, rather than letting the chain reject it.
        </p>
      </Callout>

      <H2 id="connect">3. Connect and look around</H2>
      <p>
        Open <Link to="/app">the app</Link> and hit <strong>Connect</strong> (top right).
        The Markets page reads the live series registry straight from the contract: strike,
        collateral, best offer, expiry, and status per row. Nothing on these screens is
        off-chain bookkeeping.
      </p>

      <H2 id="first-position">4. Take your first position</H2>
      <p>Two ways in, depending on which side you want:</p>
      <ul>
        <li>
          <strong>Buy an option</strong>: open an active series, find the order book, and
          fill an open offer. You pay the premium (in the series&apos; collateral asset)
          directly to the seller and receive the long position: a claim on the settlement
          payoff. Your maximum loss is the premium, full stop.
        </li>
        <li>
          <strong>Write options</strong>: use the Write panel on an active series. You
          lock <code>quantity x collateral-per-contract</code> into escrow and receive
          matched long and short positions. Sell the longs on the book to collect premium;
          the shorts entitle you to whatever is left of your collateral after settlement.
        </li>
      </ul>
      <Callout title="Every transfer is guarded">
        <p className="!text-paper-dim">
          The app attaches exact-amount post-conditions to every transaction, so your
          wallet shows precisely what will move before you sign, and the transaction
          aborts if the contract tried to move anything else.
        </p>
      </Callout>

      <H2 id="after-expiry">5. After expiry: settle and claim</H2>
      <p>
        Once a series passes its expiry block, anyone can press{" "}
        <strong>Settle from DIA</strong> on its page; the panel previews the exact price
        that would be recorded before you sign. After settlement, holders{" "}
        <strong>exercise</strong> for the payoff and writers <strong>reclaim</strong> the
        leftover, whenever they like. There is no claiming deadline; nothing expires
        worthless by inaction.
      </p>
      <p>
        Your <Link to="/app/portfolio">Portfolio</Link> tracks all of it live: positions per
        series, collateral engaged, and exactly what is claimable right now.
      </p>
    </DocArticle>
  );
}
