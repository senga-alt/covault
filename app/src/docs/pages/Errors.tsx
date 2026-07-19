import { DocArticle, H2, Callout, DocTable } from "../ui";

const CORE: [string, string, string][] = [
  ["u100", "Not the owner", "A governance call from a wallet that is not the contract owner"],
  ["u101", "Not the oracle", "A settlement attempt from anyone but the authorized oracle (the settler)"],
  ["u102", "Series not found", "The series id does not exist"],
  ["u103", "Invalid parameters", "Zero strike or collateral, an expiry in the past, or a put whose collateral does not equal its strike"],
  ["u104", "Series expired", "Writing after the expiry block has passed"],
  ["u105", "Not yet expired", "Settling before the expiry block"],
  ["u106", "Already settled", "A second settlement, or writing into a settled series"],
  ["u107", "Not settled yet", "Exercising or reclaiming before a settlement price exists"],
  ["u108", "Insufficient longs", "Exercising, listing, or transferring more options than the wallet holds"],
  ["u109", "Insufficient shorts", "Reclaiming more than the wallet has written"],
  ["u110", "Wrong token", "The token argument does not match the series' collateral asset"],
  ["u111", "Zero amount", "Quantity of zero"],
  ["u112", "Offer not found", "The offer was already filled or cancelled"],
  ["u113", "Insufficient offer", "Filling more than the offer has left"],
  ["u114", "Not the maker", "Cancelling someone else's offer"],
  ["u115", "Paused", "New writes and series creation are paused (every exit still works)"],
  ["u116", "Creation restricted", "Series creation is curated and the caller is not the operator"],
  ["u117", "Fee too high", "A fee above the hard 5% cap - rejected by the contract itself"],
];

const SETTLER: [string, string, string][] = [
  ["u200", "Not the settler owner", "Settler configuration from a non-owner wallet"],
  ["u201", "No price source", "The DIA principal has not been pinned yet"],
  ["u202", "Wrong price source", "The passed oracle is not the pinned canonical DIA contract"],
  ["u203", "Series not found", "The series id does not exist"],
  ["u204", "Unsupported pair", "The series' label is not a DIA-settleable pair - it cannot settle through the settler"],
  ["u205", "Bad price", "A feed returned zero, or a zero freshness window was attempted"],
  ["u206", "Stale price", "A DIA quote is older than the freshness window; settlement fails closed - retry after the next update"],
];

function ErrorRows({ rows }: { rows: [string, string, string][] }) {
  return (
    <DocTable>
      <table>
        <thead>
          <tr><th>Code</th><th>Meaning</th><th>Typical cause</th></tr>
        </thead>
        <tbody>
          {rows.map(([code, name, cause]) => (
            <tr key={code}>
              <td><code>{code}</code></td>
              <td>{name}</td>
              <td>{cause}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </DocTable>
  );
}

export function Errors() {
  return (
    <DocArticle
      slug="errors"
      title="Error codes"
      lead="Every error the contracts can return, in plain language. The app translates these automatically wherever a transaction can fail."
    >
      <H2 id="core">Clearinghouse (covault-core)</H2>
      <ErrorRows rows={CORE} />

      <H2 id="settler">Settler (covault-settler-v2)</H2>
      <ErrorRows rows={SETTLER} />

      <H2 id="post-conditions">Wallet-level aborts (u1 / u2)</H2>
      <p>
        Every transaction the app builds carries an <strong>exact-amount
        post-condition</strong>: your wallet displays precisely what will move, and the
        Stacks network aborts the transaction if the contract tried to move anything
        else. An abort code of <code>u1</code> or <code>u2</code> means that guard fired.
      </p>
      <Callout tone="warn" title="If a post-condition ever fires">
        <p className="!text-paper-dim">
          By design this should never happen. Do not simply retry - it means the
          transaction would have moved something other than what was shown. Stop and
          report it.
        </p>
      </Callout>
    </DocArticle>
  );
}
