;; covault-settler
;; Trust-minimized settlement for covault-core: reads a price from an on-chain
;; oracle and records it as the settlement price - no manual price entry, and
;; anyone can trigger it once a series has expired.
;;
;; Wiring: deploy this contract, set its price oracle, then point covault-core's
;; `oracle` at THIS contract (covault-core.set-oracle <this>). The core contract
;; is not modified or redeployed. The oracle source is swappable, so a DEX TWAP
;; can replace a USD-feed-derived source later with no change here.

(use-trait oracle-trait .oracle-trait.oracle-trait)
(use-trait dia-trait .dia-trait.dia-trait)

(define-constant ERR-NOT-OWNER (err u200))
(define-constant ERR-NO-ORACLE (err u201))
(define-constant ERR-WRONG-ORACLE (err u202))
(define-constant ERR-SERIES-NOT-FOUND (err u203))
(define-constant ERR-UNSUPPORTED-PAIR (err u204))
(define-constant ERR-BAD-PRICE (err u205))
(define-constant ERR-STALE-PRICE (err u206))

;; DIA feeds are 8-decimal fixed point. Cross-price scaling:
(define-constant SATS-PER-BTC u100000000) ;; sBTC has 8 decimals
(define-constant USTX-PER-STX u1000000)   ;; STX has 6 decimals

(define-data-var contract-owner principal tx-sender)
(define-data-var price-oracle (optional principal) none)

;; The canonical DIA deployment for this network. settle-from-dia only accepts
;; this exact principal: without the pin, anyone could pass a lookalike
;; contract returning attacker-chosen prices to a permissionless entrypoint.
(define-data-var dia-oracle (optional principal) none)

;; Freshness window: reject DIA values older than this many seconds at
;; settlement time. DIA pushes on deviation with a heartbeat, so the default
;; is deliberately wide; the owner can tighten it per network once observed
;; update cadence is known. If a feed goes quiet past the window, settlement
;; fails closed with ERR-STALE-PRICE (funds stay locked, nothing pays out
;; on a stale price) until the feed resumes or governance re-points the
;; core's oracle.
(define-data-var max-price-age uint u21600) ;; 6 hours

(define-read-only (get-owner) (var-get contract-owner))
(define-read-only (get-oracle) (var-get price-oracle))
(define-read-only (get-dia-oracle) (var-get dia-oracle))
(define-read-only (get-max-price-age) (var-get max-price-age))

;; A quote is fresh if its timestamp is within max-price-age of the current
;; Stacks block time (future-dated timestamps count as fresh: block time may
;; trail a just-pushed feed by seconds).
(define-read-only (is-fresh (ts uint))
  (or (>= ts stacks-block-time)
      (<= (- stacks-block-time ts) (var-get max-price-age))))

(define-public (set-max-price-age (secs uint))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-OWNER)
    (asserts! (> secs u0) ERR-BAD-PRICE)
    (var-set max-price-age secs)
    (ok true)))

;; Pin the canonical DIA principal (testnet ST1S5..., mainnet SP1G48...).
;; #[allow(unchecked_data)]
(define-public (set-dia-oracle (dia principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-OWNER)
    (var-set dia-oracle (some dia))
    (ok true)))

;; #[allow(unchecked_data)]
(define-public (set-owner (new-owner principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-OWNER)
    (var-set contract-owner new-owner)
    (ok true)))

;; Set the price source (any contract implementing oracle-trait).
(define-public (set-price-oracle (oracle <oracle-trait>))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-OWNER)
    (var-set price-oracle (some (contract-of oracle)))
    (ok true)))

;; Permissionlessly settle an expired series from the configured oracle.
;; The passed oracle must match the configured one. covault-core enforces the
;; expiry/settled checks; this contract just supplies the price as its `oracle`.
(define-public (settle-series (id uint) (oracle <oracle-trait>))
  (let (
      (configured (unwrap! (var-get price-oracle) ERR-NO-ORACLE))
      (s (unwrap! (contract-call? .covault-core get-series id) ERR-SERIES-NOT-FOUND))
    )
    (asserts! (is-eq (contract-of oracle) configured) ERR-WRONG-ORACLE)
    (let ((price (try! (contract-call? oracle get-price (get underlying s)))))
      ;; call settle as THIS contract, which is covault-core's authorized oracle.
      ;; settle moves no assets, so no allowances are needed.
      (try! (as-contract? () (try! (contract-call? .covault-core settle id price))))
      (print { event: "settle-from-oracle", id: id, price: price })
      (ok price))))

;; ---------------------------------------------------------------------------
;; DIA-backed settlement (the real, testnet-live price source)
;; ---------------------------------------------------------------------------

;; Derive a series' settlement price, in its collateral units, from two DIA
;; USD feeds. This is what keeps settlement free of the quanto problem: the
;; price is produced directly in the unit the payoff math expects.
;;  STX-SBTC (sBTC-collateralized STX option): sats per STX
;;  SBTC-STX (STX-collateralized sBTC option):  microSTX per sBTC
(define-read-only (derive-price
    (label (string-ascii 16))
    (stx-usd uint)
    (sbtc-usd uint))
  (begin
    (asserts! (and (> stx-usd u0) (> sbtc-usd u0)) ERR-BAD-PRICE)
    (if (is-eq label "STX-SBTC")
      (ok (/ (* stx-usd SATS-PER-BTC) sbtc-usd))
      (if (is-eq label "SBTC-STX")
        (ok (/ (* sbtc-usd USTX-PER-STX) stx-usd))
        ERR-UNSUPPORTED-PAIR))))

;; Permissionlessly settle an expired series from DIA. `dia` is the DIA oracle
;; principal for the network (testnet ST1S5..., mainnet SP1G48...), passed as a
;; trait so this works with real DIA and is unit-testable with a mock.
;; This contract must be covault-core's authorized `oracle`.
(define-public (settle-from-dia (id uint) (dia <dia-trait>))
  (begin
    ;; pin check first: never call into an unvetted principal
    (asserts! (is-eq (contract-of dia) (unwrap! (var-get dia-oracle) ERR-NO-ORACLE))
      ERR-WRONG-ORACLE)
    (let (
        (s (unwrap! (contract-call? .covault-core get-series id) ERR-SERIES-NOT-FOUND))
        (stx-quote (try! (contract-call? dia get-value "STX/USD")))
        (sbtc-quote (try! (contract-call? dia get-value "sBTC/USD")))
        (price (try! (derive-price (get underlying s) (get value stx-quote) (get value sbtc-quote))))
      )
      (asserts! (and (is-fresh (get timestamp stx-quote)) (is-fresh (get timestamp sbtc-quote)))
        ERR-STALE-PRICE)
      (try! (as-contract? () (try! (contract-call? .covault-core settle id price))))
      (print { event: "settle-from-dia", id: id, price: price,
               stx-usd: (get value stx-quote), sbtc-usd: (get value sbtc-quote) })
      (ok price))))
