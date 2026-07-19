import { Link } from "react-router-dom";
import { DocArticle, H2, Callout, CodeBlock, ContentsPlate } from "../ui";

export function Introduction() {
  return (
    <DocArticle
      slug=""
      title="Introduction"
      lead="Covault is a fully collateralized, cash-settled European options clearinghouse on Stacks. Every contract is backed, in full, by collateral locked on-chain - in sBTC or native STX."
    >
      <H2 id="one-idea">One idea, carried all the way</H2>
      <p>
        Most options protocols are hard because of everything around the option: margin
        engines, liquidation keepers, funding rates, and price oracles that must be live
        every block. Covault removes all of that with one strict rule:
      </p>
      <Callout title="The invariant">
        <p className="!text-paper-dim">
          Every option is backed 100% by collateral that is greater than or equal to its
          maximum possible payoff. A writer can never owe more than they locked, so there
          is nothing to liquidate and no way to go insolvent.
        </p>
      </Callout>
      <p>
        At settlement, the holder&apos;s payoff and the writer&apos;s leftover are two cuts of one
        escrow: <code>payoff + leftover = collateral</code>, exactly, in integer arithmetic
        with no rounding. Every completed series on testnet has returned its escrow to
        zero - to the unit.
      </p>

      <H2 id="what-you-can-do">What you can do</H2>
      <ul>
        <li>
          <strong>Write options</strong> - lock collateral, mint matched long + short
          positions, and sell the longs for premium on the built-in order book.
        </li>
        <li>
          <strong>Buy options</strong> - fill an offer to hold a claim on the settlement
          payoff, with your maximum loss fixed at the premium you paid.
        </li>
        <li>
          <strong>Settle permissionlessly</strong> - after expiry, anyone can trigger
          settlement; the price is derived on-chain from DIA&apos;s feeds. Nobody, including
          the operator, chooses the number.
        </li>
      </ul>
      <p>
        Each series picks its collateral asset at creation: <strong>sBTC</strong> (quoted in
        sats) or <strong>native STX</strong> (quoted in microSTX). Strike, settlement price,
        and payoff all live in that one unit - USD never enters the contract.
      </p>

      <H2 id="lifecycle-at-a-glance">The lifecycle at a glance</H2>
      <CodeBlock label="series states">
{`created -> active (writing + trading) -> expired (awaiting price)
        -> settled (claims open forever)

  [writers holding a matched pair can also exit early via close-pair]`}
      </CodeBlock>
      <p>
        The full walkthrough - who acts, what the contract does, what everyone sees - is in{" "}
        <Link to="/docs/lifecycle">The lifecycle</Link>.
      </p>

      <H2 id="contents">Contents of this document</H2>
      <ContentsPlate />

      <H2 id="trust">What you trust, stated honestly</H2>
      <ul>
        <li>
          <strong>DIA&apos;s price feeds</strong>, for the settlement price - bounded per
          series: a wrong price can only ever affect the single series it settles, and no
          payoff can exceed that series&apos; locked collateral. See{" "}
          <Link to="/docs/settlement">Settlement</Link>.
        </li>
        <li>
          <strong>The operator&apos;s governance key</strong> - which can pause <em>new</em>{" "}
          writes and curate series, but can never block an exit or touch escrow.
        </li>
      </ul>
      <p>
        Nothing else. The contracts are public, the tests and fuzzing run in CI on every
        commit, and the full security review lives in the{" "}
        <a href="https://github.com/senga-alt/covault" target="_blank" rel="noreferrer">
          repository
        </a>
        .
      </p>

      <Callout tone="warn" title="Testnet software">
        <p className="!text-paper-dim">
          Covault currently runs on Stacks testnet. It is experimental software under
          active development - not investment advice, and not yet for funds you cannot
          afford to lose.
        </p>
      </Callout>
    </DocArticle>
  );
}
