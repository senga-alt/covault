import { DocArticle, H2, Callout, DocTable } from "../ui";
import { CONTRACT_ID, SETTLER_ID, DIA_CONTRACT, SBTC_CONTRACT, NETWORK, hasSettler } from "../../lib/contract";

const EXPLORER = "https://explorer.hiro.so/txid";

// Addresses are read from the same config the app transacts with, rather than
// written out here. A hardcoded table silently rots the moment a deployment
// moves, which is exactly what the 7 Aug 2026 testnet reset did to the last one.
const chain = NETWORK === "mainnet" ? "mainnet" : "testnet";
const deployed: { label: string; id: string }[] = [
  { label: "covault-core", id: CONTRACT_ID },
  ...(hasSettler ? [{ label: "covault-settler", id: SETTLER_ID }] : []),
  { label: "DIA oracle", id: DIA_CONTRACT },
  { label: "sBTC token", id: SBTC_CONTRACT },
];

function AddressRows() {
  return (
    <>
      {deployed.map(({ label, id }) => (
        <tr key={label}>
          <td>{label}</td>
          <td>
            <a href={`${EXPLORER}/${id}?chain=${chain}`} target="_blank" rel="noreferrer">
              {id}
            </a>
          </td>
        </tr>
      ))}
    </>
  );
}

export function Contract() {
  return (
    <DocArticle
      slug="contract"
      title="Contracts"
      lead="Two small contracts: the clearinghouse that holds every sat of escrow, and the settler that turns DIA quotes into settlement prices."
    >
      <H2 id="addresses">Deployed addresses ({chain})</H2>
      <DocTable>
        <table>
          <thead>
            <tr><th>Contract</th><th>Address</th></tr>
          </thead>
          <tbody>
            <AddressRows />
          </tbody>
        </table>
      </DocTable>
      <Callout title="Token argument convention">
        <p className="!text-paper-dim">
          Value-moving functions take a <code>(token (optional &lt;sip010&gt;))</code>{" "}
          argument: pass <code>(some sbtc-token)</code> for an sBTC-collateralized series,{" "}
          <code>none</code> for native STX. The app handles this automatically.
        </p>
      </Callout>

      <H2 id="core-functions">covault-core: public functions</H2>
      <DocTable>
        <table>
          <thead>
            <tr><th>Function</th><th>Who</th><th>What it does</th></tr>
          </thead>
          <tbody>
            <tr><td>create-series</td><td>operator (v1)</td><td>Define a series: collateral asset, call/put, strike, collateral, expiry</td></tr>
            <tr><td>write-options</td><td>anyone</td><td>Lock collateral, mint matched long + short positions</td></tr>
            <tr><td>transfer-long</td><td>holder</td><td>Send option positions to another wallet</td></tr>
            <tr><td>list-offer</td><td>holder</td><td>Escrow longs and post an ask on the order book</td></tr>
            <tr><td>fill-offer</td><td>anyone</td><td>Buy from an open offer; premium goes straight to the maker</td></tr>
            <tr><td>cancel-offer</td><td>maker</td><td>Withdraw an offer; escrowed longs return</td></tr>
            <tr><td>close-pair</td><td>writer</td><td>Burn a matched long + short before expiry, reclaim collateral</td></tr>
            <tr><td>settle</td><td>oracle only</td><td>Record the settlement price for an expired series, once</td></tr>
            <tr><td>exercise</td><td>holder</td><td>Claim quantity x payoff after settlement (no deadline)</td></tr>
            <tr><td>reclaim</td><td>writer</td><td>Claim quantity x leftover after settlement (no deadline)</td></tr>
            <tr><td>set-oracle / set-owner / set-paused / set-open-creation / set-fee</td><td>owner</td><td>Governance: oracle re-point, pause new risk, curation, capped fee</td></tr>
          </tbody>
        </table>
      </DocTable>
      <p>
        Read-only: <code>get-series</code>, <code>get-long</code>, <code>get-short</code>,{" "}
        <code>get-offer</code>, <code>quote-payoff</code>, <code>get-config</code>, and
        counters. Everything the app displays is served by these.
      </p>

      <H2 id="settler-functions">covault-settler</H2>
      <DocTable>
        <table>
          <thead>
            <tr><th>Function</th><th>Who</th><th>What it does</th></tr>
          </thead>
          <tbody>
            <tr><td>settle-from-dia</td><td>anyone</td><td>Read both DIA feeds, check freshness, derive the cross-rate, record it on core</td></tr>
            <tr><td>derive-price</td><td>read-only</td><td>The exact cross-rate math, callable for previews</td></tr>
            <tr><td>is-fresh / current-time / get-max-price-age / get-dia-oracle</td><td>read-only</td><td>Freshness window and configuration, publicly checkable</td></tr>
            <tr><td>set-dia-oracle / set-max-price-age</td><td>settler owner</td><td>Pin the canonical DIA principal; tune the freshness window</td></tr>
          </tbody>
        </table>
      </DocTable>
      <p>
        The settler only ever accepts the pinned canonical DIA principal as its price
        source; passing any other contract fails before a single external call is made.
      </p>
    </DocArticle>
  );
}
