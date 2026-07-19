import { Link } from "react-router-dom";
import { DocArticle, H2, Callout, CodeBlock, DocTable } from "../ui";

export function Lifecycle() {
  return (
    <DocArticle
      slug="lifecycle"
      title="The lifecycle"
      lead="Every option series moves through the same states. This page walks each step: who acts, what the contract does, and what everyone sees."
    >
      <CodeBlock label="series states">
{`created -> active (writing + trading) -> expired (awaiting price)
        -> settled (claims open forever)`}
      </CodeBlock>

      <H2 id="create">1 - Create a series</H2>
      <p>
        The operator defines a series: collateral asset (sBTC or native STX), type
        (cash-secured put or capped call), strike, collateral per contract, and an expiry
        burn block. For puts the collateral <em>is</em> the strike - a put can never owe
        more. For calls, the payoff is capped at a chosen level above the strike, which is
        exactly what makes a call fully collateralizable in cash.
      </p>
      <p>
        Creation moves no assets. The series simply appears on{" "}
        <Link to="/app">Markets</Link> as active, ready for writers.
      </p>

      <H2 id="write">2 - Write options</H2>
      <p>
        Any wallet can write into an active series: the contract pulls{" "}
        <code>quantity x collateral-per-contract</code> into escrow and mints the writer
        matched <strong>long</strong> and <strong>short</strong> positions.
      </p>
      <Callout title="The mental model">
        <p className="!text-paper-dim">
          Writing mints a pair. The long is the claim (worth the payoff at settlement);
          the short is the obligation plus the right to the leftover collateral. Holding
          both nets out to your collateral back - selling the long for premium is what
          creates the real position.
        </p>
      </Callout>

      <H2 id="trade">3 - Trade</H2>
      <ul>
        <li>
          <strong>List</strong> - a holder escrows some of their longs and posts an ask,
          priced per contract in the series&apos; collateral asset. Listed longs cannot be
          double-sold.
        </li>
        <li>
          <strong>Fill</strong> - a buyer pays the premium directly to the maker and
          receives the longs. Partial fills are fine.
        </li>
        <li>
          <strong>Cancel</strong> - the maker takes an unfilled offer down; escrowed longs
          return.
        </li>
        <li>
          <strong>Transfer</strong> - longs can also be sent directly to another wallet,
          no order book involved.
        </li>
      </ul>

      <H2 id="close-pair">4 - Close a pair (early exit)</H2>
      <p>
        A wallet holding <em>both</em> a long and a short of the same series can burn the
        pair before expiry and reclaim the full collateral immediately. This is how a
        writer unwinds without waiting for settlement - and it works even when new writes
        are paused, because it is an exit.
      </p>

      <H2 id="expiry">5 - Expiry</H2>
      <p>
        Expiry is just a burn-block threshold - no transaction runs at that moment. Once
        passed: writing is blocked, the order book keeps working (longs remain claims on
        the coming settlement), and settlement becomes possible. Nobody is under deadline
        pressure at any point.
      </p>

      <H2 id="settle">6 - Settle</H2>
      <p>
        Anyone triggers settlement; the price is derived on-chain from DIA&apos;s feeds and
        recorded exactly once. The mechanics get their own page:{" "}
        <Link to="/docs/settlement">Settlement</Link>.
      </p>

      <H2 id="claim">7 - Exercise and reclaim</H2>
      <p>
        After settlement, claims are open <strong>forever</strong>:
      </p>
      <ul>
        <li>
          <strong>Exercise</strong> (holders) - burn longs, receive{" "}
          <code>quantity x payoff</code>, where payoff ={" "}
          <code>min(intrinsic value, collateral per contract)</code>.
        </li>
        <li>
          <strong>Reclaim</strong> (writers) - burn shorts, receive{" "}
          <code>quantity x (collateral - payoff)</code>.
        </li>
      </ul>
      <p>
        Payoff plus leftover equals the locked collateral exactly, so when every long is
        exercised and every short reclaimed, the series&apos; escrow returns to zero. To the
        unit. That is the invariant, observed on-chain.
      </p>

      <H2 id="worked-example">A worked example</H2>
      <p>
        An sBTC-collateralized put, strike 300 sats, two contracts written. Settlement
        lands at 257 sats, so payoff = 300 - 257 = 43 and leftover = 257 per contract:
      </p>
      <DocTable>
        <table>
          <thead>
            <tr><th>Event</th><th>Buyer</th><th>Writer</th><th>Escrow</th></tr>
          </thead>
          <tbody>
            <tr><td>Writer writes 2</td><td>-</td><td>locks 600 sats, holds 2L + 2S</td><td>600</td></tr>
            <tr><td>Writer lists 1L at 25; buyer fills</td><td>1L, pays 25 premium</td><td>1L + 2S, receives 25</td><td>600</td></tr>
            <tr><td>Settled at 257</td><td>-</td><td>-</td><td>600</td></tr>
            <tr><td>Buyer exercises 1L</td><td>+43 sats</td><td>-</td><td>557</td></tr>
            <tr><td>Writer exercises 1L</td><td>-</td><td>+43 sats</td><td>514</td></tr>
            <tr><td>Writer reclaims 2S</td><td>-</td><td>+514 sats</td><td>0</td></tr>
          </tbody>
        </table>
      </DocTable>
      <p>
        43 + 43 + 514 = 600: escrow fully conserved. Between the parties it is zero-sum -
        the buyer netted +18 sats (43 payoff minus 25 premium) and the writer -18 (the
        option they sold finished 43 in the money against 25 collected).
      </p>
    </DocArticle>
  );
}
