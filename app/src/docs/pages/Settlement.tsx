import { DocArticle, H2, Callout, CodeBlock, DocTable } from "../ui";

export function Settlement() {
  return (
    <DocArticle
      slug="settlement"
      title="Settlement"
      lead="One price per series, recorded once, derived on-chain from DIA's feeds at the moment it settles. Anyone can trigger it; no caller can supply the price."
    >
      <H2 id="who-settles">Who settles</H2>
      <p>
        Anyone. Once a series passes its expiry block, its page shows{" "}
        <strong>Settle from DIA</strong> to every connected wallet. The transaction goes
        through a small settler contract that is the clearinghouse&apos;s sole authorized
        oracle. The caller contributes only gas; there is no code path in which a caller
        supplies a price or a price source.
      </p>

      <H2 id="timing">When the price is taken</H2>
      <p>
        The settlement price is not the price at the expiry block. It comes from the DIA
        quotes current when the first settlement transaction lands, at any time after
        expiry. If a series expires at noon and the first settlement lands at 3 pm, the
        payout is calculated from the 3 pm quotes.
      </p>
      <ul>
        <li>
          Whoever settles first after expiry decides when the price is taken. If you hold
          or wrote an option and want the price closest to expiry, settle as soon as the
          series expires rather than leave the timing to the other side.
        </li>
        <li>
          The settle panel previews the price at that moment. If DIA publishes a new quote
          before your transaction is included in a block, the recorded price uses the newer
          quote.
        </li>
      </ul>

      <H2 id="cross-rate">The price, in collateral units</H2>
      <p>
        Covault contracts are denominated in their collateral asset (sats or microSTX)
        and USD never enters the math. DIA publishes USD quotes; the settler derives the
        cross-rate on-chain:
      </p>
      <CodeBlock label="cross-rate derivation (8-decimal DIA values)">
{`sBTC-collateralized (STX-SBTC):
  price = stx_usd * 100,000,000 / btc_usd      -> sats per STX

STX-collateralized (SBTC-STX):
  price = btc_usd * 1,000,000 / stx_usd        -> microSTX per sBTC`}
      </CodeBlock>
      <p>
        Integer floor division truncates at most one unit, orders of magnitude below the
        feed&apos;s own deviation threshold, applied identically to every series.
      </p>

      <H2 id="freshness">Freshness: fail closed</H2>
      <p>
        Each DIA quote carries a timestamp. The settler normalizes it (some deployments
        report milliseconds), compares it to the current Stacks block time, and refuses to
        settle if either feed is older than the freshness window (default six hours):
      </p>
      <ul>
        <li>Stale feeds mean the series simply stays unsettled; it never settles on a bad price.</li>
        <li>
          Claims never expire: exercising and reclaiming have no deadline. Waiting does
          change the price, though, because settlement uses the quotes current when it lands.
        </li>
        <li>The app previews the current price and feed age before you sign, and disables the button while feeds are stale.</li>
      </ul>

      <H2 id="preview">What the preview shows</H2>
      <p>
        The &quot;Would record N from feeds Xs old&quot; line in the settle panel calls the
        settler&apos;s own read-only derivation with the live feeds, the same code that runs
        in the transaction, so the math cannot disagree. The inputs can: if DIA publishes a
        new quote before your transaction lands, the recorded price uses that quote.
      </p>

      <H2 id="bounded">What a bad price can and cannot do</H2>
      <DocTable>
        <table>
          <thead>
            <tr><th>Scenario</th><th>Consequence</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Feed goes quiet</td>
              <td>Settlement waits (fail closed). Anyone can retry after the next update.</td>
            </tr>
            <tr>
              <td>Feed reports a wrong price</td>
              <td>
                Bounded by construction: one price affects only the series it settles, and
                no payoff can exceed that series&apos; locked collateral. Other series and the
                escrow invariant are untouched.
              </td>
            </tr>
            <tr>
              <td>Settlement lands late</td>
              <td>
                The series settles at the price current when it lands, not the price at
                expiry. Bounded the same way: the timing changes who receives that
                series&apos; collateral, never how much leaves escrow.
              </td>
            </tr>
            <tr>
              <td>Any failure, in any combination</td>
              <td>
                Cannot move collateral beyond the per-contract cap, cannot pay out before
                expiry, cannot settle a series twice, cannot break payoff + leftover =
                collateral.
              </td>
            </tr>
          </tbody>
        </table>
      </DocTable>

      <Callout title="The trusted surface, complete">
        <p className="!text-paper-dim">
          DIA&apos;s feed operators (for price correctness inside the freshness window,
          bounded per series as above) and the protocol owner (who can re-point the
          oracle: a public, on-chain transaction). That is the entire list.
        </p>
      </Callout>
    </DocArticle>
  );
}
