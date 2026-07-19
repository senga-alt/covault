import { DocArticle, H2, Callout, CodeBlock, DocTable } from "../ui";

export function Settlement() {
  return (
    <DocArticle
      slug="settlement"
      title="Settlement"
      lead="One price per series, recorded once, derived on-chain from DIA's feeds - permissionless to trigger, impossible to choose."
    >
      <H2 id="who-settles">Who settles</H2>
      <p>
        Anyone. Once a series passes its expiry block, its page shows{" "}
        <strong>Settle from DIA</strong> to every connected wallet. The transaction goes
        through a small settler contract that is the clearinghouse&apos;s sole authorized
        oracle. The caller contributes only gas - there is no code path in which a caller
        supplies a price or a price source.
      </p>

      <H2 id="cross-rate">The price, in collateral units</H2>
      <p>
        Covault contracts are denominated in their collateral asset - sats or microSTX -
        and USD never enters the math. DIA publishes USD quotes; the settler derives the
        cross-rate on-chain:
      </p>
      <CodeBlock label="cross-rate derivation (8-decimal DIA values)">
{`sBTC-collateralized (STX-SBTC):
  price = stx_usd * 100,000,000 / sbtc_usd     -> sats per STX

STX-collateralized (SBTC-STX):
  price = sbtc_usd * 1,000,000 / stx_usd       -> microSTX per sBTC`}
      </CodeBlock>
      <p>
        Integer floor division truncates at most one unit - orders of magnitude below the
        feed&apos;s own deviation threshold, applied identically to every series.
      </p>

      <H2 id="freshness">Freshness: fail closed</H2>
      <p>
        Each DIA quote carries a timestamp. The settler normalizes it (some deployments
        report milliseconds), compares it to the current Stacks block time, and refuses to
        settle if either feed is older than the freshness window (default six hours):
      </p>
      <ul>
        <li>Stale feeds mean the series simply stays unsettled - it never settles on a bad price.</li>
        <li>
          Nothing is lost by waiting: exercising and reclaiming have no deadline, so a
          delayed settlement delays claims without forfeiting them.
        </li>
        <li>The app previews the exact price and feed age before you sign, and disables the button while feeds are stale.</li>
      </ul>

      <H2 id="preview">The preview cannot lie</H2>
      <p>
        The &quot;Would record N from feeds Xs old&quot; line in the settle panel calls the
        settler&apos;s own read-only derivation with the live feeds - the same code that runs
        in the transaction. Preview and chain cannot disagree.
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
          oracle - a public, on-chain transaction). That is the entire list.
        </p>
      </Callout>
    </DocArticle>
  );
}
