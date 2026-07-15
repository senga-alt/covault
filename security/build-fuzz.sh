#!/usr/bin/env bash
# Build the fuzz target: a verbatim copy of the deployed covault-core.clar with
# the simnet-only Rendezvous property tests appended. The deployed contract file
# is never modified; this generated copy is what Clarinet-covault-core.toml loads
# when `rv` targets covault-core.
set -euo pipefail
cd "$(dirname "$0")/.."

OUT=security/covault-core.rv.clar
{
  echo ";; GENERATED - do not edit. Run: npm run fuzz:build"
  echo ";; = contracts/covault-core.clar (verbatim, byte-for-byte the deployed"
  echo ";;   contract) + security/rv-tests.clar (simnet-only property tests)."
  echo ""
  cat contracts/covault-core.clar
  echo ""
  cat security/rv-tests.clar
} > "$OUT"
echo "wrote $OUT"
