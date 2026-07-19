import { DocArticle, H2, DocTable } from "../ui";

export function Fees() {
  return (
    <DocArticle
      slug="fees"
      title="Fees"
      lead="There is no protocol fee today. Here is the complete picture, including the one fee the contract can ever charge."
    >
      <H2 id="today">What you pay today</H2>
      <DocTable>
        <table>
          <thead>
            <tr><th>Action</th><th>Protocol fee</th><th>Network fee</th></tr>
          </thead>
          <tbody>
            <tr><td>Write options</td><td>none</td><td>standard Stacks tx fee</td></tr>
            <tr><td>Buy on the order book</td><td>none (taker fee set to 0)</td><td>standard Stacks tx fee</td></tr>
            <tr><td>List / cancel an offer</td><td>none</td><td>standard Stacks tx fee</td></tr>
            <tr><td>Settle</td><td>none</td><td>standard Stacks tx fee</td></tr>
            <tr><td>Exercise / reclaim / close</td><td>none - never charged</td><td>standard Stacks tx fee</td></tr>
          </tbody>
        </table>
      </DocTable>

      <H2 id="taker-fee">The one possible fee</H2>
      <p>
        The contract supports a single <strong>taker fee</strong> on order-book fills,
        charged to the buyer on top of the premium and sent to a configurable recipient.
        It is <strong>hard-capped at 5% (500 basis points) in the contract itself</strong> -
        no governance action can exceed that - and it is currently set to zero.
      </p>
      <ul>
        <li>Writing, exercising, reclaiming, and closing are never fee-charged, by design: exits stay free.</li>
        <li>If the fee is ever turned on, the change is a public on-chain transaction, and the current value is always readable from the contract (and shown in the app).</li>
      </ul>

      <H2 id="premium">Premium is not a fee</H2>
      <p>
        The premium you pay when buying an option goes directly to the seller - the
        protocol never touches it. Prices are set entirely by makers listing and takers
        filling; Covault neither sets nor suggests a price.
      </p>
    </DocArticle>
  );
}
